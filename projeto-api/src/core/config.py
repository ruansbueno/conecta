from functools import lru_cache
from typing import Literal

from pydantic import ValidationInfo, field_validator
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
    AUTH_PROVIDER: Literal["mock", "moodle"] = "mock"
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


@lru_cache
def get_settings() -> Settings:
    return Settings()
