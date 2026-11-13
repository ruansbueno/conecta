"""Gestão comum aos itens publicados: avisos (RF-24..28) e eventos (RF-35, RF-36, RF-39..42).

Os dois têm o mesmo ciclo de vida (criar, editar, arquivar, desarquivar, excluir), a mesma regra
de destinos e de autoria, e versão completa e histórico imutáveis. O que é igual vive só aqui
(specs/003, D-RV-8); `avisos_gestao_service` e `eventos_gestao_service` ficam com o que é
próprio de cada um.

Toda escrita roda numa transação só: altera o item, grava versão e histórico e faz commit;
qualquer falha desfaz tudo (plan-e2 D-E2-4). A linha do item fica travada durante a escrita
(plan da E3, D-E3-13).
"""

import uuid
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import Select, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.errors import DomainError, ErroDeValidacao, SemPermissao, TurmaNaoEncontrada
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.repositories.auditoria_repository import Auditado, AuditoriaRepository, destinos_canonicos
from src.repositories.busca import contem
from src.schemas.destino import DestinoIn
from src.services.destinos import (
    destinos_atuais,
    exigir_destinos_do_docente,
    novos_destinos,
    validar_destinos,
)
from src.services.permissoes import gere_tudo


@dataclass(frozen=True)
class Publicacao:
    """Um tipo de item publicado: as tabelas e os erros com o nome dele."""

    nome: str  # "aviso", "evento": nas mensagens
    modelo: type
    destino: type
    auditado: Auditado
    nao_encontrado: Callable[[], DomainError]
    nao_editavel: Callable[[], DomainError]
    situacao_invalida: Callable[[str], DomainError]

    @property
    def chave_destino(self):
        return getattr(self.destino, self.auditado.chave)


def agora() -> datetime:
    return datetime.now(UTC)


def iso_utc(valor: datetime | None) -> str | None:
    """Datas do histórico sempre em UTC, venham no fuso que vierem (specs/003, D-RV-3)."""
    return valor.astimezone(UTC).isoformat() if valor else None


def _com_detalhes(p: Publicacao, stmt: Select) -> Select:
    return stmt.options(
        selectinload(p.modelo.autor),
        selectinload(p.modelo.destinos).selectinload(p.destino.turma),
    )


async def carregar(session: AsyncSession, p: Publicacao, item_id: uuid.UUID, *, travar=False):
    stmt = _com_detalhes(p, select(p.modelo).where(p.modelo.id == item_id))
    if travar:
        stmt = stmt.with_for_update(of=p.modelo)
    item = await session.scalar(stmt.execution_options(populate_existing=True))
    if item is None:
        raise p.nao_encontrado()
    return item


async def _carregar_vivo(session: AsyncSession, p: Publicacao, item_id: uuid.UUID):
    """Travado; excluído não existe para as ações (specs/003, D-RV-2)."""
    item = await carregar(session, p, item_id, travar=True)
    if item.situacao == "excluido":
        raise p.nao_encontrado()
    return item


def exigir_autoria(usuario: Usuario, item) -> None:
    """Docente só gere o que publicou (spec §2.3; spec E3 §2.3)."""
    if not gere_tudo(usuario) and item.autor_id != usuario.id:
        raise SemPermissao()


async def obter(session: AsyncSession, p: Publicacao, usuario: Usuario, item_id: uuid.UUID):
    item = await carregar(session, p, item_id)
    if item.situacao == "excluido" and not gere_tudo(usuario):
        raise p.nao_encontrado()
    exigir_autoria(usuario, item)
    return item


# --- Criar -------------------------------------------------------------------------------------


async def gravar_criacao(session: AsyncSession, p: Publicacao, item, autor: Usuario, quando):
    """Grava o item novo com a versão 1 e o registro `criado`."""
    session.add(item)
    await session.flush()
    auditoria = AuditoriaRepository(session, p.auditado)
    auditoria.registrar_versao(item, autor.id, quando)
    auditoria.registrar(item, "criado", autor.id, quando, versao=1)
    await session.commit()
    return await carregar(session, p, item.id)


# --- Listar ------------------------------------------------------------------------------------


async def filtrar_lista(
    session: AsyncSession,
    p: Publicacao,
    usuario: Usuario,
    situacao: str | None,
    autor_id: uuid.UUID | None,
    turma_id: uuid.UUID | None,
    q: str | None,
    colunas_da_busca: tuple,
) -> Select:
    """Filtros comuns da lista de gestão. Sem `situacao`, todos menos os excluídos; com ela, o
    filtro é de quem chama (o aviso tem "agendado", que no banco é "ativo")."""
    # Turma inexistente é 404 para todos os perfis, antes da permissão (como em solicitações).
    if turma_id is not None and await session.get(Turma, turma_id) is None:
        raise TurmaNaoEncontrada()
    stmt = select(p.modelo)
    if not gere_tudo(usuario):
        if situacao == "excluido":
            raise SemPermissao()
        stmt = stmt.where(p.modelo.autor_id == usuario.id)
    if situacao is None:
        stmt = stmt.where(p.modelo.situacao != "excluido")
    if autor_id is not None:
        stmt = stmt.where(p.modelo.autor_id == autor_id)
    if turma_id is not None:
        stmt = stmt.where(
            exists().where(p.chave_destino == p.modelo.id, p.destino.turma_id == turma_id)
        )
    if q:
        stmt = stmt.where(contem(q, *colunas_da_busca))
    return stmt


async def paginar(session: AsyncSession, p: Publicacao, stmt: Select, ordem, limit, offset):
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    itens = await session.scalars(
        _com_detalhes(p, stmt).order_by(*ordem).limit(limit).offset(offset)
    )
    return list(itens), total


# --- Editar ------------------------------------------------------------------------------------


async def iniciar_edicao(
    session: AsyncSession,
    p: Publicacao,
    usuario: Usuario,
    item_id: uuid.UUID,
    destinos: list[DestinoIn] | None,
):
    """Trava o item e confere se quem edita pode editá-lo."""
    item = await carregar(session, p, item_id, travar=True)
    exigir_autoria(usuario, item)
    if item.situacao != "ativo":  # arquivado ou excluído (contratos: §14 da E2, §6 da E3)
        raise p.nao_editavel()
    if destinos is None:
        # Docente só edita item cujos destinos atuais são todos turmas em que leciona (§3.3).
        await exigir_destinos_do_docente(session, usuario, destinos_atuais(item.destinos))
    return item


async def alteracao_de_destinos(
    session: AsyncSession, usuario: Usuario, item, destinos: list[DestinoIn] | None
) -> dict | None:
    """`{"de", "para"}` dos destinos, se mudaram."""
    if destinos is None:
        return None
    await validar_destinos(session, usuario, destinos)
    atuais, novos = destinos_canonicos(item.destinos), destinos_canonicos(destinos)
    return {"de": atuais, "para": novos} if novos != atuais else None


def exigir_alteracao(alteracoes: dict) -> None:
    if not alteracoes:
        raise ErroDeValidacao("body", "nenhuma alteração")


async def gravar_edicao(
    session: AsyncSession,
    p: Publicacao,
    usuario: Usuario,
    item,
    alteracoes: dict,
    destinos: list[DestinoIn] | None,
    quando: datetime,
):
    """Campos próprios já aplicados por quem chama: troca os destinos, se mudaram, e grava a nova
    versão completa e o registro `editado` com o que mudou (RF-25, RF-27; RF-39, RF-41)."""
    if "destinos" in alteracoes:
        # Duas etapas: os destinos antigos saem antes de os novos entrarem (índice único).
        item.destinos.clear()
        await session.flush()
        item.destinos.extend(novos_destinos(p.destino, destinos))
    item.versao_atual += 1
    item.editado_em = quando
    await session.flush()

    auditoria = AuditoriaRepository(session, p.auditado)
    auditoria.registrar_versao(item, usuario.id, quando)
    auditoria.registrar(
        item, "editado", usuario.id, quando, versao=item.versao_atual, alteracoes=alteracoes
    )
    await session.commit()
    return await carregar(session, p, item.id)


# --- Arquivar, desarquivar, excluir ------------------------------------------------------------


async def _mudar_situacao(
    session: AsyncSession, p: Publicacao, usuario: Usuario, item, de: str, para: str, operacao: str
):
    exigir_autoria(usuario, item)
    if item.situacao != de:
        raise p.situacao_invalida(
            f"Só um {p.nome} ativo pode ser arquivado"
            if para == "arquivado"
            else f"O {p.nome} não está arquivado"
        )
    if para == "ativo":
        # Desarquivar devolve o alcance: mesma regra de destinos da edição.
        await exigir_destinos_do_docente(session, usuario, destinos_atuais(item.destinos))
    item.situacao = para
    quando = agora()
    if para == "arquivado":
        item.arquivado_em = quando
    elif para == "ativo":
        item.arquivado_em = None
    else:
        item.excluido_em = quando
    AuditoriaRepository(session, p.auditado).registrar(item, operacao, usuario.id, quando)
    await session.commit()
    return await carregar(session, p, item.id)


async def arquivar(session: AsyncSession, p: Publicacao, usuario: Usuario, item_id: uuid.UUID):
    item = await _carregar_vivo(session, p, item_id)
    return await _mudar_situacao(session, p, usuario, item, "ativo", "arquivado", "arquivado")


async def desarquivar(session: AsyncSession, p: Publicacao, usuario: Usuario, item_id: uuid.UUID):
    item = await _carregar_vivo(session, p, item_id)
    return await _mudar_situacao(session, p, usuario, item, "arquivado", "ativo", "desarquivado")


async def excluir(session: AsyncSession, p: Publicacao, usuario: Usuario, item_id: uuid.UUID):
    """Exclusão lógica: some dos clientes e da gestão; versões e histórico ficam."""
    item = await _carregar_vivo(session, p, item_id)
    await _mudar_situacao(session, p, usuario, item, item.situacao, "excluido", "excluido")


# --- Auditoria ---------------------------------------------------------------------------------


async def _auditavel(session: AsyncSession, p: Publicacao, usuario: Usuario, item_id: uuid.UUID):
    """Gestão audita qualquer item, inclusive excluído; docente só os próprios (RF-28, RF-42)."""
    item = await session.get(p.modelo, item_id)
    if item is None or (item.situacao == "excluido" and not gere_tudo(usuario)):
        raise p.nao_encontrado()
    exigir_autoria(usuario, item)


async def versoes(session, p: Publicacao, usuario: Usuario, item_id: uuid.UUID, limit, offset):
    await _auditavel(session, p, usuario, item_id)
    return await AuditoriaRepository(session, p.auditado).versoes(item_id, limit, offset)


async def historico(session, p: Publicacao, usuario: Usuario, item_id: uuid.UUID, limit, offset):
    await _auditavel(session, p, usuario, item_id)
    return await AuditoriaRepository(session, p.auditado).historico(item_id, limit, offset)
