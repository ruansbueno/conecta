"""Quem consulta a grade de uma turma (spec E3 US5; RF-45; plan D-E3-10)."""

import uuid

import pytest
from sqlalchemy import delete

from src.models.vinculo_turma import VinculoTurma
from tests.helpers import bearer, criar_horario, criar_turma, criar_usuario, vincular


@pytest.fixture
async def turma(db):
    return await criar_turma(db)


def _url(turma_id) -> str:
    return f"/turmas/{turma_id}/horarios"


@pytest.mark.parametrize("papel", ["aluno", "docente"])
async def test_vinculado_ve_a_grade_ordenada_por_dia_e_hora(client, db, turma, papel):
    pessoa = await criar_usuario(db, username=f"vinc.{papel}", perfil=papel)
    await vincular(db, turma, pessoa.id, papel=papel)
    docente = await criar_usuario(db, username="helena", nome="Helena Prado", perfil="docente")
    quarta = await criar_horario(db, turma, dia_semana=3)
    segunda = await criar_horario(
        db, turma, dia_semana=1, inicio="21:00", fim="22:40", local="Lab 4", docente_id=docente.id
    )
    cedo = await criar_horario(db, turma, dia_semana=1, inicio="19:10", fim="20:50")

    r = await client.get(_url(turma.id), headers=bearer(pessoa))

    assert r.status_code == 200
    itens = r.json()["items"]
    assert [i["id"] for i in itens] == [str(cedo.id), str(segunda.id), str(quarta.id)]
    assert itens[1] == {
        "id": str(segunda.id),
        "turma_id": str(turma.id),
        "dia_semana": 1,
        "inicio": "21:00",
        "fim": "22:40",
        "disciplina": "Banco de Dados II",
        "local": "Lab 4",
        "docente": {"id": str(docente.id), "nome": "Helena Prado"},
    }
    assert (r.json()["total"], r.json()["limit"], r.json()["offset"]) == (3, 20, 0)


@pytest.mark.parametrize("perfil", ["aluno", "docente"])
async def test_sem_vinculo_e_403(client, db, turma, perfil):
    pessoa = await criar_usuario(db, username=f"sem.vinc.{perfil}", perfil=perfil)
    await criar_horario(db, turma)

    r = await client.get(_url(turma.id), headers=bearer(pessoa))

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.mark.parametrize("perfil", ["coordenacao", "administrador"])
async def test_gestao_consulta_qualquer_turma(client, db, turma, perfil):
    pessoa = await criar_usuario(db, username=f"gestao.{perfil}", perfil=perfil)
    await criar_horario(db, turma)

    r = await client.get(_url(turma.id), headers=bearer(pessoa))

    assert (r.status_code, r.json()["total"]) == (200, 1)


@pytest.mark.parametrize("perfil", ["aluno", "coordenacao"])
async def test_turma_inativa_e_404_para_todos(client, db, perfil):
    inativa = await criar_turma(db, ativa=False)
    pessoa = await criar_usuario(db, username=f"inativa.{perfil}", perfil=perfil)
    if perfil == "aluno":
        await vincular(db, inativa, pessoa.id)
    await criar_horario(db, inativa)

    r = await client.get(_url(inativa.id), headers=bearer(pessoa))

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_turma_inexistente_e_404_antes_da_permissao(client, db):
    aluno = await criar_usuario(db, username="aluno.inexistente")

    r = await client.get(_url(uuid.uuid4()), headers=bearer(aluno))

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_turma_sem_grade_e_lista_vazia(client, db, turma):
    aluno = await criar_usuario(db, username="aluno.vazio")
    await vincular(db, turma, aluno.id)

    r = await client.get(_url(turma.id), headers=bearer(aluno))

    assert (r.status_code, r.json()["items"], r.json()["total"]) == (200, [], 0)


async def test_vinculo_removido_corta_o_acesso(client, db, turma):
    aluno = await criar_usuario(db, username="aluno.saiu")
    await vincular(db, turma, aluno.id)
    await db.execute(delete(VinculoTurma).where(VinculoTurma.usuario_id == aluno.id))
    await db.commit()

    r = await client.get(_url(turma.id), headers=bearer(aluno))

    assert r.status_code == 403


async def test_sem_autenticacao_e_401(client, turma):
    r = await client.get(_url(turma.id))

    assert r.status_code == 401
