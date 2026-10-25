"""Paginação `{items, total, limit, offset}` em todas as listas da E1 (RF-29; T066)."""

import pytest

from tests.helpers import bearer, criar_usuario

LISTAS = ["/turmas/disponiveis", "/turmas/minhas", "/solicitacoes/minhas", "/avisos"]


@pytest.fixture
async def aluno(db):
    return await criar_usuario(db, username="aluno.paginacao")


@pytest.mark.parametrize("rota", LISTAS)
async def test_resposta_paginada_com_padroes(client, aluno, rota):
    r = await client.get(rota, headers=bearer(aluno))

    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}


@pytest.mark.parametrize("rota", LISTAS)
async def test_limit_e_offset_sao_ecoados(client, aluno, rota):
    r = await client.get(f"{rota}?limit=100&offset=7", headers=bearer(aluno))

    assert (r.json()["limit"], r.json()["offset"]) == (100, 7)


@pytest.mark.parametrize("rota", LISTAS)
@pytest.mark.parametrize("query", ["limit=0", "limit=101", "offset=-1"])
async def test_limites_fora_da_faixa_sao_422(client, aluno, rota, query):
    r = await client.get(f"{rota}?{query}", headers=bearer(aluno))

    assert r.status_code == 422
    assert r.json()["code"] == "VALIDATION_ERROR"
