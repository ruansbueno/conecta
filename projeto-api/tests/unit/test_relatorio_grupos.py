"""Relatório separa os grupos mock_auth e ifsul_real (spec.md §9.1; T069)."""

import pytest

pytest_plugins = ["pytester"]

SUITE = """
import pytest

@pytest.mark.mock_auth
def test_mock_1(): pass

@pytest.mark.mock_auth
def test_mock_2(): assert False

@pytest.mark.ifsul_real
def test_real(): pass

def test_sem_provedor(): pass
"""


@pytest.fixture
def rodar(pytester):
    pytester.makeini(
        "[pytest]\n"
        "asyncio_default_fixture_loop_scope = function\n"
        "markers =\n    mock_auth: x\n    ifsul_real: y\n"
    )
    pytester.makepyfile(SUITE)

    def _rodar():
        return pytester.runpytest("-p", "tests.relatorio_grupos")

    return _rodar


def test_sem_conta_ifsul_configurada_o_grupo_real_e_ignorado_e_sinalizado(rodar, monkeypatch):
    monkeypatch.delenv("IFSUL_TEST_USERNAME", raising=False)

    resultado = rodar()

    resultado.assert_outcomes(passed=2, failed=1, skipped=1)
    resultado.stdout.fnmatch_lines(
        [
            "*Grupos de teste (spec.md §9.1)*",
            "mock_auth (provedor simulado): 1 passed, 1 failed",
            "ifsul_real (API de autenticação real do IFSul): 1 skipped — NÃO VALIDADO",
            "sem dependência de provedor: 1 passed",
            "*aprovação com mock não valida a integração real*",
        ]
    )


def test_com_conta_ifsul_configurada_o_grupo_real_roda(rodar, monkeypatch):
    monkeypatch.setenv("IFSUL_TEST_USERNAME", "conta.de.teste")

    resultado = rodar()

    resultado.assert_outcomes(passed=3, failed=1)
    resultado.stdout.fnmatch_lines(["ifsul_real (API de autenticação real do IFSul): 1 passed"])
