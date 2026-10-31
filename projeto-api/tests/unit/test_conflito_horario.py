"""Regras puras da detecção de conflito (data-model E3 "Conflito"; plan D-E3-9; RF-44)."""

from datetime import time

import pytest

from src.services.conflitos import mesma_sala, normalizar_local, sobrepoe


@pytest.mark.parametrize(
    ("a", "b"),
    [
        ("Lab 4", "lab 4"),
        ("Laboratório 4", "laboratorio 4"),
        ("  Sala   203 ", "sala 203"),
        ("AUDITÓRIO", "auditorio"),
    ],
)
def test_locais_equivalentes(a, b):
    assert normalizar_local(a) == normalizar_local(b)
    assert mesma_sala(a, b)


@pytest.mark.parametrize(("a", "b"), [("Lab 4", "Lab 5"), ("Sala 203", "Sala 2030")])
def test_locais_diferentes(a, b):
    assert not mesma_sala(a, b)


@pytest.mark.parametrize(("a", "b"), [(None, "Lab 4"), ("Lab 4", None), (None, None), ("  ", "  ")])
def test_sem_local_nunca_e_a_mesma_sala(a, b):
    assert not mesma_sala(a, b)


def _h(texto: str) -> time:
    return time.fromisoformat(texto)


@pytest.mark.parametrize(
    ("a", "b", "esperado"),
    [
        (("19:10", "20:50"), ("19:10", "20:50"), True),
        (("19:10", "20:50"), ("20:00", "21:40"), True),
        (("19:10", "22:00"), ("20:00", "21:00"), True),
        (("19:10", "20:50"), ("20:50", "22:30"), False),
        (("20:50", "22:30"), ("19:10", "20:50"), False),
        (("08:00", "09:40"), ("19:10", "20:50"), False),
    ],
    ids=["igual", "parcial", "contido", "encosta-depois", "encosta-antes", "separados"],
)
def test_sobreposicao_estrita(a, b, esperado):
    assert sobrepoe(_h(a[0]), _h(a[1]), _h(b[0]), _h(b[1])) is esperado
