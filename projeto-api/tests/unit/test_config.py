"""Configuração insegura ou incoerente falha cedo, não em produção (achados da revisão final)."""

import pytest
from pydantic import ValidationError

from src.core.config import Settings
from src.providers.auth.factory import ProvedorIndisponivel, provider_from_settings

URL = "postgresql+asyncpg://x"
SEGREDO_OK = "s" * 32


@pytest.mark.parametrize(
    "segredo",
    ["curto", "x" * 31, "troque-por-um-segredo-local-de-desenvolvimento"],
    ids=["curto", "31-bytes", "placeholder-do-env-example"],
)
def test_jwt_secret_fraco_ou_de_exemplo_e_rejeitado(segredo):
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(DATABASE_URL=URL, JWT_SECRET=segredo)


def test_jwt_secret_com_32_bytes_ou_mais_e_aceito():
    assert Settings(DATABASE_URL=URL, JWT_SECRET=SEGREDO_OK).JWT_SECRET == SEGREDO_OK


def test_moodle_selecionado_enquanto_o_provedor_e_stub_falha_com_mensagem_clara():
    settings = Settings(DATABASE_URL=URL, JWT_SECRET=SEGREDO_OK, AUTH_PROVIDER="moodle")

    with pytest.raises(ProvedorIndisponivel, match="AUTH_PROVIDER=mock"):
        provider_from_settings(settings)


async def test_api_nao_sobe_com_provedor_indisponivel(monkeypatch):
    from src.core.config import get_settings
    from src.main import app

    monkeypatch.setenv("AUTH_PROVIDER", "moodle")
    get_settings.cache_clear()
    try:
        with pytest.raises(ProvedorIndisponivel):
            async with app.router.lifespan_context(app):
                pass
    finally:
        monkeypatch.undo()
        get_settings.cache_clear()
