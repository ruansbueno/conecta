"""Contrato de POST /gestao/eventos (contracts E3 §4, §6; RF-35)."""

import uuid

import pytest
from sqlalchemy import select

from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao
from tests.helpers import bearer, criar_turma, criar_usuario

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
    "versao_atual",
    "criado_em",
    "editado_em",
    "arquivado_em",
    "destinos",
}

BANCA = {
    "titulo": "Defesas de TCC II",
    "descricao": "Cinco defesas, com arguição aberta ao público.",
    "tipo": "banca",
    "inicio": "2026-11-24T17:00:00Z",
    "fim": "2026-11-24T21:00:00Z",
    "local": "Sala 203",
    "destinos": [{"tipo": "semestre", "semestre": 6}, {"tipo": "docentes"}],
}


async def test_cria_na_versao_1_com_versao_e_historico(client, db, coord):
    r = await client.post("/gestao/eventos", headers=bearer(coord), json=BANCA)

    assert r.status_code == 201
    body = r.json()
    assert set(body) == CAMPOS
    assert (body["situacao"], body["versao_atual"]) == ("ativo", 1)
    assert body["autor"] == {"id": str(coord.id), "nome": "Maria Coordenadora"}
    assert (body["tipo"], body["local"]) == ("banca", "Sala 203")
    assert (body["inicio"], body["fim"]) == ("2026-11-24T17:00:00Z", "2026-11-24T21:00:00Z")
    assert (body["editado_em"], body["arquivado_em"]) == (None, None)
    assert {d["tipo"] for d in body["destinos"]} == {"semestre", "docentes"}

    versao = await db.scalar(select(EventoVersao))
    historico = await db.scalar(select(EventoHistorico))
    assert (versao.versao, versao.titulo, versao.local) == (1, "Defesas de TCC II", "Sala 203")
    assert (historico.tipo, historico.versao, historico.usuario_id) == ("criado", 1, coord.id)


async def test_campos_opcionais_podem_faltar(client, coord):
    corpo = {
        "titulo": "Prazo de matrícula",
        "tipo": "data_importante",
        "inicio": "2026-12-01T03:00:00Z",
        "destinos": [{"tipo": "todos"}],
    }

    r = await client.post("/gestao/eventos", headers=bearer(coord), json=corpo)

    assert r.status_code == 201
    assert (r.json()["descricao"], r.json()["fim"], r.json()["local"]) == (None, None, None)


async def test_data_passada_e_aceita(client, coord):
    # Registro do que já aconteceu (plan D-E3-6).
    r = await client.post(
        "/gestao/eventos",
        headers=bearer(coord),
        json=BANCA | {"inicio": "2020-03-02T10:00:00Z", "fim": "2020-03-02T12:00:00Z"},
    )

    assert r.status_code == 201


async def test_destino_para_turma_traz_o_nome(client, db, coord):
    turma = await criar_turma(db, nome="TADS 6º Sem")

    r = await client.post(
        "/gestao/eventos",
        headers=bearer(coord),
        json=BANCA | {"destinos": [{"tipo": "turma", "turma_id": str(turma.id)}]},
    )

    assert r.json()["destinos"] == [
        {"tipo": "turma", "turma": {"id": str(turma.id), "nome": "TADS 6º Sem"}, "semestre": None}
    ]


@pytest.mark.parametrize(
    ("campos", "campo"),
    [
        ({"fim": "2026-11-24T17:00:00Z"}, "fim"),
        ({"fim": "2026-11-24T16:59:00Z"}, "fim"),
        ({"titulo": "ab"}, "titulo"),
        ({"titulo": "x" * 151}, "titulo"),
        ({"descricao": "x" * 5001}, "descricao"),
        ({"tipo": "festa"}, "tipo"),
        ({"local": "x" * 121}, "local"),
        ({"local": ""}, "local"),
        ({"descricao": ""}, "descricao"),
        ({"inicio": "2026-11-24T17:00:00"}, "inicio"),
        ({"destinos": []}, "destinos"),
        ({"destinos": [{"tipo": "todos"}] * 2}, "destinos"),
        ({"destinos": [{"tipo": "semestre", "semestre": s} for s in range(1, 13)] * 2}, "destinos"),
    ],
    ids=[
        "fim-igual",
        "fim-antes",
        "titulo-curto",
        "titulo-longo",
        "descricao-longa",
        "tipo",
        "local-longo",
        "local-vazio",
        "descricao-vazia",
        "inicio-sem-fuso",
        "sem-destino",
        "destino-repetido",
        "mais-de-20",
    ],
)
async def test_validacao_e_422(client, coord, campos, campo):
    r = await client.post("/gestao/eventos", headers=bearer(coord), json=BANCA | campos)

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"].startswith(campo)


async def test_campo_desconhecido_e_422(client, coord):
    r = await client.post("/gestao/eventos", headers=bearer(coord), json=BANCA | {"cor": "azul"})

    assert r.status_code == 422


async def test_turma_inexistente_e_404(client, coord):
    r = await client.post(
        "/gestao/eventos",
        headers=bearer(coord),
        json=BANCA | {"destinos": [{"tipo": "turma", "turma_id": str(uuid.uuid4())}]},
    )

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_turma_inativa_e_422(client, db, coord):
    turma = await criar_turma(db, ativa=False)

    r = await client.post(
        "/gestao/eventos",
        headers=bearer(coord),
        json=BANCA | {"destinos": [{"tipo": "turma", "turma_id": str(turma.id)}]},
    )

    assert r.status_code == 422
    assert r.json()["errors"][0]["campo"] == "destinos.0.turma_id"


async def test_aluno_e_403(client, db):
    aluno = await criar_usuario(db, username="aluno.ev")

    r = await client.post("/gestao/eventos", headers=bearer(aluno), json=BANCA)

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


async def test_administracao_cria_para_qualquer_publico(client, db):
    admin = await criar_usuario(db, username="admin.ev", perfil="administrador")

    r = await client.post(
        "/gestao/eventos", headers=bearer(admin), json=BANCA | {"destinos": [{"tipo": "todos"}]}
    )

    assert r.status_code == 201
