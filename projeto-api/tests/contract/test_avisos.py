"""Contrato de GET /avisos e GET /avisos/{id} (contracts/api.md §8–9; RF-20, RF-23, RF-29)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from tests.helpers import (
    TODOS,
    bearer,
    criar_aviso,
    criar_turma,
    criar_usuario,
    semestre_destino,
    turma_destino,
    vincular,
)

AGORA = datetime.now(UTC)


@pytest.fixture
async def coord(db):
    return await criar_usuario(
        db, username="maria.coord", nome="Maria Coordenadora", perfil="coordenacao"
    )


@pytest.fixture
async def aluno(db):
    return await criar_usuario(db, username="aluno.avisos", nome="Aluno")


async def test_item_tem_os_campos_do_contrato(client, db, coord, aluno):
    turma_a = await criar_turma(db, nome="TADS 3º Sem A")
    turma_b = await criar_turma(db, nome="TADS 3º Sem B")
    await vincular(db, turma_a, aluno.id)
    publicado = AGORA - timedelta(hours=1)
    aviso = await criar_aviso(
        db,
        coord,
        [turma_destino(turma_a), turma_destino(turma_b)],
        titulo="Reunião de pais e alunos",
        conteudo="Será realizada na sexta, às 19h, no auditório.",
        publicar_em=publicado,
    )

    r = await client.get("/avisos", headers=bearer(aluno))

    assert r.status_code == 200
    item = r.json()["items"][0]
    assert set(item) == {
        "id",
        "titulo",
        "conteudo",
        "autor",
        "publicado_em",
        "editado_em",
        "situacao",
        "destinos",
    }
    assert item["id"] == str(aviso.id)
    assert item["titulo"] == "Reunião de pais e alunos"
    assert item["conteudo"] == "Será realizada na sexta, às 19h, no auditório."
    assert item["autor"] == {"id": str(coord.id), "nome": "Maria Coordenadora"}
    assert datetime.fromisoformat(item["publicado_em"]) == publicado
    assert item["publicado_em"].endswith("Z")
    assert item["editado_em"] is None
    assert item["situacao"] == "ativo"
    destinos = sorted(item["destinos"], key=lambda d: d["turma"]["nome"])
    assert destinos == [
        {
            "tipo": "turma",
            "turma": {"id": str(turma_a.id), "nome": "TADS 3º Sem A"},
            "semestre": None,
        },
        {
            "tipo": "turma",
            "turma": {"id": str(turma_b.id), "nome": "TADS 3º Sem B"},
            "semestre": None,
        },
    ]


async def test_destino_por_semestre_e_para_todos(client, db, coord, aluno):
    await vincular(db, await criar_turma(db, semestre_curso=3), aluno.id)
    await criar_aviso(db, coord, [TODOS, semestre_destino(3)])

    destinos = (await client.get("/avisos", headers=bearer(aluno))).json()["items"][0]["destinos"]

    assert sorted(destinos, key=lambda d: d["tipo"]) == [
        {"tipo": "semestre", "turma": None, "semestre": 3},
        {"tipo": "todos", "turma": None, "semestre": None},
    ]


async def test_publicado_em_e_a_criacao_quando_nao_ha_agendamento(client, db, coord, aluno):
    aviso = await criar_aviso(db, coord, [TODOS])

    item = (await client.get("/avisos", headers=bearer(aluno))).json()["items"][0]

    assert datetime.fromisoformat(item["publicado_em"]) == aviso.criado_em


async def test_ordena_do_mais_recente_para_o_mais_antigo_por_publicado_em(client, db, coord, aluno):
    antigo = await criar_aviso(db, coord, [TODOS], publicar_em=AGORA - timedelta(days=2))
    recente = await criar_aviso(db, coord, [TODOS], publicar_em=AGORA - timedelta(hours=1))
    meio = await criar_aviso(db, coord, [TODOS], publicar_em=AGORA - timedelta(days=1))

    r = await client.get("/avisos", headers=bearer(aluno))

    assert [a["id"] for a in r.json()["items"]] == [str(recente.id), str(meio.id), str(antigo.id)]


async def test_pagina(client, db, coord, aluno):
    for i in range(3):
        await criar_aviso(db, coord, [TODOS], publicar_em=AGORA - timedelta(hours=i + 1))

    r = await client.get("/avisos?limit=2&offset=2", headers=bearer(aluno))

    assert len(r.json()["items"]) == 1
    assert (r.json()["total"], r.json()["limit"], r.json()["offset"]) == (3, 2, 2)


async def test_filtra_por_turma_destino(client, db, coord, aluno):
    turma_a = await criar_turma(db)
    turma_b = await criar_turma(db)
    for turma in (turma_a, turma_b):
        await vincular(db, turma, aluno.id)
    so_a = await criar_aviso(db, coord, [turma_destino(turma_a)])
    a_e_b = await criar_aviso(db, coord, [turma_destino(turma_a), turma_destino(turma_b)])
    await criar_aviso(db, coord, [turma_destino(turma_b)])
    await criar_aviso(db, coord, [TODOS])

    r = await client.get(f"/avisos?turma_id={turma_a.id}", headers=bearer(aluno))

    assert sorted(a["id"] for a in r.json()["items"]) == sorted([str(so_a.id), str(a_e_b.id)])
    assert r.json()["total"] == 2


@pytest.mark.parametrize(
    ("query", "campo"),
    [
        ("situacao=excluido", "situacao"),
        ("situacao=x", "situacao"),
        ("turma_id=abc", "turma_id"),
        ("limit=0", "limit"),
    ],
)
async def test_parametros_invalidos_sao_422(client, aluno, query, campo):
    r = await client.get(f"/avisos?{query}", headers=bearer(aluno))

    assert r.status_code == 422
    assert r.json()["errors"][0]["campo"] == campo


async def test_listar_sem_autenticacao_e_401(client):
    r = await client.get("/avisos")

    assert (r.status_code, r.json()["code"]) == (401, "NAO_AUTENTICADO")


# --- GET /avisos/{id} -----------------------------------------------------------------------


async def test_consulta_por_id_tem_o_mesmo_formato_da_lista(client, db, coord, aluno):
    aviso = await criar_aviso(db, coord, [TODOS])
    item = (await client.get("/avisos", headers=bearer(aluno))).json()["items"][0]

    r = await client.get(f"/avisos/{aviso.id}", headers=bearer(aluno))

    assert r.status_code == 200
    assert r.json() == item


async def test_aviso_inexistente_e_404(client, aluno):
    r = await client.get(f"/avisos/{uuid.uuid4()}", headers=bearer(aluno))

    assert r.status_code == 404
    assert r.json()["code"] == "AVISO_NAO_ENCONTRADO"


async def test_aviso_que_nao_alcanca_o_usuario_e_404_indistinguivel(client, db, coord, aluno):
    aviso = await criar_aviso(db, coord, [turma_destino(await criar_turma(db))])

    r = await client.get(f"/avisos/{aviso.id}", headers=bearer(aluno))

    assert r.status_code == 404
    assert r.json()["code"] == "AVISO_NAO_ENCONTRADO"


async def test_id_que_nao_e_uuid_e_422(client, aluno):
    r = await client.get("/avisos/abc", headers=bearer(aluno))

    assert r.status_code == 422
