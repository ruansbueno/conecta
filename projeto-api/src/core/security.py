import uuid
from collections.abc import Callable
from datetime import UTC, datetime, timedelta

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import NaoAutenticado, SemPermissao, UsuarioInativo
from src.core.config import get_settings
from src.db.session import get_session
from src.models.usuario import Usuario

ALGORITHM = "HS256"


class TokenInvalido(Exception):
    pass


def create_access_token(usuario_id: uuid.UUID, perfil: str) -> str:
    settings = get_settings()
    exp = datetime.now(UTC) + timedelta(seconds=settings.JWT_EXPIRES_SECONDS)
    # `perfil` é informativo: a autorização usa sempre o perfil do banco (RF-04).
    claims = {"sub": str(usuario_id), "perfil": perfil, "exp": exp}
    return jwt.encode(claims, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID:
    try:
        claims = jwt.decode(
            token,
            get_settings().JWT_SECRET,
            algorithms=[ALGORITHM],
            options={"require": ["sub", "exp"]},
        )
        return uuid.UUID(claims["sub"])
    except (jwt.PyJWTError, ValueError) as exc:
        raise TokenInvalido from exc


_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session: AsyncSession = Depends(get_session),
) -> Usuario:
    if credentials is None:
        raise NaoAutenticado()
    try:
        usuario_id = decode_access_token(credentials.credentials)
    except TokenInvalido:
        raise NaoAutenticado("Token inválido ou expirado") from None

    # Perfil e situação reavaliados no banco a cada requisição (RF-04, RF-07).
    usuario = await session.get(Usuario, usuario_id)
    if usuario is None:
        raise NaoAutenticado("Token inválido ou expirado")
    if not usuario.ativo:
        raise UsuarioInativo()
    return usuario


def require_perfil(*perfis: str) -> Callable:
    async def _dependency(usuario: Usuario = Depends(get_current_user)) -> Usuario:
        if usuario.perfil not in perfis:
            raise SemPermissao()
        return usuario

    return _dependency
