"""Roteiro de validação da integração real (doc do IFSul, item 10), contra uma API falsa.

O relatório registra esperado × obtido de cada caso, nunca a senha, e mascara o login.
"""

import httpx

from scripts.roteiro_ifsul import Conta, executar, mascarar, relatorio_markdown

SENHA_ALUNO = "Senha-Do-Aluno-Real-1"
SENHA_SERVIDOR = "Senha-Do-Servidor-Real-2"


def _conecta(request: httpx.Request) -> httpx.Response:
    caminho = request.url.path
    if caminho == "/auth/login":
        corpo = httpx.Request("POST", "/", content=request.content).read()
        import json

        dados = json.loads(corpo)
        usuario, senha = dados.get("username"), dados.get("password")
        if not usuario or not senha:
            return httpx.Response(
                422, json={"code": "VALIDATION_ERROR", "detail": "Dados inválidos"}
            )
        if (usuario, senha) == ("fulana.aluna", SENHA_ALUNO):
            return httpx.Response(
                200,
                json={"access_token": "tok-aluno", "usuario": {"perfil": "aluno"}},
                headers=[
                    ("set-cookie", "__Host-conecta_sessao=x; Secure; HttpOnly; Path=/"),
                    ("set-cookie", "__Host-conecta_csrf=c; Secure; Path=/"),
                ],
            )
        if (usuario, senha) == ("fulano.servidor", SENHA_SERVIDOR):
            return httpx.Response(
                403, json={"code": "ACESSO_PENDENTE", "detail": "Acesso aguardando"}
            )
        return httpx.Response(401, json={"code": "CREDENCIAIS_INVALIDAS", "detail": "x"})
    if caminho == "/me":
        ok = request.headers.get("authorization") == "Bearer tok-aluno"
        return httpx.Response(200 if ok else 401, json={"perfil": "aluno"} if ok else {})
    if caminho == "/auth/sessao":
        # Como a API real (auth.py): sem cookie, 401; sem o CSRF do cookie, 403; com os dois, 204.
        cookie = request.headers.get("cookie", "")
        if "__Host-conecta_sessao=x" not in cookie:
            return httpx.Response(401, json={"code": "NAO_AUTENTICADO"})
        if "__Host-conecta_csrf=c" not in cookie or request.headers.get("x-csrf-token") != "c":
            return httpx.Response(403, json={"code": "CSRF_INVALIDO"})
        return httpx.Response(204, headers={"set-cookie": "__Host-conecta_sessao=; Max-Age=0"})
    if caminho == "/gestao/usuarios":
        return httpx.Response(403, json={"code": "SEM_PERMISSAO"})
    if caminho == "/turmas/disponiveis":
        return httpx.Response(200, json={"items": []})
    return httpx.Response(404)


def _ifsul(request: httpx.Request) -> httpx.Response:
    # Como a API real (sondagem de 06/11/2026): campo faltando, 400; senão, credencial inválida.
    import json

    dados = json.loads(request.content)
    if not dados.get("usuario") or not dados.get("senha"):
        return httpx.Response(400, json={"sucesso": False, "codigo": "DADOS_INVALIDOS"})
    return httpx.Response(
        401, json={"sucesso": False, "autenticado": False, "codigo": "CREDENCIAIS_INVALIDAS"}
    )


def _ifsul_fora_do_ar(request: httpx.Request) -> httpx.Response:
    raise httpx.ConnectError("sem rota")


def _rodar(aluno, servidor, ifsul=_ifsul, conecta=_conecta):
    return executar(
        conecta=httpx.Client(base_url="http://conecta", transport=httpx.MockTransport(conecta)),
        ifsul_url="http://ifsul/api",
        ifsul_transport=httpx.MockTransport(ifsul),
        aluno=aluno,
        servidor=servidor,
    )


def test_os_nove_casos_da_doc_com_contas_reais():
    casos = _rodar(Conta("fulana.aluna", SENHA_ALUNO), Conta("fulano.servidor", SENHA_SERVIDOR))

    assert [c.numero for c in casos] == list(range(1, 10))
    assert all(c.correto for c in casos), [(c.numero, c.obtido) for c in casos if not c.correto]


def test_sem_contas_os_casos_que_dependem_delas_ficam_nao_executados():
    casos = _rodar(None, None)

    por_numero = {c.numero: c for c in casos}
    assert {n for n, c in por_numero.items() if c.correto is None} == {1, 2, 3, 8, 9}
    assert all(por_numero[n].correto for n in (4, 5, 6, 7))


def test_relatorio_nao_tem_senha_e_mascara_o_login():
    casos = _rodar(Conta("fulana.aluna", SENHA_ALUNO), Conta("fulano.servidor", SENHA_SERVIDOR))

    texto = relatorio_markdown(casos, conecta="http://conecta", ifsul_url="http://ifsul/api")

    assert SENHA_ALUNO not in texto and SENHA_SERVIDOR not in texto
    assert "fulana.aluna" not in texto and "fulano.servidor" not in texto
    assert "| Esperado | Obtido | Correto |" in texto


def test_mascara_mantem_o_inicio_e_o_formato():
    assert mascarar("fulano.silva") == "fu****.si***"
    assert mascarar("ab") == "a*"


def test_401_do_conecta_nao_basta_se_a_api_do_ifsul_nao_respondeu():
    # Com o RF-06, provedor fora do ar também dá 401 genérico: os casos 3 e 4 só passam se a API
    # do IFSul, consultada direto, recusar a credencial.
    casos = _rodar(Conta("fulana.aluna", SENHA_ALUNO), None, ifsul=_ifsul_fora_do_ar)

    por_numero = {c.numero: c for c in casos}
    assert por_numero[3].correto is False
    assert por_numero[4].correto is False
    assert "API do IFSul direto" in por_numero[4].obtido


def test_caso_que_quebra_nao_derruba_o_relatorio():
    def proxy_quebrado(request):
        return httpx.Response(502, text="<html>Bad Gateway</html>")

    casos = _rodar(Conta("fulana.aluna", SENHA_ALUNO), None, conecta=proxy_quebrado)

    assert [c.numero for c in casos] == list(range(1, 10))
    assert casos[0].correto is False
    assert "HTTP 502" in casos[0].obtido
