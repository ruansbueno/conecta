import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import apenas_aluno, get_current_user
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.horario import HorarioOut
from src.schemas.turma import SolicitacaoOut, TurmaMinhaOut, TurmaOut
from src.services import horarios_service, turma_service

router = APIRouter(prefix="/turmas", tags=["turmas"])


@router.get("/disponiveis", response_model=Page[TurmaOut])
async def disponiveis(
    page: PaginationParams = Depends(),
    aluno: Usuario = Depends(apenas_aluno),
    session: AsyncSession = Depends(get_session),
) -> Page[TurmaOut]:
    turmas, total = await turma_service.listar_disponiveis(session, aluno, page.limit, page.offset)
    return Page(
        items=[TurmaOut.model_validate(t) for t in turmas],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/minhas", response_model=Page[TurmaMinhaOut])
async def minhas(
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[TurmaMinhaOut]:
    rows, total = await turma_service.listar_minhas(session, usuario, page.limit, page.offset)
    items = [
        TurmaMinhaOut(**TurmaOut.model_validate(turma).model_dump(), papel=papel)
        for turma, papel in rows
    ]
    return Page(items=items, total=total, limit=page.limit, offset=page.offset)


@router.post(
    "/{turma_id}/solicitacoes",
    response_model=SolicitacaoOut,
    status_code=status.HTTP_201_CREATED,
)
async def solicitar(
    turma_id: uuid.UUID,
    aluno: Usuario = Depends(apenas_aluno),
    session: AsyncSession = Depends(get_session),
) -> SolicitacaoOut:
    solicitacao = await turma_service.solicitar(session, aluno, turma_id)
    return SolicitacaoOut.model_validate(solicitacao)


@router.get("/{turma_id}/horarios", response_model=Page[HorarioOut])
async def horarios(
    turma_id: uuid.UUID,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[HorarioOut]:
    itens, total = await horarios_service.consultar(
        session, usuario, turma_id, page.limit, page.offset
    )
    return Page(
        items=[HorarioOut.model_validate(h) for h in itens],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )
