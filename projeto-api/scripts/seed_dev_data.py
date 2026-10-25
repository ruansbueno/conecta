"""Dados fictícios de desenvolvimento: `python -m scripts.seed_dev_data`.

Cria (ou restaura) os usuários de teste do MockMoodleAuthProvider com seus perfis, as turmas
A, B, C (3º semestre) e D (5º), vínculos e solicitações de exemplo. Na E1 o perfil só muda por
aqui; na E2, pelo administrador (RF-08). Pode ser executado várias vezes.
"""

import asyncio
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_sessionmaker
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.providers.auth.mock_moodle import USUARIOS_TESTE

PERFIS_TESTE: dict[str, str] = {
    "admin.conecta": "administrador",  # administrador de implantação
    "admin.teste": "administrador",
    "coord.teste": "coordenacao",
    "docente.teste": "docente",
    "aluno.teste": "aluno",
    "aluno2.teste": "aluno",
    "aluno3.teste": "aluno",
    "aluno.sem.turma": "aluno",
}


# codigo: (nome, semestre_curso, inscricoes_abertas)
TURMAS_TESTE: dict[str, tuple[str, int, bool]] = {
    "TADS-3A-2026-2": ("TADS 3º Sem A", 3, False),
    "TADS-3B-2026-2": ("TADS 3º Sem B", 3, True),
    "TADS-3C-2026-2": ("TADS 3º Sem C", 3, True),
    "TADS-5A-2026-2": ("TADS 5º Sem A", 5, True),
}

# (username, codigo da turma, papel)
VINCULOS_TESTE = [
    ("aluno.teste", "TADS-3A-2026-2", "aluno"),
    ("aluno2.teste", "TADS-3A-2026-2", "aluno"),
    ("aluno2.teste", "TADS-3B-2026-2", "aluno"),
    ("aluno3.teste", "TADS-3C-2026-2", "aluno"),
    ("docente.teste", "TADS-3A-2026-2", "docente"),
    ("docente.teste", "TADS-5A-2026-2", "docente"),
]

# (username, codigo da turma, status, motivo_recusa)
SOLICITACOES_TESTE = [
    ("aluno.teste", "TADS-3B-2026-2", "pendente", None),
    ("aluno3.teste", "TADS-3B-2026-2", "recusada", "Turma completa"),
]


async def seed(session: AsyncSession) -> None:
    await _usuarios(session)
    await _turmas(session)
    await session.flush()
    usuarios = dict((await session.execute(select(Usuario.username, Usuario.id))).all())
    turmas = dict((await session.execute(select(Turma.codigo, Turma.id))).all())
    await _vinculos(session, usuarios, turmas)
    await _solicitacoes(session, usuarios, turmas)
    await session.commit()


async def _usuarios(session: AsyncSession) -> None:
    for username, perfil in PERFIS_TESTE.items():
        stmt = insert(Usuario).values(
            username=username, nome=USUARIOS_TESTE[username], perfil=perfil
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Usuario.username],
            set_={
                "nome": stmt.excluded.nome,
                "perfil": stmt.excluded.perfil,
                "ativo": True,
                "atualizado_em": func.now(),
            },
        )
        await session.execute(stmt)


async def _turmas(session: AsyncSession) -> None:
    for codigo, (nome, semestre, abertas) in TURMAS_TESTE.items():
        stmt = insert(Turma).values(
            codigo=codigo,
            nome=nome,
            semestre_curso=semestre,
            periodo_letivo="2026/2",
            inscricoes_abertas=abertas,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Turma.codigo],
            set_={
                "nome": stmt.excluded.nome,
                "semestre_curso": stmt.excluded.semestre_curso,
                "inscricoes_abertas": stmt.excluded.inscricoes_abertas,
                "ativa": True,
            },
        )
        await session.execute(stmt)


async def _vinculos(session: AsyncSession, usuarios: dict, turmas: dict) -> None:
    for username, codigo, papel in VINCULOS_TESTE:
        stmt = insert(VinculoTurma).values(
            turma_id=turmas[codigo], usuario_id=usuarios[username], papel=papel, origem="seed"
        )
        await session.execute(stmt.on_conflict_do_nothing())


async def _solicitacoes(session: AsyncSession, usuarios: dict, turmas: dict) -> None:
    for username, codigo, status, motivo in SOLICITACOES_TESTE:
        aluno_id, turma_id = usuarios[username], turmas[codigo]
        ja_existe = await session.scalar(
            select(SolicitacaoInscricao.id)
            .where(
                SolicitacaoInscricao.aluno_id == aluno_id,
                SolicitacaoInscricao.turma_id == turma_id,
            )
            .limit(1)
        )
        if ja_existe is None:
            session.add(
                SolicitacaoInscricao(
                    turma_id=turma_id,
                    aluno_id=aluno_id,
                    status=status,
                    motivo_recusa=motivo,
                    decidida_em=None if status == "pendente" else datetime.now(UTC),
                )
            )


async def main() -> None:
    async with get_sessionmaker()() as session:
        await seed(session)
    print(
        f"Seed concluído: {len(PERFIS_TESTE)} usuários de teste (senha: senha-teste), "
        f"{len(TURMAS_TESTE)} turmas, {len(VINCULOS_TESTE)} vínculos."
    )


if __name__ == "__main__":
    asyncio.run(main())
