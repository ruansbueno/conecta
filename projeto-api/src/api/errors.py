from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse


class DomainError(Exception):
    """Erro de negócio com `code` estável do catálogo de contracts/api.md."""

    def __init__(self, status_code: int, code: str, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.code = code
        self.detail = detail


class NaoAutenticado(DomainError):
    def __init__(self, detail: str = "Não autenticado"):
        super().__init__(401, "NAO_AUTENTICADO", detail)


class CredenciaisInvalidas(DomainError):
    def __init__(self):
        super().__init__(401, "CREDENCIAIS_INVALIDAS", "Usuário ou senha inválidos")


class UsuarioInativo(DomainError):
    def __init__(self):
        super().__init__(403, "USUARIO_INATIVO", "Usuário desativado")


class SemPermissao(DomainError):
    def __init__(self, detail: str = "Sem permissão para esta ação"):
        super().__init__(403, "SEM_PERMISSAO", detail)


class CsrfInvalido(DomainError):
    def __init__(self):
        super().__init__(403, "CSRF_INVALIDO", "Token CSRF ausente ou inválido")


_MENSAGENS = {
    "missing": "campo obrigatório",
    "string_type": "deve ser um texto",
    "int_parsing": "deve ser um número inteiro",
    "json_invalid": "JSON inválido",
}


def _mensagem(erro: dict) -> str:
    ctx = erro.get("ctx") or {}
    match erro["type"]:
        case "string_too_short" | "string_too_long":
            return _faixa_de_tamanho(ctx)
        case "greater_than_equal":
            return f"deve ser maior ou igual a {ctx['ge']}"
        case "less_than_equal":
            return f"deve ser menor ou igual a {ctx['le']}"
        case tipo:
            return _MENSAGENS.get(tipo, erro["msg"])


def _faixa_de_tamanho(ctx: dict) -> str:
    if "min_length" in ctx:
        return f"deve ter ao menos {ctx['min_length']} caractere(s)"
    return f"deve ter no máximo {ctx['max_length']} caracteres"


def _campo(loc: tuple) -> str:
    # ("body", "titulo") → "titulo"; ("query", "limit") → "limit"; corpo inteiro → "body"
    partes = [str(p) for p in loc[1:]] or [str(loc[0])]
    return ".".join(partes)


async def _domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
    return JSONResponse({"detail": exc.detail, "code": exc.code}, status_code=exc.status_code)


async def _validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"campo": _campo(e["loc"]), "mensagem": _mensagem(e)} for e in exc.errors()]
    return JSONResponse(
        {"detail": "Dados inválidos", "code": "VALIDATION_ERROR", "errors": errors},
        status_code=422,
    )


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _domain_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
