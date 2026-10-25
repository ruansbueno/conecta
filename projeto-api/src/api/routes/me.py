from fastapi import APIRouter, Depends

from src.core.security import get_current_user
from src.models.usuario import Usuario
from src.schemas.usuario import MeOut, UsuarioOut

router = APIRouter(tags=["perfil"])


@router.get("/me", response_model=MeOut)
async def me(usuario: Usuario = Depends(get_current_user)) -> MeOut:
    return MeOut(**UsuarioOut.model_validate(usuario).model_dump(), turmas=[])
