"""As aulas do docente em todas as turmas (emenda E3.1, RF-54; specs/004)."""

import pytest
from sqlalchemy import update

from src.models.turma import Turma
from tests.helpers import bearer, criar_horario, criar_turma, criar_usuario

URL = "/horarios/minhas"


@pytest.fixture
async def cenario(db):
    c = {
        "A": await criar_turma(db, codigo="TADS-3A-2026-2", nome="TADS 3º Sem A"),
        "B": await criar_turma(db, codigo="TADS-5D-2026-2", nome="TADS 5º Sem D"),
        "inativa": await criar_turma(db, codigo="TADS-1X-2026-1", nome="Antiga"),
    }
    await db.execute(update(Turma).where(Turma.id == c["inativa"].id).values(ativa=False))
    await db.commit()
    for username, perfil in [("docente", "docente"), ("colega", "docente")]:
        c[username] = await criar_usuario(db, username=username, nome=username, perfil=perfil)
    eu = c["docente"].id
    c["qua.B"] = await criar_horario(
        db, c["B"], dia_semana=3, disciplina="Eng. de Software", local="Sala 12", docente_id=eu
    )
    c["seg.21.A"] = await criar_horario(
        db, c["A"], dia_semana=1, inicio="21:00", fim="22:40", docente_id=eu
    )
    c["seg.19.B"] = await criar_horario(
        db, c["B"], dia_semana=1, inicio="19:10", fim="20:50", local="Lab 4", docente_id=eu
    )
    c["do.colega"] = await criar_horario(db, c["A"], dia_semana=2, docente_id=c["colega"].id)
    c["sem.docente"] = await criar_horario(db, c["A"], dia_semana=4)
    c["na.inativa"] = await criar_horario(db, c["inativa"], dia_semana=5, docente_id=eu)
    return c


async def test_docente_ve_as_proprias_aulas_das_turmas_ativas_por_dia_e_hora(client, cenario):
    r = await client.get(URL, headers=bearer(cenario["docente"]))

    assert r.status_code == 200
    corpo = r.json()
    assert [i["id"] for i in corpo["items"]] == [
        str(cenario[n].id) for n in ("seg.19.B", "seg.21.A", "qua.B")
    ]
    assert corpo["items"][0] == {
        "id": str(cenario["seg.19.B"].id),
        "turma_id": str(cenario["B"].id),
        "turma": {"id": str(cenario["B"].id), "codigo": "TADS-5D-2026-2", "nome": "TADS 5º Sem D"},
        "dia_semana": 1,
        "inicio": "19:10",
        "fim": "20:50",
        "disciplina": "Banco de Dados II",
        "local": "Lab 4",
        "docente": {"id": str(cenario["docente"].id), "nome": "docente"},
    }
    assert (corpo["total"], corpo["limit"], corpo["offset"]) == (3, 20, 0)


async def test_paginacao(client, cenario):
    r = await client.get(f"{URL}?limit=2&offset=2", headers=bearer(cenario["docente"]))

    assert r.status_code == 200
    assert [i["id"] for i in r.json()["items"]] == [str(cenario["qua.B"].id)]
    assert r.json()["total"] == 3


async def test_docente_sem_aulas_recebe_lista_vazia(client, db):
    docente = await criar_usuario(db, username="novo.docente", perfil="docente")

    r = await client.get(URL, headers=bearer(docente))

    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}


@pytest.mark.parametrize("perfil", ["aluno", "coordenacao", "administrador"])
async def test_outros_perfis_recebem_403(client, db, perfil):
    pessoa = await criar_usuario(db, username=f"p.{perfil}", perfil=perfil)

    r = await client.get(URL, headers=bearer(pessoa))

    assert r.status_code == 403
    assert r.json()["code"] == "SEM_PERMISSAO"


async def test_sem_sessao_recebe_401(client):
    r = await client.get(URL)

    assert r.status_code == 401
