import hashlib
import hmac
import secrets

from fastapi import Request

from src.api.errors import CsrfInvalido
from src.core.config import get_settings

CSRF_COOKIE = "conecta_csrf"
CSRF_HEADER = "X-CSRF-Token"
METODOS_DE_ESCRITA = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def _assinatura(sessao: str, aleatorio: str) -> str:
    # Comprimentos na mensagem, como na OWASP: nenhuma outra divisão das partes dá o mesmo texto.
    mensagem = f"{len(sessao)}!{sessao}!{len(aleatorio)}!{aleatorio}"
    chave = get_settings().CSRF_SECRET.encode()
    return hmac.new(chave, mensagem.encode(), hashlib.sha256).hexdigest()


def gerar_csrf(sessao: str) -> str:
    """Token `<aleatório>.<assinatura>`, preso ao cookie de sessão emitido junto (RF-33, v2.2)."""
    aleatorio = secrets.token_urlsafe(32)
    return f"{aleatorio}.{_assinatura(sessao, aleatorio)}"


def csrf_confere(sessao: str, token: str) -> bool:
    aleatorio, _, assinatura = token.partition(".")
    if not aleatorio or not assinatura:
        return False
    return hmac.compare_digest(_assinatura(sessao, aleatorio).encode(), assinatura.encode())


def verificar_csrf(request: Request, sessao: str) -> None:
    """Double submit assinado (RF-33): o cabeçalho repete o cookie, que é assinado para a sessão.

    Sem a assinatura, quem grava um cookie no domínio escolheria o próprio par cookie e cabeçalho.
    """
    if request.method not in METODOS_DE_ESCRITA:
        return
    cookie = request.cookies.get(CSRF_COOKIE, "")
    header = request.headers.get(CSRF_HEADER, "")
    if (
        not cookie
        or not hmac.compare_digest(cookie.encode(), header.encode())
        or not csrf_confere(sessao, cookie)
    ):
        raise CsrfInvalido()
