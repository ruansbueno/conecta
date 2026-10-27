"""Contrato de POST /gestao/avisos (contracts/api.md §14; RF-24)."""

import uuid

import pytest

from tests.contract.gestao.conftest import futuro
from tests.helpers import bearer, criar_turma, criar_usuario, vincular

CAMPOS = {
    "id",
    "titulo",
    "conteudo",
    "autor",
    "situacao",
    "publicar_em",
    "publicado_em",
    "versao_atual",
    "criado_em",
    "editado_em",
    "arquivado_em",
    "destinos",
}


async def test_publica_para_tres_turmas(client, coord, turmas):
    corpo = {
        "titulo": "Reunião de pais e alunos",
        "conteudo": "Será realizada na sexta, às 19h, no auditório.",
        "destinos": [{"tipo": "turma", "turma_id": str(t.id)} for t in turmas],
    }

    r = await client.post("/gestao/avisos", headers=bearer(coord), json=corpo)

    assert r.status_code == 201
    body = r.json()
    assert set(body) == CAMPOS
    assert (body["situacao"], body["versao_atual"]) == ("ativo", 1)
    assert body["autor"] == {"id": str(coord.id), "nome": "Maria Coordenadora"}
    assert (body["publicar_em"], body["editado_em"], body["arquivado_em"]) == (None, None, None)
    assert body["publicado_em"] == body["criado_em"]
    assert sorted(d["turma"]["nome"] for d in body["destinos"]) == [
        "TADS 3º Sem A",
        "TADS 3º Sem B",
        "TADS 3º Sem C",
    ]


async def test_agendado_guarda_publicar_em(client, coord):
    quando = futuro()

    r = await client.post(
        "/gestao/avisos",
        headers=bearer(coord),
        json={
            "titulo": "Agendado",
            "conteudo": "x",
            "publicar_em": quando,
            "destinos": [{"tipo": "semestre", "semestre": 3}, {"tipo": "docentes"}],
        },
    )

    assert r.status_code == 201
    assert r.json()["publicar_em"] == r.json()["publicado_em"]
    assert {d["tipo"] for d in r.json()["destinos"]} == {"semestre", "docentes"}


async def test_turma_inexistente_e_404(client, coord):
    r = await client.post(
        "/gestao/avisos",
        headers=bearer(coord),
        json={
            "titulo": "Tit",
            "conteudo": "x",
            "destinos": [{"tipo": "turma", "turma_id": str(uuid.uuid4())}],
        },
    )

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_docente_com_destino_fora_das_suas_turmas_e_403(client, db, turmas):
    docente = await criar_usuario(db, username="d.av", perfil="docente")
    await vincular(db, turmas[0], docente.id, papel="docente")

    alheia = await client.post(
        "/gestao/avisos",
        headers=bearer(docente),
        json={
            "titulo": "Tit",
            "conteudo": "x",
            "destinos": [{"tipo": "turma", "turma_id": str(turmas[1].id)}],
        },
    )
    todos = await client.post(
        "/gestao/avisos",
        headers=bearer(docente),
        json={"titulo": "Tit", "conteudo": "x", "destinos": [{"tipo": "todos"}]},
    )

    assert (alheia.status_code, alheia.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")
    assert (todos.status_code, todos.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")


VALIDO = {"titulo": "Título", "conteudo": "Conteúdo", "destinos": [{"tipo": "todos"}]}


@pytest.mark.parametrize(
    ("alteracao", "campo"),
    [
        ({"titulo": "ab"}, "titulo"),
        ({"titulo": "t" * 151}, "titulo"),
        ({"conteudo": ""}, "conteudo"),
        ({"conteudo": "c" * 5001}, "conteudo"),
        ({"publicar_em": "2020-01-01T10:00:00Z"}, "publicar_em"),
        ({"publicar_em": "2030-01-01T10:00:00"}, "publicar_em"),  # sem fuso
        ({"destinos": []}, "destinos"),
        ({"destinos": [{"tipo": "semestre", "semestre": n} for n in range(1, 13)] * 2}, "destinos"),
        ({"destinos": [{"tipo": "todos"}, {"tipo": "todos"}]}, "destinos"),
        ({"destinos": [{"tipo": "turma"}]}, "destinos.0"),
        ({"destinos": [{"tipo": "todos", "semestre": 3}]}, "destinos.0"),
        ({"destinos": [{"tipo": "semestre", "semestre": 13}]}, "destinos.0.semestre"),
        ({"destinos": [{"tipo": "curso"}]}, "destinos.0.tipo"),
    ],
)
async def test_validacoes_sao_422_com_o_campo(client, coord, alteracao, campo):
    r = await client.post("/gestao/avisos", headers=bearer(coord), json={**VALIDO, **alteracao})

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"].startswith(campo)


async def test_turma_inativa_e_422(client, db, coord):
    inativa = await criar_turma(db, ativa=False)

    r = await client.post(
        "/gestao/avisos",
        headers=bearer(coord),
        json={**VALIDO, "destinos": [{"tipo": "turma", "turma_id": str(inativa.id)}]},
    )

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == "destinos.0.turma_id"


async def test_vinte_destinos_e_o_limite(client, db, coord):
    destinos = [{"tipo": "semestre", "semestre": n} for n in range(1, 13)]
    destinos += [{"tipo": "turma", "turma_id": str((await criar_turma(db)).id)} for _ in range(8)]

    r = await client.post(
        "/gestao/avisos", headers=bearer(coord), json={**VALIDO, "destinos": destinos}
    )

    assert r.status_code == 201
    assert len(r.json()["destinos"]) == 20
