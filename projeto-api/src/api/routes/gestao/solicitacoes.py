import uuid

from fastapi import APIRouter, Body, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_current_user
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams
from src.schemas.gestao.solicitacoes import DecisorOut, Recusa, SolicitacaoGestaoOut
from src.schemas.gestao.vinculos import UsuarioResumoOut
from src.schemas.turma import StatusSolicitacao, TurmaResumoOut
from src.services import solicitacoes_gestao_service as service

router = APIRouter(prefix="/solicitacoes")

_corpo_opcional = Body(None)  # recusar aceita corpo ausente (motivo opcional)


def _saida(linha: service.Linha) -> SolicitacaoGestaoOut:
    solicitacao, aluno, turma, decisor = linha
    return SolicitacaoGestaoOut(
        id=solicitacao.id,
        aluno=UsuarioResumoOut.model_validate(aluno),
        turma=TurmaResumoOut.model_validate(turma),
        status=solicitacao.status,
        solicitada_em=solicitacao.solicitada_em,
        decidida_em=solicitacao.decidida_em,
        decidida_por=DecisorOut.model_validate(decisor) if decisor else None,
        motivo_recusa=solicitacao.motivo_recusa,
    )


@router.get("", response_model=Page[SolicitacaoGestaoOut])
async def listar(
    status_: StatusSolicitacao = Query("pendente", alias="status"),
    turma_id: uuid.UUID | None = None,
    page: PaginationParams = Depends(),
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Page[SolicitacaoGestaoOut]:
    linhas, total = await service.listar(
        session, usuario, status_, turma_id, page.limit, page.offset
    )
    return Page(
        items=[_saida(li) for li in linhas], total=total, limit=page.limit, offset=page.offset
    )


@router.post("/{solicitacao_id}/aprovar", response_model=SolicitacaoGestaoOut)
async def aprovar(
    solicitacao_id: uuid.UUID,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SolicitacaoGestaoOut:
    return _saida(await service.aprovar(session, usuario, solicitacao_id))


@router.post("/{solicitacao_id}/recusar", response_model=SolicitacaoGestaoOut)
async def recusar(
    solicitacao_id: uuid.UUID,
    body: Recusa | None = _corpo_opcional,
    usuario: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> SolicitacaoGestaoOut:
    motivo = body.motivo if body else None
    return _saida(await service.recusar(session, usuario, solicitacao_id, motivo))
