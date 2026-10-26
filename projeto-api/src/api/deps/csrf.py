import hmac

from fastapi import Request

from src.api.errors import CsrfInvalido

CSRF_COOKIE = "conecta_csrf"
CSRF_HEADER = "X-CSRF-Token"
METODOS_DE_ESCRITA = frozenset({"POST", "PUT", "PATCH", "DELETE"})


def verificar_csrf(request: Request) -> None:
    """Double submit (RF-33): em escritas por cookie, o cabeçalho repete o cookie legível."""
    if request.method not in METODOS_DE_ESCRITA:
        return
    cookie = request.cookies.get(CSRF_COOKIE, "")
    header = request.headers.get(CSRF_HEADER, "")
    if not cookie or not hmac.compare_digest(cookie.encode(), header.encode()):
        raise CsrfInvalido()
