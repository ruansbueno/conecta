"""Dados fictícios de desenvolvimento: `python -m scripts.seed_dev_data`.

Cria (ou restaura) os usuários de teste do MockMoodleAuthProvider com seus perfis. Na E1 o
perfil só muda por aqui; na E2, pelo administrador (RF-08). Pode ser executado várias vezes.
"""

import asyncio

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_sessionmaker
from src.models.usuario import Usuario
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


async def seed(session: AsyncSession) -> None:
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
    await session.commit()


async def main() -> None:
    async with get_sessionmaker()() as session:
        await seed(session)
    print(f"Seed concluído: {len(PERFIS_TESTE)} usuários de teste (senha: senha-teste).")


if __name__ == "__main__":
    asyncio.run(main())
