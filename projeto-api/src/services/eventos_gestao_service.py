"""Gestão dos eventos da agenda (RF-35, RF-36, RF-39..42).

Mesmo padrão dos avisos (plan-e2 D-E2-4): toda operação roda numa transação só — altera o
evento, grava versão e histórico e faz commit; qualquer falha desfaz tudo. A linha do evento
fica travada durante a escrita (plan D-E3-13).
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.errors import EventoNaoEncontrado
from src.models.evento import Evento, EventoDestino
from src.models.usuario import Usuario
from src.repositories.auditoria_repository import AuditoriaEventoRepository
from src.schemas.gestao.eventos import EventoCreate
from src.services.destinos import novos_destinos, validar_destinos


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
