import uuid
from typing import Literal

from fastapi import APIRouter, Depends, Query, status
from pydantic import AwareDatetime
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.evento import TipoDeEvento
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams, PessoaOut
from src.schemas.gestao.eventos import (
    EventoCreate,
    EventoGestaoOut,
    EventoPatch,
    HistoricoEventoOut,
    SituacaoEventoGestao,
    VersaoEventoOut,
)
from src.services import eventos_gestao_service as service

router = APIRouter(prefix="/eventos")


@router.post("", response_model=EventoGestaoOut, status_code=status.HTTP_201_CREATED)
async def criar(
    body: EventoCreate,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventoGestaoOut:
    return EventoGestaoOut.model_validate(await service.criar(session, usuario, body))


@router.get("", response_model=Page[EventoGestaoOut])
async def listar(
    situacao: SituacaoEventoGestao | None = None,
    tipo: TipoDeEvento | None = None,
    autor_id: uuid.UUID | None = None,
    turma_id: uuid.UUID | None = None,
    de: AwareDatetime | None = Query(None),
    ate: AwareDatetime | None = Query(None),
    q: str | None = Query(None, max_length=100),
    quando: Literal["proximos", "realizados"] | None = None,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[EventoGestaoOut]:
    eventos, total = await service.listar(
        session,
        usuario,
        situacao,
        tipo,
        autor_id,
        turma_id,
        de,
        ate,
        q,
        page.limit,
        page.offset,
        quando,
    )
    return Page(
        items=[EventoGestaoOut.model_validate(e) for e in eventos],
        total=total,
        limit=page.limit,
        offset=page.offset,
    )


@router.get("/{evento_id}", response_model=EventoGestaoOut)
async def obter(
    evento_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventoGestaoOut:
    return EventoGestaoOut.model_validate(await service.obter(session, usuario, evento_id))


@router.patch("/{evento_id}", response_model=EventoGestaoOut)
async def editar(
    evento_id: uuid.UUID,
    body: EventoPatch,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventoGestaoOut:
    return EventoGestaoOut.model_validate(await service.editar(session, usuario, evento_id, body))


@router.post("/{evento_id}/arquivar", response_model=EventoGestaoOut)
async def arquivar(
    evento_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventoGestaoOut:
    return EventoGestaoOut.model_validate(await service.arquivar(session, usuario, evento_id))


@router.post("/{evento_id}/desarquivar", response_model=EventoGestaoOut)
async def desarquivar(
    evento_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> EventoGestaoOut:
    return EventoGestaoOut.model_validate(await service.desarquivar(session, usuario, evento_id))


@router.delete("/{evento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(
    evento_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> None:
    await service.excluir(session, usuario, evento_id)


@router.get("/{evento_id}/versoes", response_model=Page[VersaoEventoOut])
async def versoes(
    evento_id: uuid.UUID,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[VersaoEventoOut]:
    linhas, total = await service.versoes(session, usuario, evento_id, page.limit, page.offset)
    itens = [
        VersaoEventoOut(
            versao=v.versao,
            titulo=v.titulo,
            descricao=v.descricao,
            tipo=v.tipo,
            inicio=v.inicio,
            fim=v.fim,
            local=v.local,
            destinos=v.destinos,
            criada_por=PessoaOut.model_validate(autor),
            criada_em=v.criada_em,
        )
        for v, autor in linhas
    ]
    return Page(items=itens, total=total, limit=page.limit, offset=page.offset)


@router.get("/{evento_id}/historico", response_model=Page[HistoricoEventoOut])
async def historico(
    evento_id: uuid.UUID,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[HistoricoEventoOut]:
    linhas, total = await service.historico(session, usuario, evento_id, page.limit, page.offset)
    itens = [
        HistoricoEventoOut(
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
