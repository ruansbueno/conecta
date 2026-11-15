import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.horario import Horario
from src.models.turma import Turma


class HorarioRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar_da_turma(
        self, turma_id: uuid.UUID, dia_semana: int | None, limit: int, offset: int
    ) -> tuple[list[Horario], int]:
        stmt = select(Horario).where(Horario.turma_id == turma_id)
        if dia_semana is not None:
            stmt = stmt.where(Horario.dia_semana == dia_semana)
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        horarios = await self.session.scalars(
            stmt.options(selectinload(Horario.docente))
            .order_by(Horario.dia_semana, Horario.inicio, Horario.id)
            .limit(limit)
            .offset(offset)
        )
        return list(horarios), total

    async def listar_do_docente(
        self, docente_id: uuid.UUID, limit: int, offset: int
    ) -> tuple[list[Horario], int]:
        """Aulas em que a pessoa é o docente, só de turmas ativas (RF-54): turma inativa não tem
        aula acontecendo, como nos conflitos (plan E3 D-E3-9)."""
        stmt = (
            select(Horario)
            .join(Turma, Turma.id == Horario.turma_id)
            .where(Horario.docente_id == docente_id, Turma.ativa)
        )
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        horarios = await self.session.scalars(
            stmt.options(selectinload(Horario.docente), selectinload(Horario.turma))
            .order_by(Horario.dia_semana, Horario.inicio, Horario.id)
            .limit(limit)
            .offset(offset)
        )
        return list(horarios), total

    async def obter_da_turma(self, turma_id: uuid.UUID, horario_id: uuid.UUID) -> Horario | None:
        return await self.session.scalar(
            select(Horario)
            .where(Horario.id == horario_id, Horario.turma_id == turma_id)
            .options(selectinload(Horario.docente))
            .execution_options(populate_existing=True)
        )

    async def candidatos_a_conflito(
        self, horario: Horario, periodo_letivo: str
    ) -> list[tuple[Horario, Turma]]:
        """Outros horários do mesmo dia, sobrepostos, em turma ativa do mesmo período (D-E3-9).

        Sala e docente são conferidos depois, em Python (normalização do local).
        """
        linhas = await self.session.execute(
            select(Horario, Turma)
            .join(Turma, Turma.id == Horario.turma_id)
            .where(
                Horario.id != horario.id,
                Horario.dia_semana == horario.dia_semana,
                Horario.inicio < horario.fim,
                horario.inicio < Horario.fim,
                Turma.ativa,
                Turma.periodo_letivo == periodo_letivo,
            )
            .order_by(Horario.inicio, Horario.id)
        )
        return [(h, t) for h, t in linhas]
