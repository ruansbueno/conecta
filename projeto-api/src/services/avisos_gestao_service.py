"""Publicação e ciclo de vida dos avisos (RF-24..26, RF-34).

Toda operação roda numa transação só: altera o aviso, grava versão e evento e faz commit;
qualquer falha desfaz tudo (plan-e2 D-E2-4). A linha do aviso fica travada durante a escrita.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.errors import (
    AvisoNaoEditavel,
    AvisoNaoEncontrado,
    AvisoSituacaoInvalida,
    ErroDeValidacao,
    SemPermissao,
    TurmaNaoEncontrada,
)
from src.models.aviso import Aviso, AvisoDestino
from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.repositories.auditoria_repository import AuditoriaRepository, destinos_canonicos
from src.schemas.gestao.avisos import AvisoCreate, AvisoPatch
from src.services.destinos import (
    destinos_atuais,
    exigir_destinos_do_docente,
    novos_destinos,
    validar_destinos,
)
from src.services.permissoes import gere_tudo

PUBLICADO_EM = func.coalesce(Aviso.publicar_em, Aviso.criado_em)


def _agora() -> datetime:
    return datetime.now(UTC)


def _com_detalhes(stmt: Select) -> Select:
    return stmt.options(
        selectinload(Aviso.autor),
        selectinload(Aviso.destinos).selectinload(AvisoDestino.turma),
    )


async def _carregar(session: AsyncSession, aviso_id: uuid.UUID, *, travar: bool = False) -> Aviso:
    stmt = _com_detalhes(select(Aviso).where(Aviso.id == aviso_id))
    if travar:
        stmt = stmt.with_for_update(of=Aviso)
    aviso = await session.scalar(stmt.execution_options(populate_existing=True))
    if aviso is None:
        raise AvisoNaoEncontrado()
    return aviso


def _exigir_autoria(usuario: Usuario, aviso: Aviso) -> None:
    """Docente só gere os avisos que publicou (spec §2.3)."""
    if not gere_tudo(usuario) and aviso.autor_id != usuario.id:
        raise SemPermissao()


def _exigir_futuro(publicar_em: datetime | None) -> None:
    if publicar_em is not None and publicar_em <= _agora():
        raise ErroDeValidacao("publicar_em", "deve ser uma data futura")


async def criar(session: AsyncSession, autor: Usuario, dados: AvisoCreate) -> Aviso:
    _exigir_futuro(dados.publicar_em)
    await validar_destinos(session, autor, dados.destinos)
    agora = _agora()
    aviso = Aviso(
        autor_id=autor.id,
        criado_em=agora,
        titulo=dados.titulo,
        conteudo=dados.conteudo,
        publicar_em=dados.publicar_em,
        versao_atual=1,
        destinos=novos_destinos(AvisoDestino, dados.destinos),
    )
    session.add(aviso)
    await session.flush()
    auditoria = AuditoriaRepository(session)
    auditoria.registrar_versao(aviso, autor.id, agora)
    auditoria.registrar_evento(aviso, "criado", autor.id, agora, versao=1)
    await session.commit()
    return await _carregar(session, aviso.id)


async def listar(
    session: AsyncSession,
    usuario: Usuario,
    situacao: str | None,
    autor_id: uuid.UUID | None,
    turma_id: uuid.UUID | None,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Aviso], int]:
    stmt = select(Aviso)
    # Turma inexistente é 404 para todos os perfis, antes da permissão (como em solicitações).
    if turma_id is not None and await session.get(Turma, turma_id) is None:
        raise TurmaNaoEncontrada()
    if not gere_tudo(usuario):
        if situacao == "excluido":
            raise SemPermissao()
        stmt = stmt.where(Aviso.autor_id == usuario.id)
    agora = func.now()
    match situacao:
        case None:
            stmt = stmt.where(Aviso.situacao != "excluido")
        case "ativo":
            stmt = stmt.where(Aviso.situacao == "ativo", agora >= PUBLICADO_EM)
        case "agendado":
            # No banco os dois são "ativo"; agendado é o que ainda não chegou à data (RF-34).
            stmt = stmt.where(Aviso.situacao == "ativo", Aviso.publicar_em > agora)
        case _:
            stmt = stmt.where(Aviso.situacao == situacao)
    if autor_id is not None:
        stmt = stmt.where(Aviso.autor_id == autor_id)
    if turma_id is not None:
        stmt = stmt.where(
            exists().where(AvisoDestino.aviso_id == Aviso.id, AvisoDestino.turma_id == turma_id)
        )
    if q:
        termo = f"%{q.strip()}%"
        stmt = stmt.where(or_(Aviso.titulo.ilike(termo), Aviso.conteudo.ilike(termo)))
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    avisos = await session.scalars(
        _com_detalhes(stmt).order_by(PUBLICADO_EM.desc(), Aviso.id).limit(limit).offset(offset)
    )
    return list(avisos), total


async def obter(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso:
    aviso = await _carregar(session, aviso_id)
    if aviso.situacao == "excluido" and not gere_tudo(usuario):
        raise AvisoNaoEncontrado()
    _exigir_autoria(usuario, aviso)
    return aviso


def _iso(valor: datetime | None) -> str | None:
    return valor.isoformat() if valor else None


async def editar(
    session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID, dados: AvisoPatch
) -> Aviso:
    """Nova versão completa + evento com o que mudou (RF-25, RF-27)."""
    aviso = await _carregar(session, aviso_id, travar=True)
    _exigir_autoria(usuario, aviso)
    if aviso.situacao != "ativo":  # arquivado ou excluído (contrato §14)
        raise AvisoNaoEditavel()
    if dados.destinos is None:
        # Docente só edita aviso cujos destinos atuais são todos turmas em que leciona (§3.3).
        await exigir_destinos_do_docente(session, usuario, destinos_atuais(aviso.destinos))
    agora = _agora()

    enviados = dados.model_fields_set
    alteracoes: dict[str, dict] = {}
    for campo in ("titulo", "conteudo"):
        novo = getattr(dados, campo)
        if campo in enviados and novo != getattr(aviso, campo):
            alteracoes[campo] = {"de": getattr(aviso, campo), "para": novo}

    if "publicar_em" in enviados and dados.publicar_em != aviso.publicar_em:
        # Agendamento só muda antes da publicação; null publica já (plan-e2 D-E2-6).
        if aviso.publicado_em <= _agora():
            raise ErroDeValidacao("publicar_em", "aviso já publicado não pode ser reagendado")
        _exigir_futuro(dados.publicar_em)
        alteracoes["publicar_em"] = {
            "de": _iso(aviso.publicar_em),
            "para": _iso(dados.publicar_em),
        }

    if dados.destinos is not None:
        await validar_destinos(session, usuario, dados.destinos)
        atuais = destinos_canonicos(aviso.destinos)
        novos = destinos_canonicos(dados.destinos)
        if novos != atuais:
            alteracoes["destinos"] = {"de": atuais, "para": novos}

    if not alteracoes:
        raise ErroDeValidacao("body", "nenhuma alteração")

    for campo in ("titulo", "conteudo"):
        if campo in alteracoes:
            setattr(aviso, campo, getattr(dados, campo))
    if "publicar_em" in alteracoes:
        # null publica já: grava a hora da publicação, não cai na data de criação.
        aviso.publicar_em = dados.publicar_em or agora
        alteracoes["publicar_em"]["para"] = _iso(aviso.publicar_em)
    if "destinos" in alteracoes:
        # Duas etapas: os destinos antigos saem antes de os novos entrarem (índice único).
        aviso.destinos.clear()
        await session.flush()
        aviso.destinos.extend(novos_destinos(AvisoDestino, dados.destinos))
    aviso.versao_atual += 1
    aviso.editado_em = agora
    await session.flush()

    auditoria = AuditoriaRepository(session)
    auditoria.registrar_versao(aviso, usuario.id, agora)
    auditoria.registrar_evento(
        aviso, "editado", usuario.id, agora, versao=aviso.versao_atual, alteracoes=alteracoes
    )
    await session.commit()
    return await _carregar(session, aviso.id)


async def _mudar_situacao(
    session: AsyncSession,
    usuario: Usuario,
    aviso_id: uuid.UUID,
    de: str,
    para: str,
    evento: str,
    erro: str,
) -> Aviso:
    aviso = await _carregar(session, aviso_id, travar=True)
    if aviso.situacao == "excluido" and para == "excluido":
        raise AvisoNaoEncontrado()
    _exigir_autoria(usuario, aviso)
    if aviso.situacao != de:
        raise AvisoSituacaoInvalida(erro)
    if para == "ativo":
        # Desarquivar devolve o alcance: mesma regra de destinos da edição.
        await exigir_destinos_do_docente(session, usuario, destinos_atuais(aviso.destinos))
    aviso.situacao = para
    agora = _agora()
    if para == "arquivado":
        aviso.arquivado_em = agora
    elif para == "ativo":
        aviso.arquivado_em = None
    else:
        aviso.excluido_em = agora
    AuditoriaRepository(session).registrar_evento(aviso, evento, usuario.id, agora)
    await session.commit()
    return await _carregar(session, aviso.id)


async def arquivar(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso:
    return await _mudar_situacao(
        session,
        usuario,
        aviso_id,
        "ativo",
        "arquivado",
        "arquivado",
        "Só um aviso ativo pode ser arquivado",
    )


async def desarquivar(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso:
    return await _mudar_situacao(
        session,
        usuario,
        aviso_id,
        "arquivado",
        "ativo",
        "desarquivado",
        "O aviso não está arquivado",
    )


async def excluir(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> None:
    """Exclusão lógica: some do app e da gestão; versões e eventos permanecem (spec §3.4)."""
    aviso = await _carregar(session, aviso_id, travar=True)
    if aviso.situacao == "excluido":
        raise AvisoNaoEncontrado()
    await _mudar_situacao(session, usuario, aviso_id, aviso.situacao, "excluido", "excluido", "")


async def _auditavel(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> None:
    """Gestão audita qualquer aviso, inclusive excluído; docente só os próprios (RF-28)."""
    aviso = await session.get(Aviso, aviso_id)
    if aviso is None or (aviso.situacao == "excluido" and not gere_tudo(usuario)):
        raise AvisoNaoEncontrado()
    _exigir_autoria(usuario, aviso)


async def versoes(
    session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[AvisoVersao, Usuario]], int]:
    await _auditavel(session, usuario, aviso_id)
    stmt = (
        select(AvisoVersao, Usuario)
        .join(Usuario, Usuario.id == AvisoVersao.criada_por)
        .where(AvisoVersao.aviso_id == aviso_id)
    )
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    linhas = await session.execute(
        stmt.order_by(AvisoVersao.versao.desc()).limit(limit).offset(offset)
    )
    return [(v, u) for v, u in linhas], total


async def historico(
    session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[AvisoEvento, Usuario]], int]:
    await _auditavel(session, usuario, aviso_id)
    stmt = (
        select(AvisoEvento, Usuario)
        .join(Usuario, Usuario.id == AvisoEvento.usuario_id)
        .where(AvisoEvento.aviso_id == aviso_id)
    )
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    linhas = await session.execute(
        stmt.order_by(AvisoEvento.ocorrido_em.desc(), AvisoEvento.versao.desc().nulls_first())
        .limit(limit)
        .offset(offset)
    )
    return [(e, u) for e, u in linhas], total
