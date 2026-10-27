import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.gestao.avisos import (
    AvisoCreate,
    AvisoGestaoOut,
    AvisoPatch,
    EventoOut,
    PessoaOut,
    SituacaoGestao,
    VersaoOut,
)
from src.services import avisos_gestao_service as service

router = APIRouter(prefix="/avisos")


@router.post("", response_model=AvisoGestaoOut, status_code=status.HTTP_201_CREATED)
async def criar(
    body: AvisoCreate,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AvisoGestaoOut:
    return AvisoGestaoOut.model_validate(await service.criar(session, usuario, body))


@router.get("", response_model=Page[AvisoGestaoOut])
async def listar(
    situacao: SituacaoGestao | None = None,
    autor_id: uuid.UUID | None = None,
    turma_id: uuid.UUID | None = None,
    q: str | None = Query(None, max_length=100),
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[AvisoGestaoOut]:
    avisos, total = await service.listar(
        session, usuario, situacao, autor_id, turma_id, q, page.limit, page.offset
    )
    return Page(
        items=[AvisoGestaoOut.model_validate(a) for a in avisos],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/{aviso_id}", response_model=AvisoGestaoOut)
async def obter(
    aviso_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AvisoGestaoOut:
    return AvisoGestaoOut.model_validate(await service.obter(session, usuario, aviso_id))


@router.patch("/{aviso_id}", response_model=AvisoGestaoOut)
async def editar(
    aviso_id: uuid.UUID,
    body: AvisoPatch,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AvisoGestaoOut:
    return AvisoGestaoOut.model_validate(await service.editar(session, usuario, aviso_id, body))


@router.post("/{aviso_id}/arquivar", response_model=AvisoGestaoOut)
async def arquivar(
    aviso_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AvisoGestaoOut:
    return AvisoGestaoOut.model_validate(await service.arquivar(session, usuario, aviso_id))


@router.post("/{aviso_id}/desarquivar", response_model=AvisoGestaoOut)
async def desarquivar(
    aviso_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> AvisoGestaoOut:
    return AvisoGestaoOut.model_validate(await service.desarquivar(session, usuario, aviso_id))


@router.delete("/{aviso_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(
    aviso_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.excluir(session, usuario, aviso_id)


@router.get("/{aviso_id}/versoes", response_model=Page[VersaoOut])
async def versoes(
    aviso_id: uuid.UUID,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[VersaoOut]:
    linhas, total = await service.versoes(session, usuario, aviso_id, page.limit, page.offset)
    itens = [
        VersaoOut(
            versao=v.versao,
            titulo=v.titulo,
            conteudo=v.conteudo,
            publicar_em=v.publicar_em,
            destinos=v.destinos,
            criada_por=PessoaOut.model_validate(autor),
            criada_em=v.criada_em,
        )
        for v, autor in linhas
    ]
    return Page(items=itens, total=total, limit=page.limit, offset=page.offset)


@router.get("/{aviso_id}/historico", response_model=Page[EventoOut])
async def historico(
    aviso_id: uuid.UUID,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[EventoOut]:
    linhas, total = await service.historico(session, usuario, aviso_id, page.limit, page.offset)
    itens = [
        EventoOut(
            id=e.id,
            tipo=e.tipo,
            usuario=PessoaOut.model_validate(autor),
            ocorrido_em=e.ocorrido_em,
            versao=e.versao,
            alteracoes=e.alteracoes,
        )
        for e, autor in linhas
    ]
    return Page(items=itens, total=total, limit=page.limit, offset=page.offset)
