import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import CredenciaisInvalidas, UsuarioInativo
from src.core.security import create_access_token
from src.models.usuario import Usuario
from src.providers.auth.base import AuthProvider
from src.repositories.usuario_repository import UsuarioRepository

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Sessao:
    access_token: str
    usuario: Usuario


async def login(
    session: AsyncSession, provider: AuthProvider, username: str, password: str
) -> Sessao:
    try:
        autenticado = await provider.authenticate(username, password)
    except Exception as exc:
        # Indisponibilidade do provedor não é revelada ao cliente (RF-06). Só o tipo vai ao log:
        # a mensagem de um erro HTTP pode trazer a URL com a senha (Princípio II).
        logger.error("Falha no provedor de autenticação: %s", type(exc).__name__)
        raise CredenciaisInvalidas() from None
    if autenticado is None:
        raise CredenciaisInvalidas()

    repo = UsuarioRepository(session)
    existente = await repo.get_by_username(autenticado.username)
    if existente is not None and not existente.ativo:
        raise UsuarioInativo()

    usuario = await repo.upsert_from_provider(autenticado.username, autenticado.nome)
    await session.commit()
    return Sessao(create_access_token(usuario.id, usuario.perfil), usuario)
