"""Cada ponto de entrada importa sozinho, num processo limpo (sem a ordem de import dos testes)."""

import os
import subprocess
import sys

import pytest

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.mark.parametrize(
    "modulo",
    [
        "src.main",
        "src.models.usuario",
        "src.models.aviso",
        "scripts.seed_dev_data",
        "scripts.aprovar_solicitacao",
    ],
)
def test_modulo_importa_em_processo_limpo(modulo):
    r = subprocess.run(
        [sys.executable, "-c", f"import {modulo}"], cwd=RAIZ, capture_output=True, text=True
    )

    assert r.returncode == 0, r.stderr
