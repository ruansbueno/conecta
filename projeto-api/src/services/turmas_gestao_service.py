import uuid

from sqlalchemy import false, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import CodigoTurmaDuplicado, SemPermissao, TurmaNaoEncontrada
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.services.permissoes import gere_tudo, leciona, turmas_que_leciona

_UNICO_CODIGO = "uq_tb_turma_cod_turma"


async def _totais(session: AsyncSession, ids: list[uuid.UUID]) -> dict[uuid.UUID, dict[str, int]]:
    if not ids:
        return {}
    linhas = await session.execute(
        select(VinculoTurma.turma_id, VinculoTurma.papel, func.count())
        .where(VinculoTurma.turma_id.in_(ids))
        .group_by(VinculoTurma.turma_id, VinculoTurma.papel)
    )
    totais: dict[uuid.UUID, dict[str, int]] = {}
    for turma_id, papel, n in linhas:
        totais.setdefault(turma_id, {})[papel] = n
    return totais


def _com_totais(turma: Turma, totais: dict[str, int]) -> dict:
    return {"turma": turma, "alunos": totais.get("aluno", 0), "docentes": totais.get("docente", 0)}


async def listar(
    session: AsyncSession,
    usuario: Usuario,
    ativa: bool | None,
    semestre_curso: int | None,
    periodo_letivo: str | None,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[dict], int]:
    stmt = select(Turma)
    if not gere_tudo(usuario):
        # Docente enxerga só as turmas em que leciona (plan-e2 D-E2-1).
        minhas = await turmas_que_leciona(session, usuario)
        stmt = stmt.where(Turma.id.in_(minhas) if minhas else false())
    if ativa is not None:
        stmt = stmt.where(Turma.ativa == ativa)
    if semestre_curso is not None:
        stmt = stmt.where(Turma.semestre_curso == semestre_curso)
    if periodo_letivo is not None:
        stmt = stmt.where(Turma.periodo_letivo == periodo_letivo)
    if q:
        termo = f"%{q.strip()}%"
        stmt = stmt.where(or_(Turma.codigo.ilike(termo), Turma.nome.ilike(termo)))
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    turmas = list(
        await session.scalars(
            stmt.order_by(Turma.semestre_curso, Turma.codigo).limit(limit).offset(offset)
        )
    )
    totais = await _totais(session, [t.id for t in turmas])
    return [_com_totais(t, totais.get(t.id, {})) for t in turmas], total


async def obter(session: AsyncSession, usuario: Usuario, turma_id: uuid.UUID) -> dict:
    turma = await session.get(Turma, turma_id)
    if turma is None:
        raise TurmaNaoEncontrada()
    if not gere_tudo(usuario) and not await leciona(session, usuario, turma_id):
        raise SemPermissao()
    return _com_totais(turma, (await _totais(session, [turma.id])).get(turma.id, {}))


async def _gravar(session: AsyncSession, turma: Turma) -> dict:
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        if _UNICO_CODIGO in str(exc.orig):
            raise CodigoTurmaDuplicado() from None
        raise
    await session.refresh(turma)
    return _com_totais(turma, (await _totais(session, [turma.id])).get(turma.id, {}))


async def criar(session: AsyncSession, dados: dict) -> dict:
    turma = Turma(**dados)
    session.add(turma)
    return await _gravar(session, turma)


async def alterar(session: AsyncSession, turma_id: uuid.UUID, dados: dict) -> dict:
    turma = await session.get(Turma, turma_id, with_for_update=True)
    if turma is None:
        raise TurmaNaoEncontrada()
    for campo, valor in dados.items():
        setattr(turma, campo, valor)
    return await _gravar(session, turma)


async def desativar(session: AsyncSession, turma_id: uuid.UUID) -> None:
    """Desativação lógica: vínculos preservados; avisos por turma/semestre deixam de chegar."""
    await alterar(session, turma_id, {"ativa": False})
