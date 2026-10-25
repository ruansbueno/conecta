from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.usuario import Usuario
from src.repositories.turma_repository import TurmaRepository
from src.schemas.usuario import MeOut, TurmaDoUsuarioOut, UsuarioOut

router = APIRouter(tags=["perfil"])


@router.get("/me", response_model=MeOut)
async def me(
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> MeOut:
    turmas = await TurmaRepository(session).list_todas_minhas(usuario.id)
    return MeOut(
        **UsuarioOut.model_validate(usuario).model_dump(),
        turmas=[
            TurmaDoUsuarioOut(id=t.id, codigo=t.codigo, nome=t.nome, papel=papel)
            for t, papel in turmas
        ],
    )
