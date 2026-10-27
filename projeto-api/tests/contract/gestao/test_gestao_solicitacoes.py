"""Contrato de /gestao/solicitacoes (contracts/api.md §13; RF-17)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from tests.helpers import bearer, criar_solicitacao, criar_turma, criar_usuario, vincular

ITEM = {
    "id",
    "aluno",
    "turma",
    "status",
    "solicitada_em",
    "decidida_em",
    "decidida_por",
    "motivo_recusa",
}


@pytest.fixture
async def coord(db):
    return await criar_usuario(db, username="coord.s", nome="Coord S", perfil="coordenacao")


@pytest.fixture
async def pedido(db):
    aluno = await criar_usuario(db, username="aluno.s", nome="Aluno S")
    turma = await criar_turma(db, codigo="TADS-3B", nome="TADS 3º Sem B")
    return await criar_solicitacao(db, turma, aluno.id), aluno, turma


async def test_lista_pendentes_por_padrao_no_formato_do_contrato(client, db, coord, pedido):
    solicitacao, aluno, turma = pedido
    await criar_solicitacao(db, await criar_turma(db), aluno.id, status="recusada")

    r = await client.get("/gestao/solicitacoes", headers=bearer(coord))

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    item = body["items"][0]
    assert set(item) == ITEM
    assert item["id"] == str(solicitacao.id)
    assert item["aluno"] == {"id": str(aluno.id), "username": "aluno.s", "nome": "Aluno S"}
    assert item["turma"] == {"id": str(turma.id), "codigo": "TADS-3B", "nome": "TADS 3º Sem B"}
    assert (item["status"], item["decidida_em"], item["decidida_por"]) == ("pendente", None, None)


async def test_filtros_status_e_turma_e_fila_da_mais_antiga(client, db, coord):
    aluno = await criar_usuario(db, username="a.f")
    t1, t2 = await criar_turma(db), await criar_turma(db)
    agora = datetime.now(UTC)
    nova = await criar_solicitacao(db, t1, aluno.id, solicitada_em=agora)
    antiga = await criar_solicitacao(db, t2, aluno.id, solicitada_em=agora - timedelta(days=1))
    recusada = await criar_solicitacao(db, t1, aluno.id, status="recusada")

    fila = await client.get("/gestao/solicitacoes", headers=bearer(coord))
    por_turma = await client.get(f"/gestao/solicitacoes?turma_id={t1.id}", headers=bearer(coord))
    recusadas = await client.get("/gestao/solicitacoes?status=recusada", headers=bearer(coord))

    assert [i["id"] for i in fila.json()["items"]] == [str(antiga.id), str(nova.id)]
    assert [i["id"] for i in por_turma.json()["items"]] == [str(nova.id)]
    assert [i["id"] for i in recusadas.json()["items"]] == [str(recusada.id)]


@pytest.mark.parametrize("query", ["status=qualquer", "turma_id=abc"])
async def test_filtro_invalido_e_422(client, coord, query):
    assert (
        await client.get(f"/gestao/solicitacoes?{query}", headers=bearer(coord))
    ).status_code == 422


# --- aprovar / recusar ---------------------------------------------------------------------


async def test_aprovar_devolve_a_solicitacao_decidida(client, coord, pedido):
    solicitacao, _, _ = pedido

    r = await client.post(f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(coord))

    assert r.status_code == 200
    body = r.json()
    assert set(body) == ITEM
    assert body["status"] == "aprovada"
    assert body["decidida_por"] == {"id": str(coord.id), "nome": "Coord S"}
    assert body["decidida_em"].endswith("Z")


async def test_recusar_com_motivo(client, coord, pedido):
    solicitacao, _, _ = pedido

    r = await client.post(
        f"/gestao/solicitacoes/{solicitacao.id}/recusar",
        headers=bearer(coord),
        json={"motivo": "Turma completa"},
    )

    assert r.status_code == 200
    assert (r.json()["status"], r.json()["motivo_recusa"]) == ("recusada", "Turma completa")


async def test_recusar_sem_corpo(client, coord, pedido):
    solicitacao, _, _ = pedido

    r = await client.post(f"/gestao/solicitacoes/{solicitacao.id}/recusar", headers=bearer(coord))

    assert (r.status_code, r.json()["motivo_recusa"]) == (200, None)


async def test_motivo_acima_de_300_caracteres_e_422(client, coord, pedido):
    solicitacao, _, _ = pedido

    r = await client.post(
        f"/gestao/solicitacoes/{solicitacao.id}/recusar",
        headers=bearer(coord),
        json={"motivo": "m" * 301},
    )

    assert (r.status_code, r.json()["errors"][0]["campo"]) == (422, "motivo")


@pytest.mark.parametrize("acao", ["aprovar", "recusar"])
async def test_solicitacao_inexistente_e_404(client, coord, acao):
    r = await client.post(f"/gestao/solicitacoes/{uuid.uuid4()}/{acao}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "SOLICITACAO_NAO_ENCONTRADA")


@pytest.mark.parametrize("acao", ["aprovar", "recusar"])
async def test_solicitacao_ja_decidida_e_409(client, db, coord, acao):
    aluno = await criar_usuario(db, username="a.dec")
    solicitacao = await criar_solicitacao(db, await criar_turma(db), aluno.id, status="cancelada")

    r = await client.post(f"/gestao/solicitacoes/{solicitacao.id}/{acao}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (409, "SOLICITACAO_NAO_PENDENTE")


async def test_docente_da_turma_decide_e_docente_alheio_recebe_403(client, db, pedido):
    solicitacao, _, turma = pedido
    da_turma = await criar_usuario(db, username="d.s", perfil="docente")
    alheio = await criar_usuario(db, username="d.x", perfil="docente")
    await vincular(db, turma, da_turma.id, papel="docente")

    nao = await client.post(
        f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(alheio)
    )
    ok = await client.post(
        f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(da_turma)
    )

    assert (nao.status_code, nao.json()["code"]) == (403, "SEM_PERMISSAO")
    assert ok.status_code == 200


@pytest.mark.parametrize("perfil", ["coordenacao", "administrador", "docente"])
async def test_filtro_por_turma_inexistente_e_404_para_todos(client, db, perfil):
    usuario = await criar_usuario(db, username=f"{perfil}.filtro", perfil=perfil)

    r = await client.get(f"/gestao/solicitacoes?turma_id={uuid.uuid4()}", headers=bearer(usuario))

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")
