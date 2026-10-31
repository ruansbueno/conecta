from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.gestao.eventos import EventoCreate, EventoGestaoOut
from src.services import eventos_gestao_service as service

router = APIRouter(prefix="/eventos")


@router.post("", response_model=EventoGestaoOut, status_code=status.HTTP_201_CREATED)
async def criar(
    body: EventoCreate,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventoGestaoOut:
    return EventoGestaoOut.model_validate(await service.criar(session, usuario, body))
