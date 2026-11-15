from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.horario import AulaDoDocenteOut
from src.services import horarios_service

router = APIRouter(prefix="/horarios", tags=["horarios"])


@router.get("/minhas", response_model=Page[AulaDoDocenteOut])
async def minhas(
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[AulaDoDocenteOut]:
    """As aulas do docente em todas as turmas ativas, por dia e hora (emenda E3.1, RF-54)."""
    itens, total = await horarios_service.minhas_aulas(session, usuario, page.limit, page.offset)
    return Page(
        items=[AulaDoDocenteOut.model_validate(h) for h in itens],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )
