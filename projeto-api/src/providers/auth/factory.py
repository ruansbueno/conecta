from fastapi import Depends

from src.core.config import Settings, get_settings
from src.providers.auth.base import AuthProvider
from src.providers.auth.mock_moodle import MockMoodleAuthProvider
from src.providers.auth.moodle import MoodleAuthProvider


def provider_from_settings(settings: Settings) -> AuthProvider:
    if settings.AUTH_PROVIDER == "moodle":
        return MoodleAuthProvider()
    return MockMoodleAuthProvider()


def get_auth_provider(settings: Settings = Depends(get_settings)) -> AuthProvider:
    """Dependência FastAPI: o provedor vem da configuração, nunca de rotas ou serviços (RF-02)."""
    return provider_from_settings(settings)
