"""Contrato de GET /turmas/minhas (contracts/api.md §4; RF-16)."""

import pytest

from tests.helpers import criar_solicitacao, criar_turma, entrar, vincular

pytestmark = pytest.mark.mock_auth


async def test_lista_as_turmas_vinculadas_com_o_papel(client, db):
    headers, aluno_id = await entrar(client, db)
    turma = await criar_turma(
        db, codigo="TADS-3A-2026-2", nome="TADS 3º Sem A", inscricoes_abertas=False
    )
    await vincular(db, turma, aluno_id)
    await criar_turma(db, codigo="SEM-VINCULO")
    await criar_solicitacao(db, await criar_turma(db, codigo="SO-PENDENTE"), aluno_id)

    r = await client.get("/turmas/minhas", headers=headers)

    assert r.status_code == 200
    assert r.json() == {
        "items": [
            {
                "id": str(turma.id),
                "codigo": "TADS-3A-2026-2",
                "nome": "TADS 3º Sem A",
                "semestre_curso": 3,
                "periodo_letivo": "2026/2",
                "papel": "aluno",
            }
        ],
        "total": 1,
        "limit": 20,
        "offset": 0,
    }


async def test_docente_ve_suas_turmas_com_papel_docente(client, db):
    headers, docente_id = await entrar(client, db, "docente.teste", perfil="docente")
    await vincular(db, await criar_turma(db), docente_id, papel="docente")

    r = await client.get("/turmas/minhas", headers=headers)

    assert [t["papel"] for t in r.json()["items"]] == ["docente"]


async def test_turma_desativada_sai_da_lista(client, db):
    headers, aluno_id = await entrar(client, db)
    await vincular(db, await criar_turma(db, ativa=False), aluno_id)

    r = await client.get("/turmas/minhas", headers=headers)

    assert r.json()["total"] == 0


@pytest.mark.parametrize("perfil", ["coordenacao", "administrador"])
async def test_coordenacao_e_administracao_recebem_lista_vazia(client, db, perfil):
    headers, _ = await entrar(client, db, "coord.teste", perfil=perfil)

    r = await client.get("/turmas/minhas", headers=headers)

    assert r.status_code == 200
    assert r.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}


async def test_pagina_ordenando_por_semestre_e_codigo(client, db):
    headers, aluno_id = await entrar(client, db)
    for codigo, semestre in [("B-5", 5), ("B-3", 3), ("A-3", 3)]:
        await vincular(db, await criar_turma(db, codigo=codigo, semestre_curso=semestre), aluno_id)

    r = await client.get("/turmas/minhas?limit=2&offset=1", headers=headers)

    assert [t["codigo"] for t in r.json()["items"]] == ["B-3", "B-5"]
    assert r.json()["total"] == 3


async def test_sem_autenticacao_e_401(client):
    assert (await client.get("/turmas/minhas")).status_code == 401
