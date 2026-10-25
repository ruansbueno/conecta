import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.aviso import AvisoOut
from src.schemas.common import Page, PaginationParams
from src.services import aviso_service

router = APIRouter(prefix="/avisos", tags=["avisos"])


@router.get("", response_model=Page[AvisoOut])
async def listar(
    situacao: Literal["ativo", "arquivado"] = "ativo",
    turma_id: uuid.UUID | None = Query(None),
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[AvisoOut]:
    avisos, total = await aviso_service.listar(
        session, usuario, situacao, turma_id, page.limit, page.offset
    )
    return Page(
        items=[AvisoOut.model_validate(a) for a in avisos],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/{aviso_id}", response_model=AvisoOut)
async def obter(
    aviso_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AvisoOut:
    return AvisoOut.model_validate(await aviso_service.obter(session, usuario, aviso_id))
