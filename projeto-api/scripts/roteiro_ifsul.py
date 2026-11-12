"""Roteiro de validação da integração real com a API de autenticação do IFSul.

Executa os 9 testes do item 10 da doc "Orientações para integração do Conecta com a API de
autenticação do IFSUL" e grava um relatório com esperado × obtido de cada um, sem senha e com o
login mascarado (spec.md §9.4).

Pré-requisito: a API do CONECTA no ar com o provedor real, por exemplo:

    export IFSUL_AUTH_URL='<endereço informado pelo IFSul>'
    AUTH_PROVIDER=ifsul IFSUL_AUTH_PERMITIR_HTTP=true uv run uvicorn src.main:app --port 8001

Uso: `uv run python -m scripts.roteiro_ifsul --conecta http://localhost:8001`

O login e a senha de uma conta de aluno e de uma conta administrativa são pedidos na hora (a senha
sem eco). Deixar o login em branco pula os casos que dependem daquela conta.
"""

import argparse
import getpass
import os
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import anyio
import httpx

from src.providers.auth.ifsul import FalhaDoProvedor, IfsulAuthProvider

# Porta 9 (discard): ninguém responde — simula a API do IFSul fora do ar (caso 7).
URL_FORA_DO_AR = "http://127.0.0.1:9/api/v1/autenticacoes"
SENHA_ERRADA = "senha-incorreta-do-roteiro-conecta"
USUARIO_INEXISTENTE = "conecta.roteiro.inexistente"


@dataclass(frozen=True)
class Conta:
    login: str
    senha: str


@dataclass
class Caso:
    numero: int
    titulo: str
    esperado: str
    obtido: str = "não executado (sem a conta)"
    correto: bool | None = None


def mascarar(login: str) -> str:
    """`fulano.silva` → `fu****.si***`: o relatório identifica o caso sem expor a pessoa."""

    def parte(p: str) -> str:
        manter = 2 if len(p) > 2 else 1
        return p[:manter] + "*" * (len(p) - manter)

    return ".".join(parte(p) for p in login.split("."))


def _code(r: httpx.Response) -> str | None:
    try:
        corpo = r.json()
    except ValueError:
        return None
    return corpo.get("code") if isinstance(corpo, dict) else None


def _cookies_da_sessao(login: httpx.Response) -> dict[str, str]:
    """Os cookies `__Host-` que o login emitiu, para encerrar a sessão como a web faz.

    O cliente HTTP não os reenvia sozinho por `http://` (são `Secure`): o roteiro os repassa.
    """
    cookies = {}
    for cabecalho in login.headers.get_list("set-cookie"):
        nome, _, resto = cabecalho.partition("=")
        cookies[nome.strip()] = resto.split(";", 1)[0]
    return cookies


def _resumo(r: httpx.Response) -> str:
    try:
        corpo = r.json()
    except ValueError:
        corpo = {}
    code = corpo.get("code") if isinstance(corpo, dict) else None
    perfil = (corpo.get("usuario") or {}).get("perfil") if isinstance(corpo, dict) else None
    partes = [f"HTTP {r.status_code}"]
    if code:
        partes.append(code)
    if perfil:
        partes.append(f"perfil {perfil}")
    return " ".join(partes)


def _login(conecta: httpx.Client, usuario: str | None, senha: str | None) -> httpx.Response:
    corpo = {}
    if usuario is not None:
        corpo["username"] = usuario
    if senha is not None:
        corpo["password"] = senha
    return conecta.post("/auth/login", json=corpo)


def _caso(
    numero: int, titulo: str, esperado: str, conta_necessaria: bool, executar: Callable
) -> Caso:
    caso = Caso(numero, titulo, esperado)
    if not conta_necessaria:
        return caso
    try:
        caso.obtido, caso.correto = executar()
    except Exception as erro:  # noqa: BLE001 — um caso que quebra não pode derrubar o relatório
        caso.obtido, caso.correto = f"falha ao executar o caso: {type(erro).__name__}", False
    return caso


def executar(
    conecta: httpx.Client,
    ifsul_url: str,
    aluno: Conta | None,
    servidor: Conta | None,
    ifsul_transport: httpx.BaseTransport | None = None,
) -> list[Caso]:
    def direto_no_ifsul(corpo: dict) -> str:
        with httpx.Client(transport=ifsul_transport, timeout=15) as c:
            r = c.post(ifsul_url, json=corpo, headers={"Accept": "application/json"})
        try:
            return f"HTTP {r.status_code} {r.json().get('codigo', '')}".strip()
        except ValueError:
            return f"HTTP {r.status_code}"

    def caso1():
        r = _login(conecta, aluno.login, aluno.senha)
        perfil = (r.json().get("usuario") or {}).get("perfil") if r.status_code == 200 else None
        return _resumo(r), r.status_code == 200 and perfil is not None

    def caso2():
        r = _login(conecta, servidor.login, servidor.senha)
        code = _code(r) if r.status_code != 200 else None
        # 1º acesso: pedido pendente; já liberado pela gestão: entra com o perfil concedido.
        return _resumo(r), r.status_code == 200 or code == "ACESSO_PENDENTE"

    def recusado_pelo_ifsul(usuario: str, senha: str) -> tuple[str, bool]:
        # Com o RF-06, provedor fora do ar também vira 401 no CONECTA: só a resposta direta da API
        # do IFSul prova que ela foi consultada e recusou a credencial.
        provedor = IfsulAuthProvider(ifsul_url, transport=ifsul_transport)
        try:
            recusou = anyio.run(provedor.authenticate, usuario, senha) is None
        except FalhaDoProvedor as erro:
            return f"API do IFSul direto: sem resposta válida ({erro})", False
        if not recusou:
            return "API do IFSul direto: credencial aceita", False
        return "API do IFSul direto: credencial recusada", True

    def caso3():
        r = _login(conecta, aluno.login, SENHA_ERRADA)
        direto, recusou = recusado_pelo_ifsul(aluno.login, SENHA_ERRADA)
        ok = r.status_code == 401 and _code(r) == "CREDENCIAIS_INVALIDAS" and recusou
        return f"CONECTA: {_resumo(r)}; {direto}", ok

    def caso4():
        r = _login(conecta, USUARIO_INEXISTENTE, SENHA_ERRADA)
        direto, recusou = recusado_pelo_ifsul(USUARIO_INEXISTENTE, SENHA_ERRADA)
        ok = r.status_code == 401 and _code(r) == "CREDENCIAIS_INVALIDAS" and recusou
        return f"CONECTA: {_resumo(r)}; {direto}", ok

    def caso5():
        r = _login(conecta, None, SENHA_ERRADA)
        ifsul = direto_no_ifsul({"senha": SENHA_ERRADA})
        obtido = f"CONECTA: {_resumo(r)}; API do IFSul direto: {ifsul}"
        return obtido, r.status_code == 422 and "DADOS_INVALIDOS" in ifsul

    def caso6():
        r = _login(conecta, USUARIO_INEXISTENTE, None)
        ifsul = direto_no_ifsul({"usuario": USUARIO_INEXISTENTE})
        obtido = f"CONECTA: {_resumo(r)}; API do IFSul direto: {ifsul}"
        return obtido, r.status_code == 422 and "DADOS_INVALIDOS" in ifsul

    def caso7():
        provedor = IfsulAuthProvider(URL_FORA_DO_AR)
        try:
            anyio.run(provedor.authenticate, USUARIO_INEXISTENTE, SENHA_ERRADA)
        except FalhaDoProvedor as erro:
            return (
                f"provedor: FalhaDoProvedor ({erro}); o CONECTA responde 401 genérico "
                "(test_login_provider_indisponivel)",
                True,
            )
        return "provedor não acusou falha", False

    def caso8():
        r = _login(conecta, aluno.login, aluno.senha)
        if r.status_code != 200:
            return f"login: {_resumo(r)}", False
        token = r.json()["access_token"]
        me = conecta.get("/me", headers={"Authorization": f"Bearer {token}"})
        cookies = _cookies_da_sessao(r)
        csrf = next((v for k, v in cookies.items() if k.endswith("conecta_csrf")), "")
        # Como a web: os cookies da sessão e o CSRF repetido no cabeçalho (RF-33).
        encerrar = conecta.delete(
            "/auth/sessao",
            headers={
                "Cookie": "; ".join(f"{k}={v}" for k, v in cookies.items()),
                "X-CSRF-Token": csrf,
            },
        )
        expirou = any("Max-Age=0" in c for c in encerrar.headers.get_list("set-cookie"))
        obtido = (
            f"sessão criada: token emitido, GET /me HTTP {me.status_code}, "
            f"{len(cookies)} cookie(s) de sessão web; encerrada: DELETE /auth/sessao "
            f"HTTP {encerrar.status_code}, cookie expirado: {'sim' if expirou else 'não'}"
        )
        return obtido, me.status_code == 200 and encerrar.status_code == 204 and expirou

    def caso9():
        r = _login(conecta, aluno.login, aluno.senha)
        if r.status_code != 200:
            return f"login: {_resumo(r)}", False
        auth = {"Authorization": f"Bearer {r.json()['access_token']}"}
        perfil = r.json()["usuario"]["perfil"]
        gestao = conecta.get("/gestao/usuarios", headers=auth)
        disponiveis = conecta.get("/turmas/disponiveis", headers=auth)
        servidor_resumo = (
            _resumo(_login(conecta, servidor.login, servidor.senha)) if servidor else "sem a conta"
        )
        obtido = (
            f"perfil {perfil}: GET /gestao/usuarios HTTP {gestao.status_code}, "
            f"GET /turmas/disponiveis HTTP {disponiveis.status_code}; "
            f"conta administrativa: {servidor_resumo}"
        )
        if perfil == "aluno":
            ok = gestao.status_code == 403 and disponiveis.status_code == 200
        else:
            ok = disponiveis.status_code == 403  # só aluno solicita inscrição
        return obtido, ok

    return [
        _caso(
            1, "Conta válida de aluno", "200, perfil aluno (ou o já concedido)", bool(aluno), caso1
        ),
        _caso(
            2,
            "Conta administrativa",
            "1º acesso: 403 ACESSO_PENDENTE; depois de liberada: 200 com o perfil concedido",
            bool(servidor),
            caso2,
        ),
        _caso(3, "Senha incorreta", "401 CREDENCIAIS_INVALIDAS", bool(aluno), caso3),
        _caso(4, "Usuário inexistente", "401 CREDENCIAIS_INVALIDAS", True, caso4),
        _caso(
            5,
            "Requisição sem usuário",
            "CONECTA 422 VALIDATION_ERROR (nem chama o IFSul); IFSul direto 400 DADOS_INVALIDOS",
            True,
            caso5,
        ),
        _caso(
            6,
            "Requisição sem senha",
            "CONECTA 422 VALIDATION_ERROR (nem chama o IFSul); IFSul direto 400 DADOS_INVALIDOS",
            True,
            caso6,
        ),
        _caso(
            7,
            "API do IFSul indisponível (simulada: endereço local sem serviço)",
            "falha do provedor; o CONECTA responde 401 genérico, sem detalhes (RF-06)",
            True,
            caso7,
        ),
        _caso(
            8,
            "Criação e encerramento da sessão",
            "token e cookies emitidos; GET /me 200; DELETE /auth/sessao 204 com cookie expirado",
            bool(aluno),
            caso8,
        ),
        _caso(
            9,
            "Permissões do usuário autenticado",
            "aluno: gestão 403 e turmas disponíveis 200; administrativo pendente sem sessão",
            bool(aluno),
            caso9,
        ),
    ]


def relatorio_markdown(
    casos: list[Caso],
    conecta: str,
    ifsul_url: str,
    contas: dict[str, str] | None = None,
) -> str:
    agora = datetime.now(ZoneInfo("America/Sao_Paulo")).strftime("%d/%m/%Y %H:%M")
    linhas = [
        "# Validação da integração com a API de autenticação do IFSul",
        "",
        f"{agora} — CONECTA em `{conecta}`, API do IFSul em `{ifsul_url}`.",
        "Casos do item 10 da doc do IFSul. Senhas nunca são registradas; logins mascarados.",
        "",
    ]
    for papel, login in (contas or {}).items():
        linhas.append(f"- Conta {papel}: `{mascarar(login)}`")
    linhas += ["", "| # | Caso | Esperado | Obtido | Correto |", "|---|---|---|---|---|"]
    for c in casos:
        correto = {True: "sim", False: "**não**", None: "—"}[c.correto]
        linhas.append(f"| {c.numero} | {c.titulo} | {c.esperado} | {c.obtido} | {correto} |")
    executados = [c for c in casos if c.correto is not None]
    aprovados = sum(1 for c in executados if c.correto)
    linhas += [
        "",
        f"Resultado: {aprovados} de {len(executados)} casos executados corretos; "
        f"{len(casos) - len(executados)} não executados (sem a conta).",
    ]
    return "\n".join(linhas) + "\n"


def _pedir_conta(papel: str) -> Conta | None:
    login = input(f"Login institucional da conta {papel} (em branco para pular): ").strip()
    if not login:
        return None
    return Conta(login, getpass.getpass(f"Senha da conta {papel} (não aparece): "))


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawTextHelpFormatter
    )
    parser.add_argument("--conecta", default="http://localhost:8001", help="URL da API do CONECTA")
    parser.add_argument(
        "--ifsul",
        default=os.environ.get("IFSUL_AUTH_URL"),
        help="URL da API de autenticação do IFSul (padrão: IFSUL_AUTH_URL)",
    )
    parser.add_argument("--sem-contas", action="store_true", help="só os casos sem credencial")
    parser.add_argument("--saida", type=Path, help="arquivo .md do relatório")
    args = parser.parse_args()
    if not args.ifsul:
        parser.error("informe --ifsul ou defina IFSUL_AUTH_URL")

    aluno = servidor = None
    if not args.sem_contas:
        aluno = _pedir_conta("de aluno")
        servidor = _pedir_conta("administrativa")
    with httpx.Client(base_url=args.conecta, timeout=30) as conecta:
        casos = executar(conecta, args.ifsul, aluno, servidor)
    contas = {k: v.login for k, v in (("de aluno", aluno), ("administrativa", servidor)) if v}
    texto = relatorio_markdown(casos, args.conecta, args.ifsul, contas)
    print(texto)
    if args.saida:
        args.saida.write_text(texto, encoding="utf-8")
        print(f"Relatório gravado em {args.saida}")


if __name__ == "__main__":
    main()
