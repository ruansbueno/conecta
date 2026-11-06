"""Plugin pytest: grupos de teste por provedor de autenticação (spec.md §9.1).

- `ifsul_real` é ignorado sem uma conta institucional de teste (IFSUL_TEST_USERNAME);
- ao final, o relatório lista `mock_auth`, `ifsul_real` e os demais testes separadamente,
  para que aprovação com o provedor simulado nunca seja lida como validação da integração real.
"""

import os
from collections import Counter, defaultdict

import pytest

MOCK = "mock_auth (provedor simulado)"
REAL = "ifsul_real (API de autenticação real do IFSul)"
DEMAIS = "sem dependência de provedor"
ORDEM_RESULTADOS = ("passed", "failed", "skipped", "error")


def _grupo(item) -> str:
    if "ifsul_real" in item.keywords:
        return REAL
    if "mock_auth" in item.keywords:
        return MOCK
    return DEMAIS


class _RelatorioGrupos:
    """Estado por sessão do pytest (não global: o pytester roda sessões dentro da mesma)."""

    def __init__(self):
        self.grupo_por_teste: dict[str, str] = {}
        self.resultados: dict[str, Counter] = defaultdict(Counter)

    def pytest_collection_modifyitems(self, config, items):
        skip = pytest.mark.skip(reason="ifsul_real: IFSUL_TEST_USERNAME não configurado")
        for item in items:
            self.grupo_por_teste[item.nodeid] = _grupo(item)
            sem_conta = not os.environ.get("IFSUL_TEST_USERNAME")
            if self.grupo_por_teste[item.nodeid] == REAL and sem_conta:
                item.add_marker(skip)

    def pytest_runtest_logreport(self, report):
        grupo = self.grupo_por_teste.get(report.nodeid)
        if grupo is None:
            return
        if report.when == "call":
            self.resultados[grupo][report.outcome] += 1
        elif report.when == "setup" and not report.passed:
            self.resultados[grupo]["error" if report.failed else report.outcome] += 1

    def pytest_terminal_summary(self, terminalreporter):
        tr = terminalreporter
        tr.section("Grupos de teste (spec.md §9.1)")
        for grupo in (MOCK, REAL, DEMAIS):
            contagem = self.resultados.get(grupo)
            if not contagem:
                continue
            partes = ", ".join(f"{contagem[r]} {r}" for r in ORDEM_RESULTADOS if contagem[r])
            sufixo = " — NÃO VALIDADO" if grupo == REAL and not contagem["passed"] else ""
            tr.write_line(f"{grupo}: {partes}{sufixo}")
        tr.write_line(
            "Atenção: aprovação com mock não valida a integração real com a API do IFSul."
        )


def pytest_configure(config):
    config.pluginmanager.register(_RelatorioGrupos(), "relatorio_grupos_estado")
