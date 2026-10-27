"""Regras de permissão da gestão (spec §2.3) que dependem de vínculo, não só de perfil."""

import uuid

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma

PERFIS_GESTAO = ("administrador", "coordenacao")


def gere_tudo(usuario: Usuario) -> bool:
    """Administração e coordenação agem sobre qualquer turma ou aviso."""
    return usuario.perfil in PERFIS_GESTAO


async def leciona(session: AsyncSession, usuario: Usuario, turma_id: uuid.UUID) -> bool:
    """Docente com vínculo de papel docente na turma."""
    if usuario.perfil != "docente":
        return False
    return bool(
        await session.scalar(
            select(
                exists().where(
                    VinculoTurma.turma_id == turma_id,
                    VinculoTurma.usuario_id == usuario.id,
                    VinculoTurma.papel == "docente",
                )
            )
        )
    )


async def turmas_que_leciona(session: AsyncSession, usuario: Usuario) -> set[uuid.UUID]:
    if usuario.perfil != "docente":
        return set()
    ids = await session.scalars(
        select(VinculoTurma.turma_id).where(
            VinculoTurma.usuario_id == usuario.id, VinculoTurma.papel == "docente"
        )
    )
    return set(ids)


def papel_do_perfil(perfil: str) -> str | None:
    """Papel de vínculo compatível com o perfil; administração e coordenação não têm vínculo."""
    return {"aluno": "aluno", "docente": "docente"}.get(perfil)


async def papeis_de_vinculo(session: AsyncSession, usuario_id: uuid.UUID) -> set[str]:
    papeis = await session.scalars(
        select(VinculoTurma.papel).where(VinculoTurma.usuario_id == usuario_id).distinct()
    )
    return set(papeis)
