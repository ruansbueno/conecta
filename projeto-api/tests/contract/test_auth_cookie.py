"""Sessão por cookie e CSRF por double submit (contracts/api.md §1, §1b; RF-32, RF-33)."""

import pytest

from tests.helpers import login, set_cookies

pytestmark = pytest.mark.mock_auth


async def test_login_emite_cookie_de_sessao_httponly_com_o_mesmo_token(client):
    r = await login(client)

    sessao = set_cookies(r)["conecta_sessao"]
    assert sessao.value == r.json()["access_token"]
    assert sessao["httponly"] is True
    assert sessao["secure"] is True
    assert sessao["samesite"].lower() == "strict"
    assert sessao["path"] == "/"
    assert sessao["max-age"] == "86400"


async def test_login_emite_cookie_csrf_legivel(client):
    r = await login(client)

    csrf = set_cookies(r)["conecta_csrf"]
    assert len(csrf.value) >= 32
    assert csrf.value != r.json()["access_token"]
    assert not csrf["httponly"]
    assert csrf["secure"] is True
    assert csrf["samesite"].lower() == "strict"
    assert csrf["path"] == "/"
    assert csrf["max-age"] == "86400"


async def test_cada_login_gera_um_csrf_novo(client):
    primeiro = set_cookies(await login(client))["conecta_csrf"].value
    segundo = set_cookies(await login(client))["conecta_csrf"].value

    assert primeiro != segundo


async def test_escrita_so_com_cookie_e_csrf_valido_funciona(client):
    await login(client)

    r = await client.delete(
        "/auth/sessao", headers={"X-CSRF-Token": client.cookies["conecta_csrf"]}
    )

    assert r.status_code == 204
    assert r.content == b""


async def test_escrita_por_cookie_sem_csrf_e_403(client):
    await login(client)

    r = await client.delete("/auth/sessao")

    assert r.status_code == 403
    assert r.json()["code"] == "CSRF_INVALIDO"


async def test_escrita_por_cookie_com_csrf_divergente_e_403(client):
    await login(client)

    r = await client.delete("/auth/sessao", headers={"X-CSRF-Token": "outro-valor"})

    assert r.status_code == 403
    assert r.json()["code"] == "CSRF_INVALIDO"


async def test_escrita_por_bearer_nao_exige_csrf_e_nao_mexe_em_cookies(client):
    token = (await login(client)).json()["access_token"]
    client.cookies.clear()

    r = await client.delete("/auth/sessao", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 204
    assert set_cookies(r) == {}


async def test_encerrar_sessao_invalida_os_dois_cookies(client):
    await login(client)

    r = await client.delete(
        "/auth/sessao", headers={"X-CSRF-Token": client.cookies["conecta_csrf"]}
    )

    cookies = set_cookies(r)
    assert cookies["conecta_sessao"]["max-age"] == "0"
    assert cookies["conecta_csrf"]["max-age"] == "0"
    assert "conecta_sessao" not in client.cookies

    depois = await client.delete("/auth/sessao")
    assert depois.status_code == 401
    assert depois.json()["code"] == "NAO_AUTENTICADO"


async def test_encerrar_sessao_sem_autenticacao_e_401(client):
    r = await client.delete("/auth/sessao")

    assert r.status_code == 401
    assert r.json()["code"] == "NAO_AUTENTICADO"


async def test_usuario_desativado_consegue_encerrar_a_sessao_web(client, session_factory):
    # Computador compartilhado: o cookie é HttpOnly, só a API consegue apagá-lo.
    from sqlalchemy import update

    from src.models.usuario import Usuario

    await login(client)
    async with session_factory() as s:
        await s.execute(
            update(Usuario).where(Usuario.username == "aluno.teste").values(ativo=False)
        )
        await s.commit()

    r = await client.delete(
        "/auth/sessao", headers={"X-CSRF-Token": client.cookies["conecta_csrf"]}
    )

    assert r.status_code == 204
    assert set_cookies(r)["conecta_sessao"]["max-age"] == "0"
    assert "conecta_sessao" not in client.cookies


async def test_cookie_de_sessao_expirado_tambem_e_apagado_no_logout(client):
    client.cookies.update({"conecta_sessao": "token-expirado-ou-invalido", "conecta_csrf": "c"})

    r = await client.delete("/auth/sessao", headers={"X-CSRF-Token": "c"})

    assert r.status_code == 204
    assert set_cookies(r)["conecta_sessao"]["max-age"] == "0"


async def test_logout_por_cookie_continua_exigindo_csrf_mesmo_com_token_invalido(client):
    client.cookies.update({"conecta_sessao": "qualquer", "conecta_csrf": "c"})

    r = await client.delete("/auth/sessao")

    assert (r.status_code, r.json()["code"]) == (403, "CSRF_INVALIDO")


async def test_logout_por_bearer_invalido_e_401(client):
    r = await client.delete("/auth/sessao", headers={"Authorization": "Bearer lixo"})

    assert (r.status_code, r.json()["code"]) == (401, "NAO_AUTENTICADO")
