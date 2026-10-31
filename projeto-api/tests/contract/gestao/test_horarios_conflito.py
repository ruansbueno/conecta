"""Conflitos de sala e de docente informados, nunca bloqueando (contracts E3 §10; RF-44;
plan D-E3-9; SC-E3-004)."""

import pytest

from tests.helpers import bearer, criar_horario, criar_turma, criar_usuario

AULA = {"dia_semana": 2, "inicio": "19:10", "fim": "20:50", "disciplina": "Redes de Computadores"}


@pytest.fixture
async def turmas(db):
    a = await criar_turma(
        db, codigo="TADS-3A-2026-2", nome="TADS 3º Sem A", periodo_letivo="2026/2"
    )
    b = await criar_turma(db, codigo="SI-3B-2026-2", nome="SI 3º Sem B", periodo_letivo="2026/2")
    return a, b


@pytest.fixture
async def docente(db):
    return await criar_usuario(db, username="docente.conflito", perfil="docente")


async def _cadastrar(client, coord, turma, **campos):
    r = await client.post(
        f"/gestao/turmas/{turma.id}/horarios", headers=bearer(coord), json=AULA | campos
    )
    assert r.status_code == 201, r.text
    return r.json()


async def test_mesma_sala_em_outra_turma_e_informada_e_aceita(client, db, coord, turmas):
    a, b = turmas
    outra = await criar_horario(db, b, dia_semana=2, inicio="20:00", fim="21:40", local="Lab 4")

    body = await _cadastrar(client, coord, a, local="lab  4")

    assert body["horario"]["id"]
    assert body["conflitos"] == [
        {
            "tipo": "sala",
            "local": "Lab 4",
            "horario_id": str(outra.id),
            "turma": {"id": str(b.id), "codigo": "SI-3B-2026-2", "nome": "SI 3º Sem B"},
            "inicio": "20:00",
            "fim": "21:40",
        }
    ]


async def test_mesmo_docente_sobreposto_e_informado(client, db, coord, turmas, docente):
    a, b = turmas
    outra = await criar_horario(db, b, dia_semana=2, local="Sala 1", docente_id=docente.id)

    body = await _cadastrar(client, coord, a, local="Sala 2", docente_id=str(docente.id))

    assert [(c["tipo"], c["horario_id"]) for c in body["conflitos"]] == [("docente", str(outra.id))]


async def test_sala_e_docente_ao_mesmo_tempo_aparecem_os_dois(client, db, coord, turmas, docente):
    a, b = turmas
    outra = await criar_horario(db, b, dia_semana=2, local="Lab 4", docente_id=docente.id)

    body = await _cadastrar(client, coord, a, local="Lab 4", docente_id=str(docente.id))

    assert sorted((c["tipo"], c["horario_id"]) for c in body["conflitos"]) == [
        ("docente", str(outra.id)),
        ("sala", str(outra.id)),
    ]


async def test_mesma_turma_tambem_conflita(client, db, coord, turmas):
    a, _ = turmas
    await criar_horario(db, a, dia_semana=2, local="Lab 4")

    body = await _cadastrar(client, coord, a, local="Lab 4")

    assert [c["tipo"] for c in body["conflitos"]] == ["sala"]


@pytest.mark.parametrize(
    "outra",
    [
        {"dia_semana": 3},
        {"inicio": "20:50", "fim": "22:30"},
        {"inicio": "17:30", "fim": "19:10"},
        {"local": "Lab 5"},
        {"local": None},
    ],
    ids=["outro-dia", "encosta-depois", "encosta-antes", "outra-sala", "sem-local"],
)
async def test_sem_conflito(client, db, coord, turmas, outra):
    a, b = turmas
    await criar_horario(db, b, **({"dia_semana": 2, "local": "Lab 4"} | outra))

    body = await _cadastrar(client, coord, a, local="Lab 4")

    assert body["conflitos"] == []


async def test_turma_de_outro_periodo_nao_conflita(client, db, coord, turmas, docente):
    a, _ = turmas
    antiga = await criar_turma(db, periodo_letivo="2026/1")
    await criar_horario(db, antiga, dia_semana=2, local="Lab 4", docente_id=docente.id)

    body = await _cadastrar(client, coord, a, local="Lab 4", docente_id=str(docente.id))

    assert body["conflitos"] == []


async def test_turma_inativa_nao_conflita(client, db, coord, turmas):
    a, _ = turmas
    inativa = await criar_turma(db, periodo_letivo="2026/2", ativa=False)
    await criar_horario(db, inativa, dia_semana=2, local="Lab 4")

    body = await _cadastrar(client, coord, a, local="Lab 4")

    assert body["conflitos"] == []


async def test_horario_sem_docente_nao_conflita_por_docente(client, db, coord, turmas):
    a, b = turmas
    await criar_horario(db, b, dia_semana=2, local="Sala 1")

    body = await _cadastrar(client, coord, a, local="Sala 2")

    assert body["conflitos"] == []


async def test_na_edicao_o_proprio_horario_fica_de_fora(client, db, coord, turmas):
    a, b = turmas
    proprio = await criar_horario(db, a, dia_semana=2, local="Lab 4")
    outra = await criar_horario(db, b, dia_semana=2, inicio="21:00", fim="22:40", local="Lab 4")

    sem = await client.patch(
        f"/gestao/turmas/{a.id}/horarios/{proprio.id}", headers=bearer(coord), json={"fim": "20:00"}
    )
    com = await client.patch(
        f"/gestao/turmas/{a.id}/horarios/{proprio.id}", headers=bearer(coord), json={"fim": "21:30"}
    )

    assert sem.json()["conflitos"] == []
    assert [c["horario_id"] for c in com.json()["conflitos"]] == [str(outra.id)]
    assert com.status_code == 200


async def test_horario_de_turma_inativa_nao_recebe_conflitos(client, db, coord, turmas):
    # As aulas dela não vão acontecer: avisar seria ruído (plan D-E3-9).
    _, b = turmas
    inativa = await criar_turma(db, periodo_letivo="2026/2", ativa=False)
    await criar_horario(db, b, dia_semana=2, local="Lab 4")

    body = await _cadastrar(client, coord, inativa, local="Lab 4")

    assert body["conflitos"] == []
