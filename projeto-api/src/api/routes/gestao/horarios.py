import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import require_perfil
from src.db.session import get_session
from src.schemas.common import Page, PaginationParams
from src.schemas.gestao.horarios import HorarioCreate, HorarioEnvelope, HorarioPatch
from src.schemas.horario import HorarioOut
from src.services import horarios_service as service

# Montar a grade é só da administração e da coordenação (spec E3 §2.4); o docente consulta a
# grade pela rota de clientes, como os alunos.
router = APIRouter(
    prefix="/turmas/{turma_id}/horarios",
    dependencies=[Depends(require_perfil("administrador", "coordenacao"))],
)


def _envelope(resultado) -> HorarioEnvelope:
    horario, conflitos = resultado
    return HorarioEnvelope(horario=HorarioOut.model_validate(horario), conflitos=conflitos)


@router.post("", response_model=HorarioEnvelope, status_code=status.HTTP_201_CREATED)
async def criar(
    turma_id: uuid.UUID, body: HorarioCreate, session: AsyncSession = Depends(get_session)
) -> HorarioEnvelope:
    return _envelope(await service.criar(session, turma_id, body))


@router.get("", response_model=Page[HorarioOut])
async def listar(
    turma_id: uuid.UUID,
    dia_semana: int | None = Query(None, ge=1, le=7),
    page: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[HorarioOut]:
    horarios, total = await service.listar_gestao(
        session, turma_id, dia_semana, page.limit, page.offset
    )
    return Page(
        items=[HorarioOut.model_validate(h) for h in horarios],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.patch("/{horario_id}", response_model=HorarioEnvelope)
async def editar(
    turma_id: uuid.UUID,
    horario_id: uuid.UUID,
    body: HorarioPatch,
    session: AsyncSession = Depends(get_session),
) -> HorarioEnvelope:
    return _envelope(await service.editar(session, turma_id, horario_id, body))


@router.delete("/{horario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover(
    turma_id: uuid.UUID, horario_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    await service.remover(session, turma_id, horario_id)
