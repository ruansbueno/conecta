"""Aprova uma solicitação de inscrição enquanto o endpoint de gestão (E2) não existe.

Uso: `python -m scripts.aprovar_solicitacao <solicitacao_id> [--decisor admin.conecta]`
"""

import argparse
import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import SolicitacaoNaoEncontrada
from src.db.session import get_sessionmaker
from src.models.vinculo_turma import VinculoTurma
from src.repositories.solicitacao_repository import SolicitacaoRepository
from src.repositories.usuario_repository import UsuarioRepository


async def aprovar(
    session: AsyncSession, solicitacao_id: uuid.UUID | str, decisor_username: str | None
) -> VinculoTurma:
    decisor_id = None
    if decisor_username is not None:
        decisor = await UsuarioRepository(session).get_by_username(decisor_username)
        decisor_id = decisor.id if decisor else None

    repo = SolicitacaoRepository(session)
    solicitacao = await repo.get(uuid.UUID(str(solicitacao_id)), for_update=True)
    if solicitacao is None:
        raise SolicitacaoNaoEncontrada()
    vinculo = await repo.approve(solicitacao, decisor_id)
    await session.commit()
    return vinculo


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solicitacao_id", type=uuid.UUID)
    parser.add_argument("--decisor", default="admin.conecta")
    args = parser.parse_args()
    async with get_sessionmaker()() as session:
        vinculo = await aprovar(session, args.solicitacao_id, args.decisor)
    print(f"Solicitação aprovada; vínculo {vinculo.id} criado.")


if __name__ == "__main__":
    asyncio.run(main())
