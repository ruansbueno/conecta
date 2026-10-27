import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user, require_perfil
from src.db.session import get_session
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.schemas.common import Page, PaginationParams
from src.schemas.gestao.vinculos import Papel, UsuarioResumoOut, VinculoCreate, VinculoOut
from src.services import vinculos_service as service

router = APIRouter(prefix="/turmas/{turma_id}/vinculos")

_gestao = require_perfil("administrador", "coordenacao")


def _saida(vinculo: VinculoTurma, usuario: Usuario) -> VinculoOut:
    return VinculoOut(
        usuario=UsuarioResumoOut.model_validate(usuario),
        papel=vinculo.papel,
        origem=vinculo.origem,
        criado_em=vinculo.criado_em,
    )


@router.get("", response_model=Page[VinculoOut])
async def listar(
    turma_id: uuid.UUID,
    papel: Papel | None = None,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[VinculoOut]:
    linhas, total = await service.listar(session, usuario, turma_id, papel, page.limit, page.offset)
    return Page(
        items=[_saida(v, u) for v, u in linhas], total=total, limit=page.limit, offset=page.offset
    )


@router.post("", response_model=VinculoOut, status_code=status.HTTP_201_CREATED)
async def vincular(
    turma_id: uuid.UUID,
    body: VinculoCreate,
    gestor: Usuario = Depends(_gestao),
    session: AsyncSession = Depends(get_session),
) -> VinculoOut:
    return _saida(*await service.vincular(session, gestor, turma_id, body.usuario_id, body.papel))


@router.delete(
    "/{usuario_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(_gestao)]
)
async def desvincular(
    turma_id: uuid.UUID, usuario_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> None:
    await service.desvincular(session, turma_id, usuario_id)
