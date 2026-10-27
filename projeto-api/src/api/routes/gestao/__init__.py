"""Rotas de gestão (E2), consumidas pela plataforma web. Perfil aluno nunca entra (spec §2.3)."""

from fastapi import APIRouter, Depends

from src.core.security import require_perfil

router = APIRouter(
    prefix="/gestao",
    tags=["gestão"],
    dependencies=[Depends(require_perfil("administrador", "coordenacao", "docente"))],
)


from src.api.routes.gestao import usuarios  # noqa: E402

router.include_router(usuarios.router)
