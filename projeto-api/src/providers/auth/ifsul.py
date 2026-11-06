"""API de autenticação do IFSul (Active Directory), conforme "Orientações para integração do
Conecta com a API de autenticação do IFSUL". Ela autentica; o CONECTA cuida da sessão e das
permissões (item 8 da doc).

Contrato observado (doc e sondagem de 06/11/2026), sempre `POST` com JSON `{usuario, senha}`:
- 200 `{sucesso: true, autenticado: true, usuario: {usuario, nome, email?, tipo_usuario}}`;
- 401 `{sucesso: false, autenticado: false, codigo: "CREDENCIAIS_INVALIDAS"}`;
- 400 `{sucesso: false, codigo: "DADOS_INVALIDOS"}` (usuário ou senha vazios);
- 400 `{sucesso: false, codigo: "JSON_INVALIDO"}` (corpo fora do formato).
"""

from typing import Any

import anyio
import httpx

from src.providers.auth.base import AuthenticatedUser, TipoInstitucional

_TIPOS: tuple[TipoInstitucional, ...] = ("aluno", "administrativo")
# Tempos do exemplo da doc (CURLOPT_CONNECTTIMEOUT 5, CURLOPT_TIMEOUT 15). O do httpx vale por
# etapa (cada leitura); o limite total cobre a operação inteira, como o CURLOPT_TIMEOUT.
TIMEOUT = httpx.Timeout(15.0, connect=5.0)
LIMITE_TOTAL = 15.0


class FalhaDoProvedor(RuntimeError):
    """A API do IFSul não respondeu ou respondeu fora do contrato.

    A mensagem nunca carrega a senha nem o corpo recebido: só o motivo (Princípio II).
    """


class IfsulAuthProvider:
    def __init__(
        self,
        url: str,
        *,
        transport: httpx.AsyncBaseTransport | None = None,
        timeout: httpx.Timeout = TIMEOUT,
        limite_total: float = LIMITE_TOTAL,
    ):
        self.url = url
        self.timeout = timeout
        self.limite_total = limite_total
        self._transport = transport

    async def authenticate(self, username: str, password: str) -> AuthenticatedUser | None:
        resposta = await self._enviar(username, password)
        corpo = _json(resposta)
        codigo = corpo.get("codigo")
        if resposta.status_code == 401 and codigo == "CREDENCIAIS_INVALIDAS":
            return None
        if resposta.status_code == 400 and codigo == "DADOS_INVALIDOS":
            return None
        if resposta.status_code != 200 or corpo.get("sucesso") is not True:
            raise FalhaDoProvedor(f"resposta inesperada: HTTP {resposta.status_code}")
        if corpo.get("autenticado") is not True:
            return None
        return _usuario(corpo.get("usuario"))

    async def _enviar(self, username: str, password: str) -> httpx.Response:
        try:
            with anyio.fail_after(self.limite_total):
                return await self._post(username, password)
        except TimeoutError:
            raise FalhaDoProvedor(f"tempo esgotado ({self.limite_total:g} s)") from None

    async def _post(self, username: str, password: str) -> httpx.Response:
        try:
            async with httpx.AsyncClient(
                transport=self._transport, timeout=self.timeout, follow_redirects=False
            ) as cliente:
                return await cliente.post(
                    self.url,
                    json={"usuario": username, "senha": password},
                    headers={"Accept": "application/json"},
                )
        except httpx.HTTPError as erro:
            # `from None` esconde a exceção original (ela guarda o pedido, com a senha no corpo) do
            # traceback; quem trata a FalhaDoProvedor nunca deve registrar o `__context__`.
            raise FalhaDoProvedor(f"comunicação: {type(erro).__name__}") from None


def _json(resposta: httpx.Response) -> dict[str, Any]:
    try:
        corpo = resposta.json()
    except ValueError:
        raise FalhaDoProvedor(f"resposta não é JSON: HTTP {resposta.status_code}") from None
    if not isinstance(corpo, dict):
        raise FalhaDoProvedor(f"resposta não é um objeto: HTTP {resposta.status_code}")
    return corpo


def _usuario(dados: Any) -> AuthenticatedUser:
    if not isinstance(dados, dict):
        raise FalhaDoProvedor("resposta sem os dados do usuário")
    login, nome, email = dados.get("usuario"), dados.get("nome"), dados.get("email")
    if not isinstance(login, str) or not login.strip():
        raise FalhaDoProvedor("resposta sem o login do usuário")
    if not isinstance(nome, str) or not nome.strip():
        raise FalhaDoProvedor("resposta sem o nome do usuário")
    tipo = dados.get("tipo_usuario")
    return AuthenticatedUser(
        # Login do AD em minúsculas: a mesma pessoa não pode virar duas contas pela caixa.
        username=login.strip().lower(),
        nome=nome.strip(),
        email=email.strip() if isinstance(email, str) and email.strip() else None,
        tipo_institucional=tipo if tipo in _TIPOS else None,
    )
