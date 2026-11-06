from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

from pydantic import ValidationInfo, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Valor de exemplo do .env.example: nunca pode chegar a um ambiente real.
JWT_SECRET_EXEMPLO = "troque-por-um-segredo-local-de-desenvolvimento"
JWT_SECRET_MINIMO = 32
CSRF_SECRET_EXEMPLO = "troque-por-outro-segredo-local-so-para-o-csrf"


class Settings(BaseSettings):
    """Configuração lida de variáveis de ambiente (ou `.env` em desenvolvimento).

    O código nunca diferencia ambientes: só os valores mudam.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    AUTH_PROVIDER: Literal["mock", "ifsul"] = "mock"
    # API de autenticação do IFSul (AUTH_PROVIDER=ifsul). HTTP manda a senha institucional em claro:
    # só com IFSUL_AUTH_PERMITIR_HTTP=true, para teste; em produção, HTTPS (doc do IFSul, item 9).
    IFSUL_AUTH_URL: str | None = None
    IFSUL_AUTH_PERMITIR_HTTP: bool = False
    JWT_SECRET: str
    JWT_EXPIRES_SECONDS: int = 86400
    CSRF_SECRET: str

    @field_validator("JWT_SECRET")
    @classmethod
    def _segredo_forte(cls, valor: str) -> str:
        # Com um segredo fraco ou público, qualquer um assina tokens em nome de qualquer usuário.
        if valor == JWT_SECRET_EXEMPLO or len(valor.encode()) < JWT_SECRET_MINIMO:
            raise ValueError(
                f"JWT_SECRET deve ter ao menos {JWT_SECRET_MINIMO} bytes e não pode ser o valor de "
                "exemplo; gere um com: python -c 'import secrets; print(secrets.token_urlsafe(48))'"
            )
        return valor

    @field_validator("CSRF_SECRET")
    @classmethod
    def _segredo_do_csrf(cls, valor: str, info: ValidationInfo) -> str:
        # Fraca, qualquer um assina um token CSRF para a sessão da vítima. Igual à do JWT, vazar
        # uma daria a outra: uma chave por finalidade (RF-33, emenda v2.2).
        if valor == CSRF_SECRET_EXEMPLO or len(valor.encode()) < JWT_SECRET_MINIMO:
            raise ValueError(
                f"CSRF_SECRET deve ter ao menos {JWT_SECRET_MINIMO} bytes e não pode ser o valor "
                "de exemplo; gere um com: "
                "python -c 'import secrets; print(secrets.token_urlsafe(48))'"
            )
        if valor == info.data.get("JWT_SECRET"):
            raise ValueError("CSRF_SECRET deve ser diferente de JWT_SECRET")
        return valor

    @model_validator(mode="after")
    def _provedor_ifsul_configurado(self) -> "Settings":
        if self.AUTH_PROVIDER != "ifsul":
            return self
        if not self.IFSUL_AUTH_URL:
            raise ValueError("AUTH_PROVIDER=ifsul exige IFSUL_AUTH_URL (a API de autenticação)")
        partes = urlsplit(self.IFSUL_AUTH_URL)
        if partes.scheme not in ("https", "http") or not partes.netloc:
            raise ValueError("IFSUL_AUTH_URL deve ser uma URL https:// completa")
        if partes.scheme == "http" and not self.IFSUL_AUTH_PERMITIR_HTTP:
            raise ValueError(
                "IFSUL_AUTH_URL usa http://, que expõe a senha institucional; use https:// ou, só "
                "para teste, IFSUL_AUTH_PERMITIR_HTTP=true"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
