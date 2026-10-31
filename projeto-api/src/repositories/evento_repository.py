import uuid
from datetime import datetime

from sqlalchemy import Select, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.evento import Evento, EventoDestino
from src.models.usuario import Usuario
from src.repositories.alcance import alcanca

# Encerrado: o fim — ou o início, num evento pontual — já passou (plan D-E3-4).
TERMINO = func.coalesce(Evento.fim, Evento.inicio)


class EventoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar_para_usuario(
        self,
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
        stmt = self._visiveis(usuario).where(Evento.situacao == situacao)
        # Intervalo semiaberto [de, ate) sobre o início (plan D-E3-3).
        if de is not None:
            stmt = stmt.where(Evento.inicio >= de)
        if ate is not None:
            stmt = stmt.where(Evento.inicio < ate)
        # A lista de arquivados é histórica: não se filtra por encerrados.
        if situacao == "ativo" and not incluir_encerrados:
            stmt = stmt.where(func.now() <= TERMINO)
        if tipo is not None:
            stmt = stmt.where(Evento.tipo == tipo)
        if turma_id is not None:
            stmt = stmt.where(
                exists().where(
                    EventoDestino.evento_id == Evento.id,
                    EventoDestino.tipo == "turma",
                    EventoDestino.turma_id == turma_id,
                )
            )
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        eventos = await self.session.scalars(
            self._com_detalhes(stmt).order_by(Evento.inicio, Evento.id).limit(limit).offset(offset)
        )
        return list(eventos), total

    async def get_para_usuario(self, usuario: Usuario, evento_id: uuid.UUID) -> Evento | None:
        stmt = self._visiveis(usuario).where(
            Evento.id == evento_id, Evento.situacao.in_(("ativo", "arquivado"))
        )
        return await self.session.scalar(self._com_detalhes(stmt))

    @staticmethod
    def _visiveis(usuario: Usuario) -> Select:
        return select(Evento).where(
            alcanca(EventoDestino, EventoDestino.evento_id == Evento.id, usuario)
        )

    @staticmethod
    def _com_detalhes(stmt: Select) -> Select:
        return stmt.options(
            selectinload(Evento.autor),
            selectinload(Evento.destinos).selectinload(EventoDestino.turma),
        )
