import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import (
    JaVinculado,
    PerfilIncompativel,
    SemPermissao,
    TurmaNaoEncontrada,
    UsuarioNaoEncontrado,
    VinculoNaoEncontrado,
)
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.services.permissoes import gere_tudo, leciona, papel_do_perfil


async def _turma(session: AsyncSession, turma_id: uuid.UUID) -> Turma:
    turma = await session.get(Turma, turma_id)
    if turma is None:
        raise TurmaNaoEncontrada()
    return turma


async def listar(
    session: AsyncSession,
    usuario: Usuario,
    turma_id: uuid.UUID,
    papel: str | None,
    limit: int,
    offset: int,
) -> tuple[list[tuple[VinculoTurma, Usuario]], int]:
    await _turma(session, turma_id)
    # Docente da turma lê os vínculos dela; outros docentes não (contrato §12).
    if not gere_tudo(usuario) and not await leciona(session, usuario, turma_id):
        raise SemPermissao()
    stmt = (
        select(VinculoTurma, Usuario)
        .join(Usuario, Usuario.id == VinculoTurma.usuario_id)
        .where(VinculoTurma.turma_id == turma_id)
    )
    if papel is not None:
        stmt = stmt.where(VinculoTurma.papel == papel)
    total = await session.scalar(select(func.count()).select_from(stmt.subquery()))
    linhas = await session.execute(
        stmt.order_by(VinculoTurma.papel.desc(), Usuario.nome).limit(limit).offset(offset)
    )
    return [(v, u) for v, u in linhas], total


async def vincular(
    session: AsyncSession, gestor: Usuario, turma_id: uuid.UUID, usuario_id: uuid.UUID, papel: str
) -> tuple[VinculoTurma, Usuario]:
    await _turma(session, turma_id)
    usuario = await session.get(Usuario, usuario_id)
    if usuario is None:
        raise UsuarioNaoEncontrado()
    if papel_do_perfil(usuario.perfil) != papel:
        raise PerfilIncompativel(
            f"Perfil {usuario.perfil} não pode ter vínculo de papel {papel} com turma"
        )
    vinculo = VinculoTurma(
        turma_id=turma_id,
        usuario_id=usuario_id,
        papel=papel,
        origem="gestao",
        criado_por=gestor.id,
    )
    session.add(vinculo)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        if "uq_tb_usuario_turma_turma_usuario" in str(exc.orig):
            raise JaVinculado() from None
        raise
    await session.refresh(vinculo)
    return vinculo, usuario


async def desvincular(session: AsyncSession, turma_id: uuid.UUID, usuario_id: uuid.UUID) -> None:
    """Remove o vínculo: o acesso aos avisos da turma acaba na próxima requisição."""
    await _turma(session, turma_id)
    resultado = await session.execute(
        delete(VinculoTurma).where(
            VinculoTurma.turma_id == turma_id, VinculoTurma.usuario_id == usuario_id
        )
    )
    if resultado.rowcount == 0:
        raise VinculoNaoEncontrado()
    await session.commit()
