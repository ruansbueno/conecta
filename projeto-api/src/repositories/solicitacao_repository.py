import uuid
from datetime import UTC, datetime

from sqlalchemy import exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import SolicitacaoNaoPendente
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.vinculo_turma import VinculoTurma


class SolicitacaoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, turma_id: uuid.UUID, aluno_id: uuid.UUID) -> SolicitacaoInscricao:
        solicitacao = SolicitacaoInscricao(turma_id=turma_id, aluno_id=aluno_id)
        self.session.add(solicitacao)
        await self.session.flush()
        await self.session.refresh(solicitacao)
        return solicitacao

    async def get(
        self, solicitacao_id: uuid.UUID, *, for_update: bool = False
    ) -> SolicitacaoInscricao | None:
        """`for_update` trava a linha: decisões concorrentes sobre a mesma solicitação esperam."""
        return await self.session.get(
            SolicitacaoInscricao, solicitacao_id, with_for_update=for_update
        )

    async def exists_pendente(self, turma_id: uuid.UUID, aluno_id: uuid.UUID) -> bool:
        return bool(
            await self.session.scalar(
                select(
                    exists().where(
                        SolicitacaoInscricao.turma_id == turma_id,
                        SolicitacaoInscricao.aluno_id == aluno_id,
                        SolicitacaoInscricao.status == "pendente",
                    )
                )
            )
        )

    async def list_by_aluno(
        self, aluno_id: uuid.UUID, status: str | None, limit: int, offset: int
    ) -> tuple[list[tuple[SolicitacaoInscricao, Turma]], int]:
        stmt = (
            select(SolicitacaoInscricao, Turma)
            .join(Turma, Turma.id == SolicitacaoInscricao.turma_id)
            .where(SolicitacaoInscricao.aluno_id == aluno_id)
        )
        if status is not None:
            stmt = stmt.where(SolicitacaoInscricao.status == status)
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        rows = await self.session.execute(
            stmt.order_by(SolicitacaoInscricao.solicitada_em.desc(), SolicitacaoInscricao.id)
            .limit(limit)
            .offset(offset)
        )
        return [(s, t) for s, t in rows], total

    async def cancel(self, solicitacao: SolicitacaoInscricao, aluno_id: uuid.UUID) -> None:
        self._decidir(solicitacao, "cancelada", aluno_id)
        await self.session.flush()

    async def approve(
        self, solicitacao: SolicitacaoInscricao, decisor_id: uuid.UUID
    ) -> VinculoTurma:
        """Aprova e cria o vínculo na mesma transação (o commit é de quem chama)."""
        self._decidir(solicitacao, "aprovada", decisor_id)
        vinculo = VinculoTurma(
            turma_id=solicitacao.turma_id,
            usuario_id=solicitacao.aluno_id,
            papel="aluno",
            origem="solicitacao",
            criado_por=decisor_id,
        )
        self.session.add(vinculo)
        await self.session.flush()
        return vinculo

    async def refuse(
        self,
        solicitacao: SolicitacaoInscricao,
        decisor_id: uuid.UUID,
        motivo: str | None = None,
    ) -> None:
        self._decidir(solicitacao, "recusada", decisor_id)
        solicitacao.motivo_recusa = motivo
        await self.session.flush()

    @staticmethod
    def _decidir(solicitacao: SolicitacaoInscricao, status: str, decisor_id: uuid.UUID) -> None:
        # Estados finais não mudam: pendente → aprovada | recusada | cancelada.
        if solicitacao.status != "pendente":
            raise SolicitacaoNaoPendente()
        solicitacao.status = status
        solicitacao.decidida_em = datetime.now(UTC)
        solicitacao.decidida_por = decisor_id
