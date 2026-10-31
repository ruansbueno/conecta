"""Nenhuma senha é logada, serializada ou persistida (Princípio II; T071)."""

import logging

import pytest
from sqlalchemy import text

from src.providers.auth.factory import get_auth_provider
from tests.helpers import login

SENHA = "S3nh@-Secreta-Do-Teste"


class _ProvedorQueVazaNaMensagem:
    async def authenticate(self, username, password):
        # Como um cliente HTTP faria ao falhar numa URL com a senha na query string.
        raise ConnectionError(
            f"GET https://moodle.ifsul/login/token.php?username={username}&password={password}"
        )


async def test_falha_do_provedor_nao_grava_a_senha_no_log(app, client, caplog):
    app.dependency_overrides[get_auth_provider] = _ProvedorQueVazaNaMensagem
    caplog.set_level(logging.DEBUG)

    r = await login(client, password=SENHA)

    assert r.status_code == 401
    assert SENHA not in caplog.text
    assert "ConnectionError" in caplog.text  # o tipo da falha continua diagnosticável


async def test_erro_de_validacao_nao_ecoa_a_senha(client):
    r = await client.post("/auth/login", json={"username": "x" * 101, "password": SENHA})

    assert r.status_code == 422
    assert SENHA not in r.text


@pytest.mark.mock_auth
async def test_login_nao_persiste_a_senha_em_nenhuma_coluna(client, db):
    from src.providers.auth.mock_moodle import SENHA_TESTE

    await login(client)

    linhas = (await db.execute(text("SELECT row_to_json(u)::text FROM tb_usuario u"))).scalars()
    assert all(SENHA_TESTE not in linha for linha in linhas)


@pytest.mark.mock_auth
async def test_resposta_do_login_nao_contem_a_senha(client):
    from src.providers.auth.mock_moodle import SENHA_TESTE

    r = await login(client)

    assert SENHA_TESTE not in r.text
    assert all(SENHA_TESTE not in v for v in r.headers.values())
