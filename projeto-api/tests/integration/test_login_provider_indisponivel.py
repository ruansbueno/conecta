"""Falha do provedor vira falha de autenticação genérica (RF-06)."""

import pytest

from src.core.config import Settings
from src.providers.auth.factory import get_auth_provider, provider_from_settings
from src.providers.auth.mock_moodle import MockMoodleAuthProvider
from src.providers.auth.moodle import MoodleAuthProvider
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
        ConnectionError("moodle.ifsul fora do ar"),
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


async def test_stub_do_moodle_configurado_responde_401_generico(app, client):
    app.dependency_overrides[get_auth_provider] = MoodleAuthProvider

    r = await login(client)

    assert r.status_code == 401
    assert r.json() == RESPOSTA_GENERICA


def test_mock_e_escolhido_pela_configuracao():
    settings = Settings(DATABASE_URL="postgresql+asyncpg://x", JWT_SECRET="s" * 32)

    assert isinstance(provider_from_settings(settings), MockMoodleAuthProvider)
