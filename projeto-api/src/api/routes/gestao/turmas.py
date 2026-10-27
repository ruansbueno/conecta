import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user, require_perfil
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.gestao.turmas import TurmaCreate, TurmaGestaoOut, TurmaPatch
from src.services import turmas_gestao_service as service

router = APIRouter(prefix="/turmas")

_gestao = require_perfil("administrador", "coordenacao")


def _saida(item: dict) -> TurmaGestaoOut:
    return TurmaGestaoOut.model_validate(item["turma"]).model_copy(
        update={"total_alunos": item["alunos"], "total_docentes": item["docentes"]}
    )


@router.get("", response_model=Page[TurmaGestaoOut])
async def listar(
    ativa: bool | None = None,
    semestre_curso: int | None = Query(None, ge=1, le=12),
    periodo_letivo: str | None = Query(None, max_length=20),
    q: str | None = Query(None, max_length=100),
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[TurmaGestaoOut]:
    itens, total = await service.listar(
        session, usuario, ativa, semestre_curso, periodo_letivo, q, page.limit, page.offset
    )
    return Page(items=[_saida(i) for i in itens], total=total, limit=page.limit, offset=page.offset)


@router.post(
    "",
    response_model=TurmaGestaoOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_gestao)],
)
async def criar(body: TurmaCreate, session: AsyncSession = Depends(get_session)) -> TurmaGestaoOut:
    return _saida(await service.criar(session, body.model_dump()))


@router.get("/{turma_id}", response_model=TurmaGestaoOut)
async def obter(
    turma_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> TurmaGestaoOut:
    return _saida(await service.obter(session, usuario, turma_id))


@router.patch("/{turma_id}", response_model=TurmaGestaoOut, dependencies=[Depends(_gestao)])
async def alterar(
    turma_id: uuid.UUID, body: TurmaPatch, session: AsyncSession = Depends(get_session)
) -> TurmaGestaoOut:
    return _saida(await service.alterar(session, turma_id, body.model_dump(exclude_unset=True)))


@router.delete(
    "/{turma_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(_gestao)]
)
async def desativar(turma_id: uuid.UUID, session: AsyncSession = Depends(get_session)) -> None:
    await service.desativar(session, turma_id)
