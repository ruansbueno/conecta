"""Docente cria evento só para turmas em que leciona (spec E3 US1 cenário 2; RF-36)."""

import pytest

from tests.helpers import bearer, criar_turma, criar_usuario, vincular

EVENTO = {"titulo": "Prova de recuperação", "tipo": "prova", "inicio": "2026-11-30T22:00:00Z"}


@pytest.fixture
async def cenario(db):
    docente = await criar_usuario(db, username="docente.ev", perfil="docente")
    minha = await criar_turma(db, nome="Minha")
    alheia = await criar_turma(db, nome="Alheia")
    await vincular(db, minha, docente.id, papel="docente")
    return docente, minha, alheia


async def test_docente_cria_para_turma_em_que_leciona(client, cenario):
    docente, minha, _ = cenario

    r = await client.post(
        "/gestao/eventos",
        headers=bearer(docente),
        json=EVENTO | {"destinos": [{"tipo": "turma", "turma_id": str(minha.id)}]},
    )

    assert r.status_code == 201


@pytest.mark.parametrize(
    "destino",
    [
        lambda minha, alheia: {"tipo": "todos"},
        lambda minha, alheia: {"tipo": "semestre", "semestre": 3},
        lambda minha, alheia: {"tipo": "docentes"},
        lambda minha, alheia: {"tipo": "turma", "turma_id": str(alheia.id)},
    ],
    ids=["todos", "semestre", "docentes", "turma-alheia"],
)
async def test_docente_com_outro_destino_e_403(client, db, cenario, destino):
    docente, minha, alheia = cenario
    destinos = [{"tipo": "turma", "turma_id": str(minha.id)}, destino(minha, alheia)]

    r = await client.post(
        "/gestao/eventos", headers=bearer(docente), json=EVENTO | {"destinos": destinos}
    )

    assert (r.status_code, r.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")


async def test_docente_vinculado_como_aluno_nao_leciona(client, db):
    # Vínculo de papel aluno não conta como lecionar (permissoes.leciona).
    docente = await criar_usuario(db, username="docente.aluno", perfil="docente")
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="aluno")

    r = await client.post(
        "/gestao/eventos",
        headers=bearer(docente),
        json=EVENTO | {"destinos": [{"tipo": "turma", "turma_id": str(turma.id)}]},
    )

    assert (r.status_code, r.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")
