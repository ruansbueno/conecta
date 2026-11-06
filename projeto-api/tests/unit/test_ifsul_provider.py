"""IfsulAuthProvider contra a API de autenticação do IFSul (doc "Orientações para integração do
Conecta com a API de autenticação do IFSUL", 2026) e as respostas obtidas na sondagem de 06/11/2026.

Sem rede: um transporte HTTP falso responde como a API real.
"""

import asyncio
import json
import logging

import httpx
import pytest

from src.providers.auth.base import AuthenticatedUser
from src.providers.auth.ifsul import FalhaDoProvedor, IfsulAuthProvider

URL = "https://autenticacao.ifsul.test/api/v1/autenticacoes"
SENHA = "Senha-Institucional-123"


def _sucesso(usuario="Fulano.Silva", nome="Fulano da Silva", email="f@ifsul.edu.br", tipo="aluno"):
    corpo = {"usuario": usuario, "nome": nome, "tipo_usuario": tipo}
    if email is not None:
        corpo["email"] = email
    return httpx.Response(200, json={"sucesso": True, "autenticado": True, "usuario": corpo})


CREDENCIAIS_INVALIDAS = httpx.Response(
    401, json={"sucesso": False, "autenticado": False, "codigo": "CREDENCIAIS_INVALIDAS"}
)
DADOS_INVALIDOS = httpx.Response(
    400,
    json={"sucesso": False, "codigo": "DADOS_INVALIDOS", "mensagem": "Informe usuário e senha."},
)


def provedor(responder):
    pedidos: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        pedidos.append(request)
        return responder(request) if callable(responder) else responder

    return IfsulAuthProvider(URL, transport=httpx.MockTransport(handler)), pedidos


async def test_envia_post_json_com_usuario_e_senha_no_corpo_nunca_na_url():
    p, pedidos = provedor(_sucesso())

    await p.authenticate("fulano.silva", SENHA)

    pedido = pedidos[0]
    assert pedido.method == "POST"
    assert str(pedido.url) == URL
    assert SENHA not in str(pedido.url)
    assert pedido.headers["content-type"] == "application/json"
    assert pedido.headers["accept"] == "application/json"
    assert json.loads(pedido.content) == {"usuario": "fulano.silva", "senha": SENHA}


async def test_credenciais_validas_identificam_o_usuario_com_email_e_tipo():
    p, _ = provedor(_sucesso(tipo="administrativo"))

    usuario = await p.authenticate("fulano.silva", SENHA)

    assert usuario == AuthenticatedUser(
        username="fulano.silva",
        nome="Fulano da Silva",
        email="f@ifsul.edu.br",
        tipo_institucional="administrativo",
    )


async def test_login_vem_da_resposta_normalizado_em_minusculas():
    # O AD aceita o login com outra caixa; um mesmo servidor não pode virar duas contas.
    p, _ = provedor(_sucesso(usuario="  Fulano.Silva "))

    usuario = await p.authenticate("FULANO.SILVA", SENHA)

    assert usuario.username == "fulano.silva"


async def test_email_ausente_ou_vazio_fica_nulo():
    p, _ = provedor(_sucesso(email=None))
    assert (await p.authenticate("f", SENHA)).email is None

    p, _ = provedor(_sucesso(email=""))
    assert (await p.authenticate("f", SENHA)).email is None


async def test_tipo_desconhecido_fica_nulo_e_e_tratado_como_nao_aluno():
    p, _ = provedor(_sucesso(tipo="terceirizado"))

    assert (await p.authenticate("f", SENHA)).tipo_institucional is None


async def test_401_credenciais_invalidas_nao_autentica():
    p, _ = provedor(CREDENCIAIS_INVALIDAS)

    assert await p.authenticate("fulano.silva", "errada") is None


async def test_400_dados_invalidos_nao_autentica():
    p, _ = provedor(DADOS_INVALIDOS)

    assert await p.authenticate("fulano.silva", " ") is None


async def test_200_com_autenticado_falso_nao_autentica():
    p, _ = provedor(httpx.Response(200, json={"sucesso": True, "autenticado": False}))

    assert await p.authenticate("f", SENHA) is None


@pytest.mark.parametrize(
    "resposta",
    [
        httpx.Response(500, text="Internal Server Error"),
        httpx.Response(503, json={"sucesso": False}),
        httpx.Response(400, json={"sucesso": False, "codigo": "JSON_INVALIDO"}),
        httpx.Response(200, text="<html>portal cativo</html>"),
        httpx.Response(200, json=[1, 2]),
        httpx.Response(200, json={"sucesso": False, "autenticado": True, "usuario": {}}),
        httpx.Response(200, json={"sucesso": True, "autenticado": True}),
        httpx.Response(200, json={"sucesso": True, "autenticado": True, "usuario": {"nome": "X"}}),
        httpx.Response(
            200, json={"sucesso": True, "autenticado": True, "usuario": {"usuario": "x", "nome": 1}}
        ),
        httpx.Response(302, headers={"location": "https://login.ifsul/"}),
    ],
    ids=[
        "500",
        "503",
        "400-json-invalido",
        "html",
        "lista",
        "sucesso-falso",
        "sem-usuario",
        "sem-login",
        "nome-nao-texto",
        "redirecionamento",
    ],
)
async def test_resposta_inesperada_e_falha_do_provedor(resposta):
    p, _ = provedor(resposta)

    with pytest.raises(FalhaDoProvedor):
        await p.authenticate("f", SENHA)


@pytest.mark.parametrize(
    "erro",
    [
        httpx.ConnectError("conexão recusada"),
        httpx.ConnectTimeout("demorou"),
        httpx.ReadTimeout("demorou"),
    ],
)
async def test_indisponibilidade_e_falha_do_provedor(erro):
    def falhar(request):
        raise erro

    p, _ = provedor(falhar)

    with pytest.raises(FalhaDoProvedor):
        await p.authenticate("f", SENHA)


async def test_tempos_limite_seguem_a_doc():
    p = IfsulAuthProvider(URL)

    assert p.timeout.connect == 5
    assert p.timeout.read == 15


async def test_a_senha_nunca_aparece_na_falha_nem_no_log(caplog):
    def ecoar(request):
        # Um servidor que devolve o corpo recebido na mensagem de erro.
        return httpx.Response(500, text=request.content.decode())

    p, _ = provedor(ecoar)
    caplog.set_level(logging.DEBUG)

    with pytest.raises(FalhaDoProvedor) as erro:
        await p.authenticate("f", SENHA)

    assert SENHA not in str(erro.value)
    assert SENHA not in repr(erro.value)
    assert erro.value.__cause__ is None
    assert SENHA not in caplog.text


async def test_limite_total_vale_para_a_operacao_inteira():
    # Um servidor que responde aos poucos não segura o login além do limite total.
    async def devagar(request):
        await asyncio.sleep(0.3)
        return _sucesso()

    p = IfsulAuthProvider(URL, transport=httpx.MockTransport(devagar), limite_total=0.05)

    with pytest.raises(FalhaDoProvedor, match="tempo"):
        await p.authenticate("f", SENHA)


async def test_limite_total_padrao_e_o_da_doc():
    assert IfsulAuthProvider(URL).limite_total == 15
