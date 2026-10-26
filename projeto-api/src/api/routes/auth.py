import secrets

from fastapi import APIRouter, Depends, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps.csrf import CSRF_COOKIE, verificar_csrf
from src.api.errors import NaoAutenticado
from src.core.config import Settings, get_settings
from src.core.security import (
    SESSION_COOKIE,
    TokenInvalido,
    bearer_scheme,
    decode_access_token,
)
from src.db.session import get_session
from src.providers.auth.base import AuthProvider
from src.providers.auth.factory import get_auth_provider
from src.schemas.auth import LoginRequest, LoginResponse
from src.schemas.usuario import UsuarioOut
from src.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])

_ATRIBUTOS_COOKIE = {"secure": True, "samesite": "strict", "path": "/"}


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_session),
    provider: AuthProvider = Depends(get_auth_provider),
    settings: Settings = Depends(get_settings),
) -> LoginResponse:
    sessao = await auth_service.login(session, provider, body.username, body.password)

    # O app usa o token do corpo; a web, os cookies (RF-32). O de CSRF é legível de propósito.
    max_age = settings.JWT_EXPIRES_SECONDS
    response.set_cookie(
        SESSION_COOKIE, sessao.access_token, max_age=max_age, httponly=True, **_ATRIBUTOS_COOKIE
    )
    response.set_cookie(
        CSRF_COOKIE, secrets.token_urlsafe(32), max_age=max_age, **_ATRIBUTOS_COOKIE
    )
    return LoginResponse(
        access_token=sessao.access_token,
        expires_in=max_age,
        usuario=UsuarioOut.model_validate(sessao.usuario),
    )


@router.delete("/sessao", status_code=status.HTTP_204_NO_CONTENT)
async def encerrar_sessao(
    request: Request,
    response: Response,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> None:
    """Encerra a sessão web sem exigir usuário ativo nem token válido (RF-33).

    O cookie é HttpOnly: só a API consegue apagá-lo. Um usuário desativado num computador
    compartilhado precisa conseguir sair. O CSRF continua exigido, contra logout forçado.
    """
    if credentials is not None:
        # Com Bearer não há o que invalidar: o app descarta o token localmente.
        try:
            decode_access_token(credentials.credentials)
        except TokenInvalido:
            raise NaoAutenticado("Token inválido ou expirado") from None
        return
    if SESSION_COOKIE not in request.cookies:
        raise NaoAutenticado()
    verificar_csrf(request)
    response.delete_cookie(SESSION_COOKIE, httponly=True, **_ATRIBUTOS_COOKIE)
    response.delete_cookie(CSRF_COOKIE, **_ATRIBUTOS_COOKIE)
