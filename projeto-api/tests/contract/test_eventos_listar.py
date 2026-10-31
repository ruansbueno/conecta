"""Contrato de GET /eventos e GET /eventos/{id} (contracts E3 §1, §2; RF-37, RF-38)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from tests.helpers import (
    TODOS,
    bearer,
    criar_evento,
    criar_turma,
    criar_usuario,
    turma_destino,
    vincular,
)

CAMPOS = {
    "id",
    "titulo",
    "descricao",
    "tipo",
    "inicio",
    "fim",
    "local",
    "autor",
    "situacao",
    "editado_em",
    "destinos",
}
AMANHA = datetime.now(UTC) + timedelta(days=1)


@pytest.fixture
async def coord(db):
    return await criar_usuario(db, username="coord.ag", nome="Marina Duarte", perfil="coordenacao")


@pytest.fixture
async def aluno(db):
    return await criar_usuario(db, username="aluno.ag")


async def test_item_tem_o_formato_do_contrato(client, coord, aluno, db):
    evento = await criar_evento(
        db,
        coord,
        [TODOS],
        titulo="Defesas de TCC II",
        descricao="Cinco defesas.",
        tipo="banca",
        inicio=AMANHA,
        fim=AMANHA + timedelta(hours=4),
        local="Sala 203",
    )

    r = await client.get("/eventos", headers=bearer(aluno))

    assert r.status_code == 200
    body = r.json()
    assert (body["total"], body["limit"], body["offset"]) == (1, 20, 0)
    (item,) = body["items"]
    assert set(item) == CAMPOS
    assert item["id"] == str(evento.id)
    assert item["autor"] == {"id": str(coord.id), "nome": "Marina Duarte"}
    assert (item["tipo"], item["local"], item["situacao"]) == ("banca", "Sala 203", "ativo")
    assert item["destinos"] == [{"tipo": "todos", "turma": None, "semestre": None}]


async def test_ordem_por_inicio_crescente(client, coord, aluno, db):
    depois = await criar_evento(db, coord, [TODOS], inicio=AMANHA + timedelta(days=2))
    antes = await criar_evento(db, coord, [TODOS], inicio=AMANHA)
    meio = await criar_evento(db, coord, [TODOS], inicio=AMANHA + timedelta(days=1))

    r = await client.get("/eventos", headers=bearer(aluno))

    assert [i["id"] for i in r.json()["items"]] == [str(antes.id), str(meio.id), str(depois.id)]


async def test_paginacao(client, coord, aluno, db):
    for d in range(5):
        await criar_evento(db, coord, [TODOS], inicio=AMANHA + timedelta(days=d))

    r = await client.get("/eventos?limit=2&offset=2", headers=bearer(aluno))

    assert (r.json()["total"], len(r.json()["items"])) == (5, 2)


async def test_filtro_por_tipo(client, coord, aluno, db):
    banca = await criar_evento(db, coord, [TODOS], tipo="banca")
    await criar_evento(db, coord, [TODOS], tipo="palestra")

    r = await client.get("/eventos?tipo=banca", headers=bearer(aluno))

    assert [i["id"] for i in r.json()["items"]] == [str(banca.id)]


async def test_filtro_por_turma(client, coord, db):
    turma, outra = await criar_turma(db), await criar_turma(db)
    aluno = await criar_usuario(db, username="aluno.turma")
    await vincular(db, turma, aluno.id)
    await vincular(db, outra, aluno.id)
    da_turma = await criar_evento(db, coord, [turma_destino(turma)])
    await criar_evento(db, coord, [turma_destino(outra)])
    await criar_evento(db, coord, [TODOS])

    r = await client.get(f"/eventos?turma_id={turma.id}", headers=bearer(aluno))

    assert [i["id"] for i in r.json()["items"]] == [str(da_turma.id)]


async def test_lista_de_arquivados(client, coord, aluno, db):
    arquivado = await criar_evento(db, coord, [TODOS], situacao="arquivado")
    await criar_evento(db, coord, [TODOS])

    r = await client.get("/eventos?situacao=arquivado", headers=bearer(aluno))

    assert [i["id"] for i in r.json()["items"]] == [str(arquivado.id)]
    assert r.json()["items"][0]["situacao"] == "arquivado"


async def test_sem_eventos_e_lista_vazia(client, aluno):
    r = await client.get("/eventos", headers=bearer(aluno))

    assert (r.status_code, r.json()["items"], r.json()["total"]) == (200, [], 0)


@pytest.mark.parametrize(
    ("query", "campo"),
    [
        ("de=2026-11-30T00:00:00Z&ate=2026-11-01T00:00:00Z", "ate"),
        ("de=2026-11-01T00:00:00", "de"),
        ("tipo=festa", "tipo"),
        ("situacao=excluido", "situacao"),
        ("turma_id=abc", "turma_id"),
        ("incluir_encerrados=talvez", "incluir_encerrados"),
    ],
    ids=["ate-antes-de-de", "de-sem-fuso", "tipo", "situacao", "turma-id", "booleano"],
)
async def test_parametro_invalido_e_422(client, aluno, query, campo):
    r = await client.get(f"/eventos?{query}", headers=bearer(aluno))

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == campo


async def test_ate_igual_a_de_e_intervalo_vazio(client, coord, aluno, db):
    await criar_evento(db, coord, [TODOS], inicio=datetime(2026, 11, 10, 12, tzinfo=UTC))

    r = await client.get(
        "/eventos?de=2026-11-10T12:00:00Z&ate=2026-11-10T12:00:00Z&incluir_encerrados=true",
        headers=bearer(aluno),
    )

    assert (r.status_code, r.json()["total"]) == (200, 0)


async def test_sem_autenticacao_e_401(client):
    r = await client.get("/eventos")

    assert (r.status_code, r.json()["code"]) == (401, "NAO_AUTENTICADO")


async def test_detalhe_de_evento_visivel(client, coord, aluno, db):
    evento = await criar_evento(db, coord, [TODOS], titulo="Palestra de abertura")

    r = await client.get(f"/eventos/{evento.id}", headers=bearer(aluno))

    assert r.status_code == 200
    assert set(r.json()) == CAMPOS
    assert r.json()["titulo"] == "Palestra de abertura"


async def test_detalhe_de_arquivado_que_alcanca_e_200(client, coord, aluno, db):
    evento = await criar_evento(db, coord, [TODOS], situacao="arquivado")

    r = await client.get(f"/eventos/{evento.id}", headers=bearer(aluno))

    assert (r.status_code, r.json()["situacao"]) == (200, "arquivado")


@pytest.mark.parametrize("caso", ["excluido", "fora-do-alcance", "inexistente"])
async def test_detalhe_indisponivel_e_404_indistinguivel(client, coord, aluno, db, caso):
    turma = await criar_turma(db)
    match caso:
        case "excluido":
            evento_id = (await criar_evento(db, coord, [TODOS], situacao="excluido")).id
        case "fora-do-alcance":
            evento_id = (await criar_evento(db, coord, [turma_destino(turma)])).id
        case _:
            evento_id = uuid.uuid4()

    r = await client.get(f"/eventos/{evento_id}", headers=bearer(aluno))

    assert (r.status_code, r.json()["code"]) == (404, "EVENTO_NAO_ENCONTRADO")


async def test_filtro_por_turma_alheia_nao_vaza(client, coord, aluno, db):
    alheia = await criar_turma(db)
    await criar_evento(db, coord, [turma_destino(alheia)])

    r = await client.get(f"/eventos?turma_id={alheia.id}", headers=bearer(aluno))

    assert (r.status_code, r.json()["total"]) == (200, 0)


async def test_ate_igual_a_de_e_vazio_mesmo_com_evento_em_andamento_no_instante(
    client, coord, aluno, db
):
    inicio = datetime(2026, 11, 10, 11, tzinfo=UTC)
    await criar_evento(db, coord, [TODOS], inicio=inicio, fim=inicio + timedelta(hours=2))

    r = await client.get(
        "/eventos?de=2026-11-10T12:00:00Z&ate=2026-11-10T12:00:00Z&incluir_encerrados=true",
        headers=bearer(aluno),
    )

    assert (r.status_code, r.json()["total"]) == (200, 0)
