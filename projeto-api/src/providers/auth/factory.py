from fastapi import Depends

from src.core.config import Settings, get_settings
from src.providers.auth.base import AuthProvider
from src.providers.auth.ifsul import IfsulAuthProvider
from src.providers.auth.mock import MockAuthProvider


def provider_from_settings(settings: Settings) -> AuthProvider:
    if settings.AUTH_PROVIDER == "ifsul":
        # URL e esquema já validados em Settings (HTTPS, ou HTTP liberado de propósito).
        return IfsulAuthProvider(settings.IFSUL_AUTH_URL)
    return MockAuthProvider()


def get_auth_provider(settings: Settings = Depends(get_settings)) -> AuthProvider:
    """Dependência FastAPI: o provedor vem da configuração, nunca de rotas ou serviços (RF-02)."""
    return provider_from_settings(settings)
