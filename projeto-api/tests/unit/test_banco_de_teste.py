"""A suíte só recria (downgrade base) um banco cujo nome termina em _test."""

import pytest

from tests.conftest import exigir_banco_de_teste


@pytest.mark.parametrize(
    "url",
    [
        "postgresql+asyncpg://conecta:conecta@localhost:5433/conecta_dev",
        "postgresql+asyncpg://u:p@servidor.ifsul:5432/conecta",
        "postgresql+asyncpg://u:p@h/conecta_test_backup",
    ],
)
def test_recusa_banco_que_nao_e_de_teste(url):
    with pytest.raises(pytest.UsageError, match="_test"):
        exigir_banco_de_teste(url)


def test_aceita_banco_de_teste():
    exigir_banco_de_teste("postgresql+asyncpg://conecta:conecta@localhost:5433/conecta_test")
