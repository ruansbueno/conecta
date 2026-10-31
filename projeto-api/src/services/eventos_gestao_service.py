"""Gestão dos eventos da agenda (RF-35, RF-36, RF-39..42).

Mesmo padrão dos avisos (plan-e2 D-E2-4): toda operação roda numa transação só — altera o
evento, grava versão e histórico e faz commit; qualquer falha desfaz tudo. A linha do evento
fica travada durante a escrita (plan D-E3-13).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.errors import (
    ErroDeValidacao,
    EventoNaoEditavel,
    EventoNaoEncontrado,
    EventoSituacaoInvalida,
    SemPermissao,
    TurmaNaoEncontrada,
)
from src.models.evento import Evento, EventoDestino
from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.repositories.auditoria_repository import AuditoriaEventoRepository, destinos_canonicos
from src.schemas.gestao.eventos import EventoCreate, EventoPatch
from src.services.destinos import (
    destinos_atuais,
    exigir_destinos_do_docente,
    novos_destinos,
    validar_destinos,
)
from src.services.permissoes import gere_tudo

# Campos simples do evento, na ordem em que o histórico os registra.
_CAMPOS = ("titulo", "descricao", "tipo", "inicio", "fim", "local")
_DATAS = ("inicio", "fim")


def _agora() -> datetime:
    return datetime.now(UTC)


def _com_detalhes(stmt: Select) -> Select:
    return stmt.options(
        selectinload(Evento.autor),
        selectinload(Evento.destinos).selectinload(EventoDestino.turma),
    )


async def _carregar(session: AsyncSession, evento_id: uuid.UUID, *, travar: bool = False) -> Evento:
    stmt = _com_detalhes(select(Evento).where(Evento.id == evento_id))
    if travar:
        stmt = stmt.with_for_update(of=Evento)
    evento = await session.scalar(stmt.execution_options(populate_existing=True))
    if evento is None:
        raise EventoNaoEncontrado()
    return evento


def _exigir_autoria(usuario: Usuario, evento: Evento) -> None:
    """Docente só gere os eventos que criou (spec E3 §2.3)."""
    if not gere_tudo(usuario) and evento.autor_id != usuario.id:
        raise SemPermissao()


def _iso(valor: datetime | None) -> str | None:
    return valor.astimezone(UTC).isoformat() if valor else None


async def criar(session: AsyncSession, autor: Usuario, dados: EventoCreate) -> Evento:
    await validar_destinos(session, autor, dados.destinos)
    agora = _agora()
    evento = Evento(
        autor_id=autor.id,
        criado_em=agora,
        titulo=dados.titulo,
        descricao=dados.descricao,
        tipo=dados.tipo,
        inicio=dados.inicio,
        fim=dados.fim,
        local=dados.local,
        versao_atual=1,
        destinos=novos_destinos(EventoDestino, dados.destinos),
    )
    session.add(evento)
    await session.flush()
    auditoria = AuditoriaEventoRepository(session)
    auditoria.registrar_versao(evento, autor.id, agora)
    auditoria.registrar(evento, "criado", autor.id, agora, versao=1)
    await session.commit()
    return await _carregar(session, evento.id)


async def listar(
    session: AsyncSession,
    usuario: Usuario,
    situacao: str | None,
    tipo: str | None,
    autor_id: uuid.UUID | None,
    turma_id: uuid.UUID | None,
    de: datetime | None,
    ate: datetime | None,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[Evento], int]:
    if de is not None and ate is not None and ate < de:
        raise ErroDeValidacao("ate", "deve ser maior ou igual a de")
    # Turma inexistente é 404 para todos os perfis, antes da permissão (como nos avisos).
    if turma_id is not None and await session.get(Turma, turma_id) is None:
        raise TurmaNaoEncontrada()
    stmt = select(Evento)
    if not gere_tudo(usuario):
        if situacao == "excluido":
            raise SemPermissao()
        stmt = stmt.where(Evento.autor_id == usuario.id)
    if situacao is None:
        stmt = stmt.where(Evento.situacao != "excluido")
    else:
        stmt = stmt.where(Evento.situacao == situacao)
    if tipo is not None:
        stmt = stmt.where(Evento.tipo == tipo)
    if autor_id is not None:
        stmt = stmt.where(Evento.autor_id == autor_id)
    if turma_id is not None:
        stmt = stmt.where(
            exists().where(EventoDestino.evento_id == Evento.id, EventoDestino.turma_id == turma_id)
        )
    # Mesmo intervalo semiaberto da consulta (plan D-E3-3); a gestão vê também os encerrados.
    if de is not None:
        stmt = stmt.where(Evento.inicio >= de)
    if ate is not None:
        stmt = stmt.where(Evento.inicio < ate)
    if q:
        termo = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Evento.titulo.ilike(termo), Evento.descricao.ilike(termo), Evento.local.ilike(termo)
            )
        )
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    eventos = await session.scalars(
        _com_detalhes(stmt).order_by(Evento.inicio, Evento.id).limit(limit).offset(offset)
    )
    return list(eventos), total


async def obter(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> Evento:
    evento = await _carregar(session, evento_id)
    if evento.situacao == "excluido" and not gere_tudo(usuario):
        raise EventoNaoEncontrado()
    _exigir_autoria(usuario, evento)
    return evento


async def editar(
    session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID, dados: EventoPatch
) -> Evento:
    """Nova versão completa + histórico com o que mudou (RF-39, RF-41)."""
    evento = await _carregar(session, evento_id, travar=True)
    _exigir_autoria(usuario, evento)
    if evento.situacao != "ativo":
        raise EventoNaoEditavel()
    if dados.destinos is None:
        # Docente só edita evento cujos destinos atuais são todos turmas em que leciona.
        await exigir_destinos_do_docente(session, usuario, destinos_atuais(evento.destinos))

    enviados = dados.model_fields_set
    novo = {c: getattr(dados, c) if c in enviados else getattr(evento, c) for c in _CAMPOS}
    # O fim vale contra o início resultante, enviado ou não (plan D-E3-6).
    if novo["fim"] is not None and novo["fim"] <= novo["inicio"]:
        raise ErroDeValidacao("fim", "deve ser maior que inicio")

    alteracoes: dict[str, dict] = {}
    for campo in _CAMPOS:
        if novo[campo] != getattr(evento, campo):
            de, para = getattr(evento, campo), novo[campo]
            if campo in _DATAS:
                de, para = _iso(de), _iso(para)
            alteracoes[campo] = {"de": de, "para": para}
    if dados.destinos is not None:
        await validar_destinos(session, usuario, dados.destinos)
        atuais = destinos_canonicos(evento.destinos)
        novos = destinos_canonicos(dados.destinos)
        if novos != atuais:
            alteracoes["destinos"] = {"de": atuais, "para": novos}
    if not alteracoes:
        raise ErroDeValidacao("body", "nenhuma alteração")

    agora = _agora()
    for campo in _CAMPOS:
        if campo in alteracoes:
            setattr(evento, campo, novo[campo])
    if "destinos" in alteracoes:
        # Duas etapas: os destinos antigos saem antes de os novos entrarem (índice único).
        evento.destinos.clear()
        await session.flush()
        evento.destinos.extend(novos_destinos(EventoDestino, dados.destinos))
    evento.versao_atual += 1
    evento.editado_em = agora
    await session.flush()

    auditoria = AuditoriaEventoRepository(session)
    auditoria.registrar_versao(evento, usuario.id, agora)
    auditoria.registrar(
        evento, "editado", usuario.id, agora, versao=evento.versao_atual, alteracoes=alteracoes
    )
    await session.commit()
    return await _carregar(session, evento.id)


async def _mudar_situacao(
    session: AsyncSession,
    usuario: Usuario,
    evento: Evento,
    de: str,
    para: str,
    operacao: str,
    erro: str,
) -> Evento:
    _exigir_autoria(usuario, evento)
    if evento.situacao != de:
        raise EventoSituacaoInvalida(erro)
    if para == "ativo":
        # Desarquivar devolve o alcance: mesma regra de destinos da edição.
        await exigir_destinos_do_docente(session, usuario, destinos_atuais(evento.destinos))
    evento.situacao = para
    agora = _agora()
    if para == "arquivado":
        evento.arquivado_em = agora
    elif para == "ativo":
        evento.arquivado_em = None
    else:
        evento.excluido_em = agora
    AuditoriaEventoRepository(session).registrar(evento, operacao, usuario.id, agora)
    await session.commit()
    return await _carregar(session, evento.id)


async def _carregar_vivo(session: AsyncSession, evento_id: uuid.UUID) -> Evento:
    evento = await _carregar(session, evento_id, travar=True)
    if evento.situacao == "excluido":
        raise EventoNaoEncontrado()
    return evento


async def arquivar(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> Evento:
    evento = await _carregar_vivo(session, evento_id)
    return await _mudar_situacao(
        session,
        usuario,
        evento,
        "ativo",
        "arquivado",
        "arquivado",
        "Só um evento ativo pode ser arquivado",
    )


async def desarquivar(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> Evento:
    evento = await _carregar_vivo(session, evento_id)
    return await _mudar_situacao(
        session,
        usuario,
        evento,
        "arquivado",
        "ativo",
        "desarquivado",
        "O evento não está arquivado",
    )


async def excluir(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> None:
    """Exclusão lógica: some da agenda e da gestão; versões e histórico ficam (RF-40)."""
    evento = await _carregar_vivo(session, evento_id)
    await _mudar_situacao(session, usuario, evento, evento.situacao, "excluido", "excluido", "")


async def _auditavel(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> None:
    """Gestão audita qualquer evento, inclusive excluído; docente só os próprios (RF-42)."""
    evento = await session.get(Evento, evento_id)
    if evento is None or (evento.situacao == "excluido" and not gere_tudo(usuario)):
        raise EventoNaoEncontrado()
    _exigir_autoria(usuario, evento)


async def versoes(
    session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[EventoVersao, Usuario]], int]:
    await _auditavel(session, usuario, evento_id)
    stmt = (
        select(EventoVersao, Usuario)
        .join(Usuario, Usuario.id == EventoVersao.criada_por)
        .where(EventoVersao.evento_id == evento_id)
    )
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    linhas = await session.execute(
        stmt.order_by(EventoVersao.versao.desc()).limit(limit).offset(offset)
    )
    return [(v, u) for v, u in linhas], total


async def historico(
    session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[EventoHistorico, Usuario]], int]:
    await _auditavel(session, usuario, evento_id)
    stmt = (
        select(EventoHistorico, Usuario)
        .join(Usuario, Usuario.id == EventoHistorico.usuario_id)
        .where(EventoHistorico.evento_id == evento_id)
    )
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    linhas = await session.execute(
        stmt.order_by(
            EventoHistorico.ocorrido_em.desc(), EventoHistorico.versao.desc().nulls_first()
        )
        .limit(limit)
        .offset(offset)
    )
    return [(e, u) for e, u in linhas], total
