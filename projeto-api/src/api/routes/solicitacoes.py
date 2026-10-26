import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import apenas_aluno
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.turma import SolicitacaoMinhaOut, StatusSolicitacao, TurmaResumoOut
from src.services import turma_service

router = APIRouter(prefix="/solicitacoes", tags=["solicitacoes"])


@router.get("/minhas", response_model=Page[SolicitacaoMinhaOut])
async def minhas(
    status_: StatusSolicitacao | None = Query(None, alias="status"),
    page: PaginationParams = Depends(),
    aluno: Usuario = Depends(apenas_aluno),
    session: AsyncSession = Depends(get_session),
) -> Page[SolicitacaoMinhaOut]:
    rows, total = await turma_service.listar_solicitacoes(
        session, aluno, status_, page.limit, page.offset
    )
    items = [
        SolicitacaoMinhaOut(
            id=s.id,
            turma=TurmaResumoOut.model_validate(turma),
            status=s.status,
            solicitada_em=s.solicitada_em,
            decidida_em=s.decidida_em,
            motivo_recusa=s.motivo_recusa,
        )
        for s, turma in rows
    ]
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.delete("/{solicitacao_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancelar(
    solicitacao_id: uuid.UUID,
    aluno: Usuario = Depends(apenas_aluno),
    session: AsyncSession = Depends(get_session),
) -> None:
    await turma_service.cancelar(session, aluno, solicitacao_id)
