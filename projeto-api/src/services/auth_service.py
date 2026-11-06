import logging
from dataclasses import dataclass

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import AcessoPendente, AcessoRecusado, CredenciaisInvalidas, UsuarioInativo
from src.core.security import create_access_token
from src.models.usuario import Usuario
from src.providers.auth.base import AuthProvider
from src.providers.auth.ifsul import FalhaDoProvedor
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
        # A mensagem de FalhaDoProvedor é segura por construção (status ou tipo, nunca o corpo).
        motivo = f": {exc}" if isinstance(exc, FalhaDoProvedor) else ""
        logger.error("Falha no provedor de autenticação: %s%s", type(exc).__name__, motivo)
        raise CredenciaisInvalidas() from None
    if autenticado is None:
        raise CredenciaisInvalidas()

    repo = UsuarioRepository(session)
    existente = await repo.get_by_username(autenticado.username)
    if existente is not None and not existente.ativo:
        raise UsuarioInativo()

    usuario = await repo.upsert_from_provider(autenticado)
    # Grava antes de recusar: o pedido de acesso (e o nome e o e-mail atualizados) ficam
    # registrados para a administração ou a coordenação decidir (RF-08, emenda v2.3).
    await session.commit()
    if usuario.situacao_acesso == "pendente":
        raise AcessoPendente()
    if usuario.situacao_acesso == "recusado":
        raise AcessoRecusado()
    return Sessao(create_access_token(usuario.id, usuario.perfil), usuario)
