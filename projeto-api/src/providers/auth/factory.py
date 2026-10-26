from fastapi import Depends

from src.core.config import Settings, get_settings
from src.providers.auth.base import AuthProvider
from src.providers.auth.mock_moodle import MockMoodleAuthProvider
from src.providers.auth.moodle import MoodleAuthProvider


class ProvedorIndisponivel(RuntimeError):
    pass


def provider_from_settings(settings: Settings) -> AuthProvider:
    if settings.AUTH_PROVIDER == "moodle":
        if not MoodleAuthProvider.IMPLEMENTADO:
            # Sem isto, todo login responderia "senha errada" sem pista do motivo.
            raise ProvedorIndisponivel(
                "AUTH_PROVIDER=moodle, mas o MoodleAuthProvider ainda não foi implementado. "
                "Use AUTH_PROVIDER=mock até a integração real (spec.md §9.4)."
            )
        return MoodleAuthProvider()
    return MockMoodleAuthProvider()


def get_auth_provider(settings: Settings = Depends(get_settings)) -> AuthProvider:
    """Dependência FastAPI: o provedor vem da configuração, nunca de rotas ou serviços (RF-02)."""
    return provider_from_settings(settings)
