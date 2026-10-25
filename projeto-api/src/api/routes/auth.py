import secrets

from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps.csrf import CSRF_COOKIE
from src.core.config import Settings, get_settings
from src.core.security import SESSION_COOKIE, get_current_user
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


@router.delete(
    "/sessao",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(get_current_user)],
)
async def encerrar_sessao(request: Request, response: Response) -> None:
    # Com Bearer não há o que invalidar: o app descarta o token localmente.
    if request.state.auth_via == "cookie":
        response.delete_cookie(SESSION_COOKIE, httponly=True, **_ATRIBUTOS_COOKIE)
        response.delete_cookie(CSRF_COOKIE, **_ATRIBUTOS_COOKIE)
