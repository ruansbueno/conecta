"""Contrato de GET /me (contracts/api.md §2; RF-05, RF-11)."""

import pytest
from sqlalchemy import update

from src.models.usuario import Usuario
from tests.helpers import login

pytestmark = pytest.mark.mock_auth


async def _bearer(client, username="aluno.teste"):
    return {"Authorization": f"Bearer {(await login(client, username)).json()['access_token']}"}


async def test_me_devolve_os_dados_do_usuario_autenticado(client):
    headers = await _bearer(client)

    r = await client.get("/me", headers=headers)

    assert r.status_code == 200
    body = r.json()
    assert set(body) == {"id", "username", "nome", "perfil", "turmas"}
    assert body["username"] == "aluno.teste"
    assert body["nome"] == "Aluno de Teste"
    assert body["perfil"] == "aluno"
    assert body["turmas"] == []


async def test_me_funciona_com_cookie_de_sessao(client):
    await login(client)

    r = await client.get("/me")

    assert r.status_code == 200
    assert r.json()["username"] == "aluno.teste"


async def test_me_sem_autenticacao_e_401(client):
    r = await client.get("/me")

    assert r.status_code == 401
    assert r.json()["code"] == "NAO_AUTENTICADO"


async def test_me_de_usuario_desativado_e_403(client, session_factory):
    headers = await _bearer(client)
    async with session_factory() as s:
        await s.execute(
            update(Usuario).where(Usuario.username == "aluno.teste").values(ativo=False)
        )
        await s.commit()

    r = await client.get("/me", headers=headers)

    assert r.status_code == 403
    assert r.json()["code"] == "USUARIO_INATIVO"
