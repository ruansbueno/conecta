"""Configuração insegura ou incoerente falha cedo, não em produção (achados da revisão final)."""

import pytest
from pydantic import ValidationError

from src.core.config import Settings
from src.providers.auth.factory import provider_from_settings
from src.providers.auth.ifsul import IfsulAuthProvider
from src.providers.auth.mock import MockAuthProvider

URL = "postgresql+asyncpg://x"
SEGREDO_OK = "s" * 32
CSRF_OK = "c" * 32


@pytest.mark.parametrize(
    "segredo",
    ["curto", "x" * 31, "troque-por-um-segredo-local-de-desenvolvimento"],
    ids=["curto", "31-bytes", "placeholder-do-env-example"],
)
def test_jwt_secret_fraco_ou_de_exemplo_e_rejeitado(segredo):
    with pytest.raises(ValidationError, match="JWT_SECRET"):
        Settings(DATABASE_URL=URL, JWT_SECRET=segredo, CSRF_SECRET=CSRF_OK)


def test_jwt_secret_com_32_bytes_ou_mais_e_aceito():
    settings = Settings(DATABASE_URL=URL, JWT_SECRET=SEGREDO_OK, CSRF_SECRET=CSRF_OK)

    assert settings.JWT_SECRET == SEGREDO_OK


@pytest.mark.parametrize(
    "segredo",
    ["curto", "x" * 31, "troque-por-outro-segredo-local-so-para-o-csrf"],
    ids=["curto", "31-bytes", "placeholder-do-env-example"],
)
def test_csrf_secret_fraco_ou_de_exemplo_e_rejeitado(segredo):
    with pytest.raises(ValidationError, match="CSRF_SECRET"):
        Settings(DATABASE_URL=URL, JWT_SECRET=SEGREDO_OK, CSRF_SECRET=segredo)


def test_csrf_secret_e_obrigatoria(monkeypatch):
    monkeypatch.delenv("CSRF_SECRET", raising=False)

    with pytest.raises(ValidationError, match="CSRF_SECRET"):
        Settings(DATABASE_URL=URL, JWT_SECRET=SEGREDO_OK, _env_file=None)


def test_csrf_secret_igual_a_jwt_secret_e_rejeitada():
    # Uma chave por finalidade: vazar uma não pode dar a outra (RF-33, emenda v2.2).
    with pytest.raises(ValidationError, match="CSRF_SECRET"):
        Settings(DATABASE_URL=URL, JWT_SECRET=SEGREDO_OK, CSRF_SECRET=SEGREDO_OK)


URL_IFSUL_HTTPS = "https://autenticacao.ifsul.edu.br/api/v1/autenticacoes"
URL_IFSUL_HTTP = "http://autenticacao.exemplo.ifsul/api/v1/autenticacoes"


def _settings(**extra):
    return Settings(DATABASE_URL=URL, JWT_SECRET=SEGREDO_OK, CSRF_SECRET=CSRF_OK, **extra)


def test_ifsul_exige_a_url_da_api_de_autenticacao():
    with pytest.raises(ValidationError, match="IFSUL_AUTH_URL"):
        _settings(AUTH_PROVIDER="ifsul")


def test_ifsul_com_https_e_aceito_e_vira_o_provedor_real():
    settings = _settings(AUTH_PROVIDER="ifsul", IFSUL_AUTH_URL=URL_IFSUL_HTTPS)

    provider = provider_from_settings(settings)

    assert isinstance(provider, IfsulAuthProvider)
    assert provider.url == URL_IFSUL_HTTPS


def test_ifsul_com_http_e_recusado_sem_liberacao_explicita():
    # A senha institucional viajaria em claro (doc do IFSul, item 9).
    with pytest.raises(ValidationError, match="IFSUL_AUTH_PERMITIR_HTTP"):
        _settings(AUTH_PROVIDER="ifsul", IFSUL_AUTH_URL=URL_IFSUL_HTTP)


def test_ifsul_com_http_liberado_explicitamente_e_aceito():
    settings = _settings(
        AUTH_PROVIDER="ifsul", IFSUL_AUTH_URL=URL_IFSUL_HTTP, IFSUL_AUTH_PERMITIR_HTTP=True
    )

    assert isinstance(provider_from_settings(settings), IfsulAuthProvider)


@pytest.mark.parametrize("url", ["ftp://ifsul/x", "192.0.2.1/api", "https://"])
def test_ifsul_com_url_sem_esquema_http_ou_sem_host_e_recusado(url):
    with pytest.raises(ValidationError, match="IFSUL_AUTH_URL"):
        _settings(AUTH_PROVIDER="ifsul", IFSUL_AUTH_URL=url, IFSUL_AUTH_PERMITIR_HTTP=True)


def test_provedor_padrao_e_o_simulado():
    assert isinstance(provider_from_settings(_settings()), MockAuthProvider)


def test_moodle_nao_e_mais_um_provedor_valido():
    with pytest.raises(ValidationError, match="AUTH_PROVIDER"):
        _settings(AUTH_PROVIDER="moodle")


async def test_api_nao_sobe_com_ifsul_mal_configurado(monkeypatch):
    from src.core.config import get_settings
    from src.main import app

    monkeypatch.setenv("AUTH_PROVIDER", "ifsul")
    monkeypatch.delenv("IFSUL_AUTH_URL", raising=False)
    get_settings.cache_clear()
    try:
        with pytest.raises(ValidationError, match="IFSUL_AUTH_URL"):
            async with app.router.lifespan_context(app):
                pass
    finally:
        monkeypatch.undo()
        get_settings.cache_clear()
