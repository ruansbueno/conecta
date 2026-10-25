from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuração lida de variáveis de ambiente (ou `.env` em desenvolvimento).

    O código nunca diferencia ambientes: só os valores mudam.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    AUTH_PROVIDER: Literal["mock", "moodle"] = "mock"
    JWT_SECRET: str
    JWT_EXPIRES_SECONDS: int = 86400


@lru_cache
def get_settings() -> Settings:
    return Settings()
