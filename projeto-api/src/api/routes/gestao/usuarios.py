import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import require_perfil
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.gestao.usuarios import (
    PerfilIn,
    UsuarioGestaoDetalheOut,
    UsuarioGestaoOut,
    UsuarioPatch,
)
from src.schemas.usuario import TurmaDoUsuarioOut
from src.services import usuarios_gestao_service as service

router = APIRouter(prefix="/usuarios")

_leitura = require_perfil("administrador", "coordenacao")
_administrador = require_perfil("administrador")


@router.get("", response_model=Page[UsuarioGestaoOut], dependencies=[Depends(_leitura)])
async def listar(
    q: str | None = Query(None, max_length=100),
    perfil: PerfilIn | None = None,
    ativo: bool | None = None,
    page: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[UsuarioGestaoOut]:
    usuarios, total = await service.listar(session, q, perfil, ativo, page.limit, page.offset)
    return Page(
        items=[UsuarioGestaoOut.model_validate(u) for u in usuarios],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get(
    "/{usuario_id}", response_model=UsuarioGestaoDetalheOut, dependencies=[Depends(_leitura)]
)
async def obter(
    usuario_id: uuid.UUID, session: AsyncSession = Depends(get_session)
) -> UsuarioGestaoDetalheOut:
    usuario, turmas = await service.obter(session, usuario_id)
    return UsuarioGestaoDetalheOut(
        **UsuarioGestaoOut.model_validate(usuario).model_dump(),
        turmas=[
            TurmaDoUsuarioOut(id=t.id, codigo=t.codigo, nome=t.nome, papel=papel)
            for t, papel in turmas
        ],
    )


@router.patch("/{usuario_id}", response_model=UsuarioGestaoOut)
async def alterar(
    usuario_id: uuid.UUID,
    body: UsuarioPatch,
    administrador: Usuario = Depends(_administrador),
    session: AsyncSession = Depends(get_session),
) -> UsuarioGestaoOut:
    usuario = await service.alterar(session, administrador, usuario_id, body.perfil, body.ativo)
    return UsuarioGestaoOut.model_validate(usuario)
