"""Gestão dos eventos da agenda (RF-35, RF-36, RF-39..42).

O que é comum com os avisos está em `publicacao_gestao` (specs/003, D-RV-8). Aqui fica o que é
só do evento: tipo, início, fim e local, a janela de datas e as abas Próximos e Realizados.
"""

import uuid
from datetime import datetime

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import (
    ErroDeValidacao,
    EventoNaoEditavel,
    EventoNaoEncontrado,
    EventoSituacaoInvalida,
)
from src.models.evento import Evento, EventoDestino
from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao
from src.models.usuario import Usuario
from src.repositories.auditoria_repository import EVENTO
from src.repositories.evento_repository import TERMINO, na_janela
from src.schemas.gestao.eventos import EventoCreate, EventoPatch
from src.services import publicacao_gestao as comum
from src.services.destinos import novos_destinos, validar_destinos

EVENTOS = comum.Publicacao(
    nome="evento",
    modelo=Evento,
    destino=EventoDestino,
    auditado=EVENTO,
    nao_encontrado=EventoNaoEncontrado,
    nao_editavel=EventoNaoEditavel,
    situacao_invalida=EventoSituacaoInvalida,
)

# Campos simples do evento, na ordem em que o histórico os registra.
_CAMPOS = ("titulo", "descricao", "tipo", "inicio", "fim", "local")
_DATAS = ("inicio", "fim")


async def criar(session: AsyncSession, autor: Usuario, dados: EventoCreate) -> Evento:
    await validar_destinos(session, autor, dados.destinos)
    quando = comum.agora()
    evento = Evento(
        autor_id=autor.id,
        criado_em=quando,
        titulo=dados.titulo,
        descricao=dados.descricao,
        tipo=dados.tipo,
        inicio=dados.inicio,
        fim=dados.fim,
        local=dados.local,
        versao_atual=1,
        destinos=novos_destinos(EventoDestino, dados.destinos),
    )
    return await comum.gravar_criacao(session, EVENTOS, evento, autor, quando)


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
    quando: str | None = None,
) -> tuple[list[Evento], int]:
    if de is not None and ate is not None and ate < de:
        raise ErroDeValidacao("ate", "deve ser maior ou igual a de")
    stmt = await comum.filtrar_lista(
        session,
        EVENTOS,
        usuario,
        situacao,
        autor_id,
        turma_id,
        q,
        (Evento.titulo, Evento.descricao, Evento.local),
    )
    if situacao is not None:
        stmt = stmt.where(Evento.situacao == situacao)
    if tipo is not None:
        stmt = stmt.where(Evento.tipo == tipo)
    # Mesma janela da consulta (plan D-E3-3); a gestão vê também os encerrados.
    stmt = stmt.where(*na_janela(de, ate))
    # Próximos: não encerrados, como na consulta dos clientes; realizados: o complemento, dos mais
    # recentes para os mais antigos (contracts E3 §5; plan-f2 da web, D-F2-2).
    ordem = (Evento.inicio, Evento.id)
    if quando == "proximos":
        stmt = stmt.where(func.now() <= TERMINO)
    elif quando == "realizados":
        stmt = stmt.where(func.now() > TERMINO)
        ordem = (Evento.inicio.desc(), Evento.id.desc())
    return await comum.paginar(session, EVENTOS, stmt, ordem, limit, offset)


async def editar(
    session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID, dados: EventoPatch
) -> Evento:
    """Nova versão completa + histórico com o que mudou (RF-39, RF-41)."""
    evento = await comum.iniciar_edicao(session, EVENTOS, usuario, evento_id, dados.destinos)

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
                de, para = comum.iso_utc(de), comum.iso_utc(para)
            alteracoes[campo] = {"de": de, "para": para}
    destinos = await comum.alteracao_de_destinos(session, usuario, evento, dados.destinos)
    if destinos:
        alteracoes["destinos"] = destinos
    comum.exigir_alteracao(alteracoes)

    for campo in _CAMPOS:
        if campo in alteracoes:
            setattr(evento, campo, novo[campo])
    return await comum.gravar_edicao(
        session, EVENTOS, usuario, evento, alteracoes, dados.destinos, comum.agora()
    )


async def obter(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> Evento:
    return await comum.obter(session, EVENTOS, usuario, evento_id)


async def arquivar(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> Evento:
    return await comum.arquivar(session, EVENTOS, usuario, evento_id)


async def desarquivar(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> Evento:
    return await comum.desarquivar(session, EVENTOS, usuario, evento_id)


async def excluir(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> None:
    """Exclusão lógica: some da agenda e da gestão; versões e histórico ficam (RF-40)."""
    await comum.excluir(session, EVENTOS, usuario, evento_id)


async def versoes(
    session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[EventoVersao, Usuario]], int]:
    return await comum.versoes(session, EVENTOS, usuario, evento_id, limit, offset)


async def historico(
    session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[tuple[EventoHistorico, Usuario]], int]:
    return await comum.historico(session, EVENTOS, usuario, evento_id, limit, offset)
