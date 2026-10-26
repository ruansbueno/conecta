from functools import lru_cache
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Valor de exemplo do .env.example: nunca pode chegar a um ambiente real.
JWT_SECRET_EXEMPLO = "troque-por-um-segredo-local-de-desenvolvimento"
JWT_SECRET_MINIMO = 32


class Settings(BaseSettings):
    """Configuração lida de variáveis de ambiente (ou `.env` em desenvolvimento).

    O código nunca diferencia ambientes: só os valores mudam.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    AUTH_PROVIDER: Literal["mock", "moodle"] = "mock"
    JWT_SECRET: str
    JWT_EXPIRES_SECONDS: int = 86400

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
