"""Define o primeiro administrador quando o login é pela API do IFSul (emenda v2.3).

O `admin.conecta` do seed é fictício e não existe no Active Directory do IFSul. Rodado no servidor,
este script cria (ou promove) a pessoa com aquele login institucional como administradora; ela
entra normalmente e, daí em diante, libera os demais pela gestão. Quem já existe é promovido e
reativado; um pedido de acesso pendente ou recusado é liberado sem registrar decisor (a decisão é
de quem roda o script no servidor).

Uso: `python -m scripts.definir_administrador <login.institucional>`
"""

import argparse
import asyncio
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_sessionmaker
from src.models.usuario import Usuario
from src.repositories.usuario_repository import UsuarioRepository


async def definir_administrador(session: AsyncSession, login: str) -> Usuario:
    username = login.strip().lower()  # como o provedor do IFSul grava o login
    if not username:
        raise ValueError("informe o login institucional")
    usuario = await UsuarioRepository(session).get_by_username(username)
    if usuario is None:
        # O nome real chega no 1º login (sincronizado pelo provedor).
        usuario = Usuario(username=username, nome=username)
        session.add(usuario)
    usuario.perfil = "administrador"
    usuario.situacao_acesso = "liberado"
    usuario.ativo = True
    usuario.atualizado_em = datetime.now(UTC)
    await session.commit()
    return usuario


async def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("login", help="login institucional do IFSul")
    args = parser.parse_args()
    async with get_sessionmaker()() as session:
        usuario = await definir_administrador(session, args.login)
    print(f"{usuario.username} agora é administrador do CONECTA.")


if __name__ == "__main__":
    asyncio.run(main())
