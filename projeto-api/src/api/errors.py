import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


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


class AcessoPendente(DomainError):
    def __init__(self):
        super().__init__(403, "ACESSO_PENDENTE", "Acesso aguardando liberação")


class AcessoRecusado(DomainError):
    def __init__(self):
        super().__init__(403, "ACESSO_RECUSADO", "Acesso não liberado")


class AcessoJaDecidido(DomainError):
    def __init__(self):
        super().__init__(409, "ACESSO_JA_DECIDIDO", "Este pedido de acesso já foi decidido")


class SemPermissao(DomainError):
    def __init__(self, detail: str = "Sem permissão para esta ação"):
        super().__init__(403, "SEM_PERMISSAO", detail)


class CsrfInvalido(DomainError):
    def __init__(self):
        super().__init__(403, "CSRF_INVALIDO", "Token CSRF ausente ou inválido")


class TurmaIndisponivel(DomainError):
    def __init__(self):
        super().__init__(
            404, "TURMA_INDISPONIVEL", "Turma inexistente, inativa ou com inscrições fechadas"
        )


class JaVinculado(DomainError):
    def __init__(self):
        super().__init__(409, "JA_VINCULADO", "Você já está vinculado a esta turma")


class SolicitacaoDuplicada(DomainError):
    def __init__(self):
        super().__init__(
            409, "SOLICITACAO_DUPLICADA", "Já existe uma solicitação pendente para esta turma"
        )


class SolicitacaoNaoEncontrada(DomainError):
    def __init__(self):
        super().__init__(404, "SOLICITACAO_NAO_ENCONTRADA", "Solicitação não encontrada")


class SolicitacaoNaoPendente(DomainError):
    def __init__(self):
        super().__init__(409, "SOLICITACAO_NAO_PENDENTE", "A solicitação já foi decidida")


class TurmaNaoEncontrada(DomainError):
    def __init__(self):
        super().__init__(404, "TURMA_NAO_ENCONTRADA", "Turma não encontrada")


class UsuarioNaoEncontrado(DomainError):
    def __init__(self):
        super().__init__(404, "USUARIO_NAO_ENCONTRADO", "Usuário não encontrado")


class VinculoNaoEncontrado(DomainError):
    def __init__(self):
        super().__init__(404, "VINCULO_NAO_ENCONTRADO", "Vínculo não encontrado")


class PerfilIncompativel(DomainError):
    def __init__(self, detail: str):
        super().__init__(409, "PERFIL_INCOMPATIVEL", detail)


class CodigoTurmaDuplicado(DomainError):
    def __init__(self):
        super().__init__(409, "CODIGO_TURMA_DUPLICADO", "Já existe uma turma com este código")


class AvisoNaoEditavel(DomainError):
    def __init__(self):
        super().__init__(
            409, "AVISO_NAO_EDITAVEL", "Aviso arquivado ou excluído não pode ser editado"
        )


class AvisoSituacaoInvalida(DomainError):
    def __init__(self, detail: str):
        super().__init__(409, "AVISO_SITUACAO_INVALIDA", detail)


class DestinoNaoPermitido(DomainError):
    def __init__(self):
        super().__init__(
            403,
            "DESTINO_NAO_PERMITIDO",
            "Docente só publica para as turmas em que leciona",
        )


class ErroDeValidacao(DomainError):
    """422 de regra de negócio, no mesmo formato do de esquema (com `errors[]`)."""

    def __init__(self, campo: str, mensagem: str):
        super().__init__(422, "VALIDATION_ERROR", "Dados inválidos")
        self.errors = [{"campo": campo, "mensagem": mensagem}]


class AvisoNaoEncontrado(DomainError):
    def __init__(self):
        super().__init__(404, "AVISO_NAO_ENCONTRADO", "Aviso não encontrado")


class EventoNaoEncontrado(DomainError):
    def __init__(self):
        super().__init__(404, "EVENTO_NAO_ENCONTRADO", "Evento não encontrado")


class EventoNaoEditavel(DomainError):
    def __init__(self):
        super().__init__(
            409, "EVENTO_NAO_EDITAVEL", "Evento arquivado ou excluído não pode ser editado"
        )


class EventoSituacaoInvalida(DomainError):
    def __init__(self, detail: str):
        super().__init__(409, "EVENTO_SITUACAO_INVALIDA", detail)


class HorarioNaoEncontrado(DomainError):
    def __init__(self):
        super().__init__(404, "HORARIO_NAO_ENCONTRADO", "Horário não encontrado")


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


def resposta_de_erro(exc: DomainError) -> JSONResponse:
    """A resposta padrão de um erro de negócio, para quem precisa devolvê-la sem levantar."""
    corpo = {"detail": exc.detail, "code": exc.code}
    if isinstance(exc, ErroDeValidacao):
        corpo["errors"] = exc.errors
    return JSONResponse(corpo, status_code=exc.status_code)


async def _domain_error_handler(_: Request, exc: DomainError) -> JSONResponse:
    return resposta_de_erro(exc)


async def _validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
    errors = [{"campo": _campo(e["loc"]), "mensagem": _mensagem(e)} for e in exc.errors()]
    return JSONResponse(
        {"detail": "Dados inválidos", "code": "VALIDATION_ERROR", "errors": errors},
        status_code=422,
    )


# Erros do próprio framework (rota inexistente, método errado) também levam `code`.
_HTTP_GENERICOS = {
    404: ("NAO_ENCONTRADO", "Recurso não encontrado"),
    405: ("METODO_NAO_PERMITIDO", "Método não permitido"),
}


async def _http_error_handler(_: Request, exc: StarletteHTTPException) -> JSONResponse:
    code, detail = _HTTP_GENERICOS.get(exc.status_code, ("ERRO_HTTP", str(exc.detail)))
    return JSONResponse(
        {"detail": detail, "code": code}, status_code=exc.status_code, headers=exc.headers
    )


async def _unexpected_error_handler(_: Request, exc: Exception) -> JSONResponse:
    logger.error("Erro inesperado", exc_info=exc)
    return JSONResponse({"detail": "Erro interno", "code": "ERRO_INTERNO"}, status_code=500)


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(DomainError, _domain_error_handler)
    app.add_exception_handler(RequestValidationError, _validation_error_handler)
    app.add_exception_handler(StarletteHTTPException, _http_error_handler)
    app.add_exception_handler(Exception, _unexpected_error_handler)
