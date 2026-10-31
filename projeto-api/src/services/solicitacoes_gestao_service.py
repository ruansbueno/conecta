import uuid

from sqlalchemy import false, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from src.api.errors import (
    JaVinculado,
    PerfilIncompativel,
    SemPermissao,
    SolicitacaoNaoEncontrada,
    TurmaNaoEncontrada,
)
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.repositories.solicitacao_repository import SolicitacaoRepository
from src.repositories.turma_repository import TurmaRepository
from src.services.permissoes import gere_tudo, leciona, turmas_que_leciona

MOTIVO_JA_VINCULADO = "Aluno já vinculado à turma"

Linha = tuple[SolicitacaoInscricao, Usuario, Turma, Usuario | None]

_Aluno = aliased(Usuario)
_Decisor = aliased(Usuario)


def _consulta():
    return (
        select(SolicitacaoInscricao, _Aluno, Turma, _Decisor)
        .join(_Aluno, _Aluno.id == SolicitacaoInscricao.aluno_id)
        .join(Turma, Turma.id == SolicitacaoInscricao.turma_id)
        .outerjoin(_Decisor, _Decisor.id == SolicitacaoInscricao.decidida_por)
    )


async def listar(
    session: AsyncSession,
    usuario: Usuario,
    status: str,
    turma_id: uuid.UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[Linha], int]:
    stmt = _consulta().where(SolicitacaoInscricao.status == status)
    # Turma inexistente é 404 para todos os perfis, antes da permissão (como no detalhe da turma).
    if turma_id is not None and await session.get(Turma, turma_id) is None:
        raise TurmaNaoEncontrada()
    if not gere_tudo(usuario):
        # Docente decide só nas turmas em que leciona (spec §2.3).
        minhas = await turmas_que_leciona(session, usuario)
        if turma_id is not None and turma_id not in minhas:
            raise SemPermissao()
        stmt = stmt.where(SolicitacaoInscricao.turma_id.in_(minhas) if minhas else false())
    if turma_id is not None:
        stmt = stmt.where(SolicitacaoInscricao.turma_id == turma_id)
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    linhas = await session.execute(
        # Fila de decisão: a mais antiga primeiro.
        stmt.order_by(SolicitacaoInscricao.solicitada_em, SolicitacaoInscricao.id)
        .limit(limit)
        .offset(offset)
    )
    return [tuple(linha) for linha in linhas], total


async def _linha(session: AsyncSession, solicitacao_id: uuid.UUID) -> Linha:
    return tuple(
        (await session.execute(_consulta().where(SolicitacaoInscricao.id == solicitacao_id))).one()
    )


async def _para_decidir(
    session: AsyncSession, decisor: Usuario | None, solicitacao_id: uuid.UUID
) -> SolicitacaoInscricao:
    """Trava a solicitação: decisões simultâneas esperam e a segunda vê o estado final."""
    solicitacao = await SolicitacaoRepository(session).get(solicitacao_id, for_update=True)
    if solicitacao is None:
        raise SolicitacaoNaoEncontrada()
    docente = decisor is not None and not gere_tudo(decisor)
    if docente and not await leciona(session, decisor, solicitacao.turma_id):
        raise SemPermissao()
    return solicitacao


async def aprovar(
    session: AsyncSession, decisor: Usuario | None, solicitacao_id: uuid.UUID
) -> Linha:
    """Aprova e cria o vínculo na mesma transação (RF-17). `decisor` None: script de dev."""
    repo = SolicitacaoRepository(session)
    solicitacao = await _para_decidir(session, decisor, solicitacao_id)
    decisor_id = decisor.id if decisor else None
    if solicitacao.status != "pendente":
        await repo.approve(solicitacao, decisor_id)  # levanta SOLICITACAO_NAO_PENDENTE

    if await TurmaRepository(session).is_vinculado(solicitacao.turma_id, solicitacao.aluno_id):
        # Vínculo criado por outra via entre o pedido e a decisão (plan-e2 D-E2-8).
        await repo.refuse(solicitacao, decisor_id, MOTIVO_JA_VINCULADO)
        await session.commit()
        raise JaVinculado()
    aluno = await session.get(Usuario, solicitacao.aluno_id)
    if aluno.perfil != "aluno":
        raise PerfilIncompativel("O solicitante não tem mais perfil de aluno")

    try:
        await repo.approve(solicitacao, decisor_id)
        await session.commit()
    except IntegrityError as exc:
        # Vínculo criado por outra via entre a checagem e a aprovação: mesma auto-recusa.
        await session.rollback()
        if "uq_tb_usuario_turma_turma_usuario" not in str(exc.orig):
            raise
        # O rollback expira os objetos da sessão; a permissão já foi checada: só trava de novo.
        solicitacao = await repo.get(solicitacao_id, for_update=True)
        if solicitacao.status == "pendente":
            await repo.refuse(solicitacao, decisor_id, MOTIVO_JA_VINCULADO)
            await session.commit()
        raise JaVinculado() from None
    return await _linha(session, solicitacao_id)


async def recusar(
    session: AsyncSession, decisor: Usuario, solicitacao_id: uuid.UUID, motivo: str | None
) -> Linha:
    solicitacao = await _para_decidir(session, decisor, solicitacao_id)
    await SolicitacaoRepository(session).refuse(solicitacao, decisor.id, motivo)
    await session.commit()
    return await _linha(session, solicitacao_id)
