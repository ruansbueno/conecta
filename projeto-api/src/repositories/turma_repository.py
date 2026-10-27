import uuid

from sqlalchemy import Select, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.vinculo_turma import VinculoTurma

_ORDEM = (Turma.semestre_curso, Turma.codigo)


class TurmaRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, turma_id: uuid.UUID) -> Turma | None:
        return await self.session.get(Turma, turma_id)

    async def list_disponiveis(
        self, aluno_id: uuid.UUID, limit: int, offset: int
    ) -> tuple[list[Turma], int]:
        """Ativas, com inscrições abertas, sem vínculo e sem pendente do aluno (RF-12)."""
        vinculada = exists().where(
            VinculoTurma.turma_id == Turma.id, VinculoTurma.usuario_id == aluno_id
        )
        pendente = exists().where(
            SolicitacaoInscricao.turma_id == Turma.id,
            SolicitacaoInscricao.aluno_id == aluno_id,
            SolicitacaoInscricao.status == "pendente",
        )
        stmt = select(Turma).where(Turma.ativa, Turma.inscricoes_abertas, ~vinculada, ~pendente)
        return await self._paginar(stmt, limit, offset)

    async def list_minhas(
        self, usuario_id: uuid.UUID, limit: int, offset: int
    ) -> tuple[list[tuple[Turma, str]], int]:
        """Turmas ativas em que o usuário tem vínculo, com o papel dele em cada uma."""
        stmt = self._minhas(usuario_id)
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = await self.session.execute(stmt.order_by(*_ORDEM).limit(limit).offset(offset))
        return [(turma, papel) for turma, papel in rows], total

    async def list_todas_minhas(self, usuario_id: uuid.UUID) -> list[tuple[Turma, str]]:
        rows = await self.session.execute(self._minhas(usuario_id).order_by(*_ORDEM))
        return [(turma, papel) for turma, papel in rows]

    async def list_todas_do_usuario(self, usuario_id: uuid.UUID) -> list[tuple[Turma, str]]:
        """Todas as turmas do usuário, ativas ou não (visão de gestão)."""
        rows = await self.session.execute(
            select(Turma, VinculoTurma.papel)
            .join(VinculoTurma, VinculoTurma.turma_id == Turma.id)
            .where(VinculoTurma.usuario_id == usuario_id)
            .order_by(*_ORDEM)
        )
        return [(turma, papel) for turma, papel in rows]

    async def is_vinculado(self, turma_id: uuid.UUID, usuario_id: uuid.UUID) -> bool:
        return bool(
            await self.session.scalar(
                select(
                    exists().where(
                        VinculoTurma.turma_id == turma_id, VinculoTurma.usuario_id == usuario_id
                    )
                )
            )
        )

    @staticmethod
    def _minhas(usuario_id: uuid.UUID) -> Select:
        return (
            select(Turma, VinculoTurma.papel)
            .join(VinculoTurma, VinculoTurma.turma_id == Turma.id)
            .where(VinculoTurma.usuario_id == usuario_id, Turma.ativa)
        )

    async def _paginar(self, stmt: Select, limit: int, offset: int) -> tuple[list[Turma], int]:
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        turmas = await self.session.scalars(stmt.order_by(*_ORDEM).limit(limit).offset(offset))
        return list(turmas), total
