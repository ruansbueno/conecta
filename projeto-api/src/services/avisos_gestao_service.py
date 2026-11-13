"""Publicação e ciclo de vida dos avisos (RF-24..26, RF-34).

O que é comum com os eventos está em `publicacao_gestao` (specs/003, D-RV-8). Aqui fica o que é
só do aviso: o agendamento da publicação (`publicar_em`) e a situação "agendado" da lista.
"""

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import (
    AvisoNaoEditavel,
    AvisoNaoEncontrado,
    AvisoSituacaoInvalida,
    ErroDeValidacao,
)
from src.models.aviso import Aviso, AvisoDestino
from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from src.models.usuario import Usuario
from src.repositories.auditoria_repository import AVISO
from src.repositories.aviso_repository import PUBLICADO_EM
from src.schemas.gestao.avisos import AvisoCreate, AvisoPatch
from src.services import publicacao_gestao as comum
from src.services.destinos import novos_destinos, validar_destinos

AVISOS = comum.Publicacao(
    nome="aviso",
    modelo=Aviso,
    destino=AvisoDestino,
    auditado=AVISO,
    nao_encontrado=AvisoNaoEncontrado,
    nao_editavel=AvisoNaoEditavel,
    situacao_invalida=AvisoSituacaoInvalida,
)


def _exigir_futuro(publicar_em: datetime | None) -> None:
    if publicar_em is not None and publicar_em <= comum.agora():
        raise ErroDeValidacao("publicar_em", "deve ser uma data futura")


async def criar(session: AsyncSession, autor: Usuario, dados: AvisoCreate) -> Aviso:
    _exigir_futuro(dados.publicar_em)
    await validar_destinos(session, autor, dados.destinos)
    quando = comum.agora()
    aviso = Aviso(
        autor_id=autor.id,
        criado_em=quando,
        titulo=dados.titulo,
        conteudo=dados.conteudo,
        publicar_em=dados.publicar_em,
        versao_atual=1,
        destinos=novos_destinos(AvisoDestino, dados.destinos),
    )
    return await comum.gravar_criacao(session, AVISOS, aviso, autor, quando)


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
    stmt = await comum.filtrar_lista(
        session, AVISOS, usuario, situacao, autor_id, turma_id, q, (Aviso.titulo, Aviso.conteudo)
    )
    agora = func.now()
    match situacao:
        case None:
            pass
        case "ativo":
            stmt = stmt.where(Aviso.situacao == "ativo", agora >= PUBLICADO_EM)
        case "agendado":
            # No banco os dois são "ativo"; agendado é o que ainda não chegou à data (RF-34).
            stmt = stmt.where(Aviso.situacao == "ativo", Aviso.publicar_em > agora)
        case _:
            stmt = stmt.where(Aviso.situacao == situacao)
    return await comum.paginar(
        session, AVISOS, stmt, (PUBLICADO_EM.desc(), Aviso.id), limit, offset
    )


async def editar(
    session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID, dados: AvisoPatch
) -> Aviso:
    """Nova versão completa + registro com o que mudou (RF-25, RF-27)."""
    aviso = await comum.iniciar_edicao(session, AVISOS, usuario, aviso_id, dados.destinos)
    quando = comum.agora()

    enviados = dados.model_fields_set
    alteracoes: dict[str, dict] = {}
    for campo in ("titulo", "conteudo"):
        novo = getattr(dados, campo)
        if campo in enviados and novo != getattr(aviso, campo):
            alteracoes[campo] = {"de": getattr(aviso, campo), "para": novo}

    if "publicar_em" in enviados:
        # Agendamento só muda antes da publicação; null publica já (plan-e2 D-E2-6). Depois de
        # publicado, qualquer valor é o mesmo erro, como quer que o aviso tenha sido criado
        # (emenda v2.4, specs/003 D-RV-4).
        if aviso.publicado_em <= quando:
            raise ErroDeValidacao("publicar_em", "aviso já publicado não pode ser reagendado")
        if dados.publicar_em != aviso.publicar_em:
            _exigir_futuro(dados.publicar_em)
            alteracoes["publicar_em"] = {
                "de": comum.iso_utc(aviso.publicar_em),
                "para": comum.iso_utc(dados.publicar_em),
            }

    destinos = await comum.alteracao_de_destinos(session, usuario, aviso, dados.destinos)
    if destinos:
        alteracoes["destinos"] = destinos
    comum.exigir_alteracao(alteracoes)

    for campo in ("titulo", "conteudo"):
        if campo in alteracoes:
            setattr(aviso, campo, getattr(dados, campo))
    if "publicar_em" in alteracoes:
        # null publica já: grava a hora da publicação, não cai na data de criação.
        aviso.publicar_em = dados.publicar_em or quando
        alteracoes["publicar_em"]["para"] = comum.iso_utc(aviso.publicar_em)
    return await comum.gravar_edicao(
        session, AVISOS, usuario, aviso, alteracoes, dados.destinos, quando
    )


async def obter(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso:
    return await comum.obter(session, AVISOS, usuario, aviso_id)


async def arquivar(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso:
    return await comum.arquivar(session, AVISOS, usuario, aviso_id)


async def desarquivar(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso:
    return await comum.desarquivar(session, AVISOS, usuario, aviso_id)


async def excluir(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> None:
    """Exclusão lógica: some do app e da gestão; versões e eventos permanecem (spec §3.4)."""
    await comum.excluir(session, AVISOS, usuario, aviso_id)


async def versoes(
    session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[AvisoVersao, Usuario]], int]:
    return await comum.versoes(session, AVISOS, usuario, aviso_id, limit, offset)


async def historico(
    session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[AvisoEvento, Usuario]], int]:
    return await comum.historico(session, AVISOS, usuario, aviso_id, limit, offset)
