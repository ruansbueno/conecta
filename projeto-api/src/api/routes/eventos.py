import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import AwareDatetime
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.evento import TipoDeEvento
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.evento import EventoOut
from src.services import evento_service

router = APIRouter(prefix="/eventos", tags=["eventos"])


@router.get("", response_model=Page[EventoOut])
async def listar(
    de: AwareDatetime | None = Query(None),
    ate: AwareDatetime | None = Query(None),
    incluir_encerrados: bool = False,
    tipo: TipoDeEvento | None = None,
    situacao: Literal["ativo", "arquivado"] = "ativo",
    turma_id: uuid.UUID | None = Query(None),
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[EventoOut]:
    eventos, total = await evento_service.listar(
        session,
        usuario,
        situacao,
        de,
        ate,
        incluir_encerrados,
        tipo,
        turma_id,
        page.limit,
        page.offset,
    )
    return Page(
        items=[EventoOut.model_validate(e) for e in eventos],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/{evento_id}", response_model=EventoOut)
async def obter(
    evento_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventoOut:
    return EventoOut.model_validate(await evento_service.obter(session, usuario, evento_id))
