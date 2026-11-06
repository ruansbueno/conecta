import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import require_perfil
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.gestao.acessos import AcessoOut, AprovarAcessoIn, DecisorOut, SituacaoPedido
from src.services import acessos_gestao_service as service

router = APIRouter(prefix="/acessos")

_gestores = require_perfil("administrador", "coordenacao")


async def _saida(session: AsyncSession, usuario: Usuario) -> AcessoOut:
    decisor = await service.decisor(session, usuario)
    return AcessoOut(
        id=usuario.id,
        username=usuario.username,
        nome=usuario.nome,
        email=usuario.email,
        tipo_institucional=usuario.tipo_institucional,
        situacao=usuario.situacao_acesso,
        perfil=usuario.perfil,
        solicitado_em=usuario.criado_em,
        decidido_em=usuario.acesso_decidido_em,
        decidido_por=None if decisor is None else DecisorOut(id=decisor.id, nome=decisor.nome),
    )


@router.get(
    "",
    response_model=Page[AcessoOut],
    response_model_exclude={"items": {"__all__": {"perfil"}}},
    dependencies=[Depends(_gestores)],
)
async def listar(
    situacao: SituacaoPedido = Query("pendente"),
    page: PaginationParams = Depends(),
    session: AsyncSession = Depends(get_session),
) -> Page[AcessoOut]:
    usuarios, total = await service.listar(session, situacao, page.limit, page.offset)
    return Page(
        items=[await _saida(session, u) for u in usuarios],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.post("/{usuario_id}/aprovar", response_model=AcessoOut)
async def aprovar(
    usuario_id: uuid.UUID,
    body: AprovarAcessoIn,
    gestor: Usuario = Depends(_gestores),
    session: AsyncSession = Depends(get_session),
) -> AcessoOut:
    return await _saida(session, await service.aprovar(session, gestor, usuario_id, body.perfil))


@router.post("/{usuario_id}/recusar", response_model=AcessoOut)
async def recusar(
    usuario_id: uuid.UUID,
    gestor: Usuario = Depends(_gestores),
    session: AsyncSession = Depends(get_session),
) -> AcessoOut:
    return await _saida(session, await service.recusar(session, gestor, usuario_id))
