"""Contrato do CRUD de /gestao/turmas/{id}/horarios (contracts E3 §10–13; RF-43, RF-47)."""

import uuid

import pytest

from tests.helpers import bearer, criar_horario, criar_turma, criar_usuario

AULA = {
    "dia_semana": 1,
    "inicio": "19:10",
    "fim": "20:50",
    "disciplina": "Banco de Dados II",
    "local": "Lab 4",
}
CAMPOS = {"id", "turma_id", "dia_semana", "inicio", "fim", "disciplina", "local", "docente"}


@pytest.fixture
async def turma(db):
    return await criar_turma(db, nome="TADS 3º Sem A")


@pytest.fixture
async def docente(db):
    return await criar_usuario(db, username="helena.prado", nome="Helena Prado", perfil="docente")


def _url(turma, horario_id=None) -> str:
    base = f"/gestao/turmas/{turma.id}/horarios"
    return f"{base}/{horario_id}" if horario_id else base


async def test_cria_aula_com_docente_e_sem_conflito(client, coord, turma, docente):
    r = await client.post(
        _url(turma), headers=bearer(coord), json=AULA | {"docente_id": str(docente.id)}
    )

    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"horario", "conflitos"}
    assert body["conflitos"] == []
    assert set(body["horario"]) == CAMPOS
    assert body["horario"]["turma_id"] == str(turma.id)
    assert (body["horario"]["inicio"], body["horario"]["fim"]) == ("19:10", "20:50")
    assert body["horario"]["docente"] == {"id": str(docente.id), "nome": "Helena Prado"}


async def test_local_e_docente_sao_opcionais(client, coord, turma):
    corpo = {k: v for k, v in AULA.items() if k != "local"}

    r = await client.post(_url(turma), headers=bearer(coord), json=corpo)

    assert r.status_code == 201
    assert (r.json()["horario"]["local"], r.json()["horario"]["docente"]) == (None, None)


@pytest.mark.parametrize(
    ("campos", "campo"),
    [
        ({"dia_semana": 0}, "dia_semana"),
        ({"dia_semana": 8}, "dia_semana"),
        ({"inicio": "7:10"}, "inicio"),
        ({"inicio": "19:10:00"}, "inicio"),
        ({"inicio": "24:00"}, "inicio"),
        ({"fim": "19:10"}, "fim"),
        ({"fim": "18:00"}, "fim"),
        ({"disciplina": "B"}, "disciplina"),
        ({"disciplina": "x" * 121}, "disciplina"),
        ({"local": "x" * 81}, "local"),
        ({"local": ""}, "local"),
        ({"docente_id": "abc"}, "docente_id"),
        ({"sala": "Lab"}, "sala"),
    ],
    ids=[
        "dia-0",
        "dia-8",
        "hora-sem-zero",
        "com-segundos",
        "hora-24",
        "fim-igual",
        "fim-antes",
        "disciplina-curta",
        "disciplina-longa",
        "local-longo",
        "local-vazio",
        "docente-id",
        "campo-desconhecido",
    ],
)
async def test_validacao_e_422(client, coord, turma, campos, campo):
    r = await client.post(_url(turma), headers=bearer(coord), json=AULA | campos)

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == campo


async def test_turma_inexistente_e_404(client, coord):
    r = await client.post(
        f"/gestao/turmas/{uuid.uuid4()}/horarios", headers=bearer(coord), json=AULA
    )

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_docente_inexistente_e_404(client, coord, turma):
    r = await client.post(
        _url(turma), headers=bearer(coord), json=AULA | {"docente_id": str(uuid.uuid4())}
    )

    assert (r.status_code, r.json()["code"]) == (404, "USUARIO_NAO_ENCONTRADO")


@pytest.mark.parametrize("perfil", ["aluno", "coordenacao", "administrador"])
async def test_docente_sem_perfil_docente_e_409(client, db, coord, turma, perfil):
    pessoa = await criar_usuario(db, username=f"nao.docente.{perfil}", perfil=perfil)

    r = await client.post(
        _url(turma), headers=bearer(coord), json=AULA | {"docente_id": str(pessoa.id)}
    )

    assert (r.status_code, r.json()["code"]) == (409, "PERFIL_INCOMPATIVEL")


async def test_docente_desativado_e_aceito(client, db, coord, turma):
    # O que a regra pede é o perfil; a coordenação decide se troca (plan D-E3-11).
    inativo = await criar_usuario(db, username="docente.inativo", perfil="docente", ativo=False)

    r = await client.post(
        _url(turma), headers=bearer(coord), json=AULA | {"docente_id": str(inativo.id)}
    )

    assert r.status_code == 201


@pytest.mark.parametrize("perfil", ["docente", "aluno"])
async def test_so_a_gestao_monta_a_grade(client, db, turma, perfil):
    pessoa = await criar_usuario(db, username=f"sem.grade.{perfil}", perfil=perfil)
    horario = await criar_horario(db, turma)

    respostas = [
        await client.post(_url(turma), headers=bearer(pessoa), json=AULA),
        await client.get(_url(turma), headers=bearer(pessoa)),
        await client.patch(_url(turma, horario.id), headers=bearer(pessoa), json={"local": "X"}),
        await client.delete(_url(turma, horario.id), headers=bearer(pessoa)),
    ]

    assert [(r.status_code, r.json()["code"]) for r in respostas] == [(403, "SEM_PERMISSAO")] * 4


async def test_lista_ordenada_por_dia_e_hora_e_filtra_dia(client, db, coord, turma):
    quarta = await criar_horario(db, turma, dia_semana=3, inicio="19:10", fim="20:50")
    segunda_tarde = await criar_horario(db, turma, dia_semana=1, inicio="21:00", fim="22:40")
    segunda_cedo = await criar_horario(db, turma, dia_semana=1, inicio="19:10", fim="20:50")
    outra = await criar_turma(db)
    await criar_horario(db, outra)

    todas = await client.get(_url(turma), headers=bearer(coord))
    segunda = await client.get(f"{_url(turma)}?dia_semana=1", headers=bearer(coord))

    assert todas.status_code == 200
    assert (todas.json()["total"], todas.json()["limit"], todas.json()["offset"]) == (3, 20, 0)
    assert [h["id"] for h in todas.json()["items"]] == [
        str(segunda_cedo.id),
        str(segunda_tarde.id),
        str(quarta.id),
    ]
    assert set(todas.json()["items"][0]) == CAMPOS
    assert [h["id"] for h in segunda.json()["items"]] == [
        str(segunda_cedo.id),
        str(segunda_tarde.id),
    ]


async def test_gestao_ve_a_grade_de_turma_inativa(client, db, coord):
    inativa = await criar_turma(db, ativa=False)
    await criar_horario(db, inativa)

    r = await client.get(_url(inativa), headers=bearer(coord))

    assert (r.status_code, r.json()["total"]) == (200, 1)


async def test_lista_de_turma_inexistente_e_404(client, coord):
    r = await client.get(f"/gestao/turmas/{uuid.uuid4()}/horarios", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_editar_devolve_o_envelope(client, db, coord, turma, docente):
    horario = await criar_horario(db, turma, local="Lab 4")

    r = await client.patch(
        _url(turma, horario.id),
        headers=bearer(coord),
        json={"local": "Lab 5", "fim": "21:00", "docente_id": str(docente.id)},
    )

    assert r.status_code == 200
    assert set(r.json()) == {"horario", "conflitos"}
    assert (r.json()["horario"]["local"], r.json()["horario"]["fim"]) == ("Lab 5", "21:00")
    assert r.json()["horario"]["docente"]["id"] == str(docente.id)


async def test_editar_pode_tirar_local_e_docente(client, db, coord, turma, docente):
    horario = await criar_horario(db, turma, local="Lab 4", docente_id=docente.id)

    r = await client.patch(
        _url(turma, horario.id), headers=bearer(coord), json={"local": None, "docente_id": None}
    )

    assert (r.json()["horario"]["local"], r.json()["horario"]["docente"]) == (None, None)


@pytest.mark.parametrize(
    ("corpo", "campo"),
    [
        ({"inicio": "21:00"}, "fim"),
        ({"fim": "19:00"}, "fim"),
        ({}, "body"),
        ({"dia_semana": None}, "body"),
        ({"local": "Lab 4"}, "body"),
    ],
    ids=["inicio-depois-do-fim", "fim-antes-do-inicio", "vazio", "dia-nulo", "nenhuma-alteracao"],
)
async def test_editar_invalido_e_422(client, db, coord, turma, corpo, campo):
    horario = await criar_horario(db, turma, local="Lab 4")

    r = await client.patch(_url(turma, horario.id), headers=bearer(coord), json=corpo)

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == campo


async def test_editar_com_docente_sem_perfil_e_409(client, db, coord, turma):
    aluno = await criar_usuario(db, username="aluno.grade")
    horario = await criar_horario(db, turma)

    r = await client.patch(
        _url(turma, horario.id), headers=bearer(coord), json={"docente_id": str(aluno.id)}
    )

    assert (r.status_code, r.json()["code"]) == (409, "PERFIL_INCOMPATIVEL")


async def test_horario_de_outra_turma_e_404(client, db, coord, turma):
    outra = await criar_turma(db)
    horario = await criar_horario(db, outra)

    patch = await client.patch(_url(turma, horario.id), headers=bearer(coord), json={"local": "X"})
    delete = await client.delete(_url(turma, horario.id), headers=bearer(coord))

    assert (patch.status_code, patch.json()["code"]) == (404, "HORARIO_NAO_ENCONTRADO")
    assert (delete.status_code, delete.json()["code"]) == (404, "HORARIO_NAO_ENCONTRADO")


async def test_remover_e_fisico(client, db, coord, turma):
    horario = await criar_horario(db, turma)

    r = await client.delete(_url(turma, horario.id), headers=bearer(coord))
    de_novo = await client.delete(_url(turma, horario.id), headers=bearer(coord))

    assert (r.status_code, r.content) == (204, b"")
    assert (de_novo.status_code, de_novo.json()["code"]) == (404, "HORARIO_NAO_ENCONTRADO")
    assert (await client.get(_url(turma), headers=bearer(coord))).json()["total"] == 0
