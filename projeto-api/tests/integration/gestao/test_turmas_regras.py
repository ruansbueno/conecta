"""Regras de turma na gestão (RF-18; plan-e2 D-E2-1)."""

import pytest

from tests.helpers import (
    TODOS,
    bearer,
    criar_aviso,
    criar_turma,
    criar_usuario,
    turma_destino,
    vincular,
)


@pytest.fixture
async def cenario(db):
    docente = await criar_usuario(db, username="d.turmas", perfil="docente")
    minha = await criar_turma(db, codigo="MINHA")
    alheia = await criar_turma(db, codigo="ALHEIA")
    await vincular(db, minha, docente.id, papel="docente")
    return docente, minha, alheia


async def test_docente_lista_so_as_turmas_em_que_leciona(client, cenario):
    docente, _, _ = cenario

    r = await client.get("/gestao/turmas", headers=bearer(docente))

    assert [t["codigo"] for t in r.json()["items"]] == ["MINHA"]
    assert r.json()["total"] == 1


async def test_docente_ve_detalhe_da_sua_turma_e_recebe_403_na_alheia(client, cenario):
    docente, minha, alheia = cenario

    ok = await client.get(f"/gestao/turmas/{minha.id}", headers=bearer(docente))
    nao = await client.get(f"/gestao/turmas/{alheia.id}", headers=bearer(docente))

    assert ok.status_code == 200
    assert (nao.status_code, nao.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.mark.parametrize("metodo", ["POST", "PATCH", "DELETE"])
async def test_docente_nao_cria_edita_nem_desativa(client, cenario, metodo):
    docente, minha, _ = cenario
    rota = "/gestao/turmas" if metodo == "POST" else f"/gestao/turmas/{minha.id}"

    r = await client.request(metodo, rota, headers=bearer(docente), json={"nome": "Outra"})

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


async def test_desativar_preserva_vinculos_e_suspende_avisos_da_turma(client, db):
    coord = await criar_usuario(db, username="c.turmas", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.turmas")
    turma = await criar_turma(db)
    await vincular(db, turma, aluno.id)
    await criar_aviso(db, coord, [turma_destino(turma)], titulo="Só da turma")
    await criar_aviso(db, coord, [TODOS], titulo="Para todos")

    await client.delete(f"/gestao/turmas/{turma.id}", headers=bearer(coord))

    avisos = await client.get("/avisos", headers=bearer(aluno))
    detalhe = await client.get(f"/gestao/turmas/{turma.id}", headers=bearer(coord))
    assert [a["titulo"] for a in avisos.json()["items"]] == ["Para todos"]
    assert detalhe.json()["total_alunos"] == 1  # vínculo preservado


async def test_docente_sem_turmas_recebe_lista_vazia(client, db):
    docente = await criar_usuario(db, username="d.sem", perfil="docente")
    await criar_turma(db)

    r = await client.get("/gestao/turmas", headers=bearer(docente))

    assert r.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}
