"""Sessão por cookie e CSRF por double submit assinado (contracts/api.md §1, §1b; RF-32, RF-33)."""

import pytest

from tests.helpers import cookies_web, login, set_cookies

pytestmark = pytest.mark.mock_auth


async def test_login_emite_cookie_de_sessao_httponly_com_o_mesmo_token(client):
    r = await login(client)

    sessao = set_cookies(r)["__Host-conecta_sessao"]
    assert sessao.value == r.json()["access_token"]
    assert sessao["httponly"] is True
    assert sessao["secure"] is True
    assert sessao["samesite"].lower() == "strict"
    assert sessao["path"] == "/"
    assert sessao["max-age"] == "86400"


async def test_cookies_com_prefixo_host(client):
    # __Host- (decisão de 01/11/2026): o navegador só aceita o cookie com Secure, Path=/ e sem
    # Domain, e nenhum subdomínio consegue gravá-lo — ninguém planta nem troca a sessão de fora.
    r = await login(client)

    cookies = set_cookies(r)
    assert set(cookies) == {"__Host-conecta_sessao", "__Host-conecta_csrf"}
    for c in cookies.values():
        assert c["secure"] is True
        assert c["path"] == "/"
        assert not c["domain"]


async def test_login_emite_cookie_csrf_legivel(client):
    r = await login(client)

    csrf = set_cookies(r)["__Host-conecta_csrf"]
    assert len(csrf.value) >= 32
    assert csrf.value != r.json()["access_token"]
    assert not csrf["httponly"]
    assert csrf["secure"] is True
    assert csrf["samesite"].lower() == "strict"
    assert csrf["path"] == "/"
    assert csrf["max-age"] == "86400"


async def test_csrf_tem_valor_aleatorio_e_assinatura(client):
    r = await login(client)

    aleatorio, _, assinatura = set_cookies(r)["__Host-conecta_csrf"].value.partition(".")
    assert len(aleatorio) >= 32
    assert len(assinatura) == 64  # HMAC-SHA256 em hexadecimal


async def test_cada_login_gera_um_csrf_novo(client):
    primeiro = set_cookies(await login(client))["__Host-conecta_csrf"].value
    segundo = set_cookies(await login(client))["__Host-conecta_csrf"].value

    assert primeiro != segundo


async def test_escrita_so_com_cookie_e_csrf_valido_funciona(client):
    await login(client)

    r = await client.delete(
        "/auth/sessao", headers={"X-CSRF-Token": client.cookies["__Host-conecta_csrf"]}
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


async def _sessao_de(client, username):
    await login(client, username=username)
    return client.cookies["__Host-conecta_sessao"], client.cookies["__Host-conecta_csrf"]


async def test_csrf_de_outra_sessao_e_403(client):
    # Quem planta um cookie no domínio usa o próprio par válido: a assinatura o prende à sessão.
    _, csrf_do_atacante = await _sessao_de(client, "aluno2.teste")
    sessao_da_vitima, _ = await _sessao_de(client, "aluno.teste")
    client.cookies.clear()
    client.cookies.update(
        {"__Host-conecta_sessao": sessao_da_vitima, "__Host-conecta_csrf": csrf_do_atacante}
    )

    r = await client.delete("/auth/sessao", headers={"X-CSRF-Token": csrf_do_atacante})

    assert (r.status_code, r.json()["code"]) == (403, "CSRF_INVALIDO")


@pytest.mark.parametrize(
    "adulterar",
    [
        lambda t: t.split(".")[0],
        lambda t: t[:-1] + ("0" if t[-1] != "0" else "1"),
        lambda t: "outro-aleatorio." + t.split(".")[1],
        lambda t: "valor-qualquer-sem-assinatura",
    ],
    ids=["sem-assinatura", "assinatura-adulterada", "aleatorio-trocado", "nao-assinado"],
)
async def test_csrf_que_nao_corresponde_a_sessao_e_403_mesmo_igual_ao_cabecalho(client, adulterar):
    await login(client)
    falso = adulterar(client.cookies["__Host-conecta_csrf"])
    client.cookies.set("__Host-conecta_csrf", falso)

    r = await client.delete("/auth/sessao", headers={"X-CSRF-Token": falso})

    assert (r.status_code, r.json()["code"]) == (403, "CSRF_INVALIDO")


async def test_escrita_por_bearer_nao_exige_csrf_e_nao_mexe_em_cookies(client):
    token = (await login(client)).json()["access_token"]
    client.cookies.clear()

    r = await client.delete("/auth/sessao", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 204
    assert set_cookies(r) == {}


async def test_encerrar_sessao_invalida_os_dois_cookies(client):
    await login(client)

    r = await client.delete(
        "/auth/sessao", headers={"X-CSRF-Token": client.cookies["__Host-conecta_csrf"]}
    )

    cookies = set_cookies(r)
    assert cookies["__Host-conecta_sessao"]["max-age"] == "0"
    assert cookies["__Host-conecta_csrf"]["max-age"] == "0"
    assert "__Host-conecta_sessao" not in client.cookies

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
        "/auth/sessao", headers={"X-CSRF-Token": client.cookies["__Host-conecta_csrf"]}
    )

    assert r.status_code == 204
    assert set_cookies(r)["__Host-conecta_sessao"]["max-age"] == "0"
    assert "__Host-conecta_sessao" not in client.cookies


async def test_cookie_de_sessao_expirado_tambem_e_apagado_no_logout(client):
    client.cookies.update(cookies_web("token-expirado-ou-invalido"))

    r = await client.delete(
        "/auth/sessao", headers={"X-CSRF-Token": client.cookies["__Host-conecta_csrf"]}
    )

    assert r.status_code == 204
    assert set_cookies(r)["__Host-conecta_sessao"]["max-age"] == "0"


async def test_logout_por_cookie_continua_exigindo_csrf_mesmo_com_token_invalido(client):
    client.cookies.update(cookies_web("qualquer"))
    sem = await client.delete("/auth/sessao")

    client.cookies.set("__Host-conecta_csrf", "c")
    nao_assinado = await client.delete("/auth/sessao", headers={"X-CSRF-Token": "c"})

    assert (sem.status_code, sem.json()["code"]) == (403, "CSRF_INVALIDO")
    assert (nao_assinado.status_code, nao_assinado.json()["code"]) == (403, "CSRF_INVALIDO")


async def test_logout_com_csrf_invalido_recusa_mas_apaga_os_cookies(client):
    # Sair nunca deixa a sessão no navegador (decisão de 01/11/2026): a API responde 403, mas
    # manda expirar os dois cookies. Um site de fora só conseguiria deslogar a pessoa.
    await login(client)

    r = await client.delete("/auth/sessao", headers={"X-CSRF-Token": "forjado"})

    assert (r.status_code, r.json()["code"]) == (403, "CSRF_INVALIDO")
    cookies = set_cookies(r)
    assert cookies["__Host-conecta_sessao"]["max-age"] == "0"
    assert cookies["__Host-conecta_csrf"]["max-age"] == "0"
    assert "__Host-conecta_sessao" not in client.cookies


async def test_logout_por_bearer_invalido_e_401(client):
    r = await client.delete("/auth/sessao", headers={"Authorization": "Bearer lixo"})

    assert (r.status_code, r.json()["code"]) == (401, "NAO_AUTENTICADO")
