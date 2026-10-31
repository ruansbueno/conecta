import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import (
    JaVinculado,
    SolicitacaoDuplicada,
    SolicitacaoNaoEncontrada,
    TurmaIndisponivel,
)
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.repositories.solicitacao_repository import SolicitacaoRepository
from src.repositories.turma_repository import TurmaRepository

_INDICE_PENDENTE = "uq_tb_solicitacao_inscricao_pendente"


async def listar_disponiveis(
    session: AsyncSession, aluno: Usuario, limit: int, offset: int
) -> tuple[list[Turma], int]:
    return await TurmaRepository(session).list_disponiveis(aluno.id, limit, offset)


async def listar_minhas(
    session: AsyncSession, usuario: Usuario, limit: int, offset: int
) -> tuple[list[tuple[Turma, str]], int]:
    return await TurmaRepository(session).list_minhas(usuario.id, limit, offset)


async def solicitar(
    session: AsyncSession, aluno: Usuario, turma_id: uuid.UUID
) -> SolicitacaoInscricao:
    turmas = TurmaRepository(session)
    solicitacoes = SolicitacaoRepository(session)

    turma = await turmas.get_by_id(turma_id)
    if turma is None or not turma.ativa or not turma.inscricoes_abertas:
        raise TurmaIndisponivel()
    if await turmas.is_vinculado(turma_id, aluno.id):
        raise JaVinculado()
    if await solicitacoes.exists_pendente(turma_id, aluno.id):
        raise SolicitacaoDuplicada()

    try:
        solicitacao = await solicitacoes.create(turma_id, aluno.id)
        await session.commit()
    except IntegrityError as exc:
        # Duas requisições simultâneas passaram pela checagem: o índice parcial decide.
        await session.rollback()
        if _INDICE_PENDENTE in str(exc.orig):
            raise SolicitacaoDuplicada() from None
        raise
    return solicitacao


async def listar_solicitacoes(
    session: AsyncSession, aluno: Usuario, status: str | None, limit: int, offset: int
) -> tuple[list[tuple[SolicitacaoInscricao, Turma]], int]:
    return await SolicitacaoRepository(session).list_by_aluno(aluno.id, status, limit, offset)


async def cancelar(session: AsyncSession, aluno: Usuario, solicitacao_id: uuid.UUID) -> None:
    repo = SolicitacaoRepository(session)
    solicitacao = await repo.get(solicitacao_id, for_update=True)
    # Solicitação de outro aluno é indistinguível de inexistente.
    if solicitacao is None or solicitacao.aluno_id != aluno.id:
        raise SolicitacaoNaoEncontrada()
    await repo.cancel(solicitacao, aluno.id)
    await session.commit()
