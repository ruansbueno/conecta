"""Aprova uma solicitação de inscrição enquanto o endpoint de gestão (E2) não existe.

Uso: `python -m scripts.aprovar_solicitacao <solicitacao_id> [--decisor admin.conecta]`
"""

import argparse
import asyncio
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import UsuarioNaoEncontrado
from src.db.session import get_sessionmaker
from src.repositories.usuario_repository import UsuarioRepository
from src.services import solicitacoes_gestao_service


async def aprovar(session: AsyncSession, solicitacao_id: uuid.UUID | str, decisor_username: str):
    """Mesmo serviço do endpoint de gestão (plan-e2 D-E2-10), com as mesmas regras.

    O decisor é obrigatório: toda decisão registra quem decidiu (ck_..._decisor_coerente).
    """
    decisor = None
    if decisor_username:
        decisor = await UsuarioRepository(session).get_by_username(decisor_username)
    if decisor is None:
        raise UsuarioNaoEncontrado()
    return await solicitacoes_gestao_service.aprovar(
        session, decisor, uuid.UUID(str(solicitacao_id))
    )


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solicitacao_id", type=uuid.UUID)
    parser.add_argument("--decisor", default="admin.conecta")
    args = parser.parse_args()
    async with get_sessionmaker()() as session:
        await aprovar(session, args.solicitacao_id, args.decisor)
    print("Solicitação aprovada; vínculo criado.")


if __name__ == "__main__":
    asyncio.run(main())
