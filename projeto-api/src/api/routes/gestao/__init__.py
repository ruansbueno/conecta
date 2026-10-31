"""Rotas de gestão (E2 e E3), consumidas pela plataforma web; perfil aluno nunca entra (§2.3)."""

from fastapi import APIRouter, Depends

from src.core.security import require_perfil

router = APIRouter(
    prefix="/gestao",
    tags=["gestão"],
    dependencies=[Depends(require_perfil("administrador", "coordenacao", "docente"))],
)


from src.api.routes.gestao import (  # noqa: E402
    avisos,
    eventos,
    solicitacoes,
    turmas,
    usuarios,
    vinculos,
)

router.include_router(usuarios.router)
router.include_router(turmas.router)
router.include_router(vinculos.router)
router.include_router(solicitacoes.router)
router.include_router(avisos.router)
router.include_router(eventos.router)
