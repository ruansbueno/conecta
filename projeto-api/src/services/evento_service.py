"""Consulta da agenda pelos clientes (RF-37, RF-38)."""

import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import ErroDeValidacao, EventoNaoEncontrado
from src.models.evento import Evento
from src.models.usuario import Usuario
from src.repositories.evento_repository import EventoRepository


async def listar(
    session: AsyncSession,
    usuario: Usuario,
    situacao: str,
    de: datetime | None,
    ate: datetime | None,
    incluir_encerrados: bool,
    tipo: str | None,
    turma_id: uuid.UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[Evento], int]:
    if de is not None and ate is not None and ate < de:
        raise ErroDeValidacao("ate", "deve ser maior ou igual a de")
    return await EventoRepository(session).listar_para_usuario(
        usuario, situacao, de, ate, incluir_encerrados, tipo, turma_id, limit, offset
    )


async def obter(session: AsyncSession, usuario: Usuario, evento_id: uuid.UUID) -> Evento:
    # Inexistente, excluído ou fora do alcance: a API não distingue (contracts E3 §2).
    evento = await EventoRepository(session).get_para_usuario(usuario, evento_id)
    if evento is None:
        raise EventoNaoEncontrado()
    return evento
