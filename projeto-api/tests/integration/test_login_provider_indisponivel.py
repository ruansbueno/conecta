"""Falha do provedor vira falha de autenticação genérica (RF-06)."""

import httpx
import pytest

from src.core.config import Settings
from src.providers.auth.factory import get_auth_provider, provider_from_settings
from src.providers.auth.ifsul import IfsulAuthProvider
from src.providers.auth.mock import MockAuthProvider
from tests.helpers import login

RESPOSTA_GENERICA = {"detail": "Usuário ou senha inválidos", "code": "CREDENCIAIS_INVALIDAS"}


class _ProvedorQuebrado:
    def __init__(self, exc: Exception):
        self.exc = exc

    async def authenticate(self, username, password):
        raise self.exc


@pytest.mark.parametrize(
    "exc",
    [
        ConnectionError("autenticacao.ifsul fora do ar"),
        TimeoutError("timeout após 10s"),
        RuntimeError("resposta inesperada: <html>"),
    ],
)
async def test_provedor_com_erro_responde_401_generico(app, client, exc):
    app.dependency_overrides[get_auth_provider] = lambda: _ProvedorQuebrado(exc)

    r = await login(client)

    assert r.status_code == 401
    assert r.json() == RESPOSTA_GENERICA
    assert str(exc) not in r.text


def _api_do_ifsul(responder):
    return IfsulAuthProvider(
        "https://autenticacao.ifsul.test/api/v1/autenticacoes",
        transport=httpx.MockTransport(responder),
    )


def _fora_do_ar(request):
    raise httpx.ConnectError("conexão recusada")


@pytest.mark.parametrize(
    "responder",
    [
        _fora_do_ar,
        lambda r: httpx.Response(503, text="Service Unavailable"),
        lambda r: httpx.Response(200, text="<html>portal</html>"),
    ],
    ids=["fora-do-ar", "503", "html"],
)
async def test_api_do_ifsul_indisponivel_ou_fora_do_contrato_responde_401_generico(
    app, client, responder
):
    app.dependency_overrides[get_auth_provider] = lambda: _api_do_ifsul(responder)

    r = await login(client)

    assert r.status_code == 401
    assert r.json() == RESPOSTA_GENERICA


def test_mock_e_escolhido_pela_configuracao():
    settings = Settings(
        DATABASE_URL="postgresql+asyncpg://x", JWT_SECRET="s" * 32, CSRF_SECRET="c" * 32
    )

    assert isinstance(provider_from_settings(settings), MockAuthProvider)
