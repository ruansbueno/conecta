"""Contrato de POST /auth/login (contracts/api.md §1; RF-01, RF-05, RF-07)."""

import uuid

import pytest

from src.core.security import decode_access_token
from tests.helpers import criar_usuario, login, set_cookies

pytestmark = pytest.mark.mock_auth


async def test_login_valido_devolve_token_e_usuario(client):
    r = await login(client)

    assert r.status_code == 200
    body = r.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 86400
    assert set(body["usuario"]) == {"id", "username", "nome", "perfil"}
    assert body["usuario"]["username"] == "aluno.teste"
    assert body["usuario"]["nome"] == "Aluno de Teste"
    assert body["usuario"]["perfil"] == "aluno"
    assert decode_access_token(body["access_token"]) == uuid.UUID(body["usuario"]["id"])


async def test_login_devolve_o_perfil_do_banco(client, db):
    await criar_usuario(db, username="coord.teste", nome="Coordenação", perfil="coordenacao")

    r = await login(client, "coord.teste")

    assert r.json()["usuario"]["perfil"] == "coordenacao"


@pytest.mark.parametrize(
    ("username", "password"),
    [("aluno.teste", "senha-errada"), ("ninguem.teste", "senha-teste")],
)
async def test_credenciais_invalidas_tem_resposta_unica(client, username, password):
    r = await login(client, username, password)

    assert r.status_code == 401
    assert r.json() == {"detail": "Usuário ou senha inválidos", "code": "CREDENCIAIS_INVALIDAS"}
    assert set_cookies(r) == {}


async def test_usuario_desativado_nao_entra(client, db):
    await criar_usuario(db, username="aluno.teste", nome="Aluno de Teste", ativo=False)

    r = await login(client)

    assert r.status_code == 403
    assert r.json()["code"] == "USUARIO_INATIVO"
    assert set_cookies(r) == {}


async def test_usuario_desativado_com_senha_errada_recebe_401(client, db):
    await criar_usuario(db, username="aluno.teste", nome="Aluno de Teste", ativo=False)

    r = await login(client, password="senha-errada")

    assert r.status_code == 401
    assert r.json()["code"] == "CREDENCIAIS_INVALIDAS"


@pytest.mark.parametrize(
    ("payload", "campo"),
    [
        ({"password": "senha-teste"}, "username"),
        ({"username": "aluno.teste"}, "password"),
        ({"username": "", "password": "senha-teste"}, "username"),
        ({"username": "aluno.teste", "password": ""}, "password"),
        ({"username": "a" * 101, "password": "senha-teste"}, "username"),
        ({"username": "aluno.teste", "password": "s" * 201}, "password"),
        ({"username": 123, "password": "senha-teste"}, "username"),
    ],
)
async def test_corpo_invalido_e_422(client, payload, campo):
    r = await client.post("/auth/login", json=payload)

    assert r.status_code == 422
    body = r.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert campo in {e["campo"] for e in body["errors"]}


async def test_corpo_que_nao_e_json_e_422(client):
    r = await client.post(
        "/auth/login", content="nao-json", headers={"Content-Type": "application/json"}
    )

    assert r.status_code == 422
    assert r.json()["code"] == "VALIDATION_ERROR"
