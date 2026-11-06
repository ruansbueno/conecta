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
                headers={"set-cookie": "__Host-conecta_sessao=x; Secure; HttpOnly; Path=/"},
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
        return httpx.Response(204, headers={"set-cookie": "__Host-conecta_sessao=; Max-Age=0"})
    if caminho == "/gestao/usuarios":
        return httpx.Response(403, json={"code": "SEM_PERMISSAO"})
    if caminho == "/turmas/disponiveis":
        return httpx.Response(200, json={"items": []})
    return httpx.Response(404)


def _ifsul(request: httpx.Request) -> httpx.Response:
    return httpx.Response(400, json={"sucesso": False, "codigo": "DADOS_INVALIDOS"})


def _rodar(aluno, servidor):
    return executar(
        conecta=httpx.Client(base_url="http://conecta", transport=httpx.MockTransport(_conecta)),
        ifsul_url="http://ifsul/api",
        ifsul_transport=httpx.MockTransport(_ifsul),
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
