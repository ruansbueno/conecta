"""Contrato de GET /turmas/disponiveis (contracts/api.md §3; RF-12)."""

import pytest

from tests.helpers import criar_solicitacao, criar_turma, entrar, vincular

pytestmark = pytest.mark.mock_auth


async def test_lista_so_turmas_ativas_abertas_sem_vinculo_e_sem_pendente(client, db):
    headers, aluno_id = await entrar(client, db)
    aberta = await criar_turma(db, codigo="TADS-3A-2026-2")
    await criar_turma(db, codigo="FECHADA", inscricoes_abertas=False)
    await criar_turma(db, codigo="INATIVA", ativa=False)
    await vincular(db, await criar_turma(db, codigo="VINCULADA"), aluno_id)
    await criar_solicitacao(db, await criar_turma(db, codigo="PENDENTE"), aluno_id)
    recusada = await criar_turma(db, codigo="TADS-3R-2026-2")
    await criar_solicitacao(db, recusada, aluno_id, status="recusada")
    cancelada = await criar_turma(db, codigo="TADS-3C-2026-2")
    await criar_solicitacao(db, cancelada, aluno_id, status="cancelada")

    r = await client.get("/turmas/disponiveis", headers=headers)

    assert r.status_code == 200
    codigos = [t["codigo"] for t in r.json()["items"]]
    assert sorted(codigos) == sorted([aberta.codigo, recusada.codigo, cancelada.codigo])
    assert r.json()["total"] == 3


async def test_item_tem_os_campos_do_contrato(client, db):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(
        db, codigo="TADS-3B-2026-2", nome="TADS 3º Sem B", semestre_curso=3, periodo_letivo="2026/2"
    )

    r = await client.get("/turmas/disponiveis", headers=headers)

    assert r.json() == {
        "items": [
            {
                "id": str(turma.id),
                "codigo": "TADS-3B-2026-2",
                "nome": "TADS 3º Sem B",
                "semestre_curso": 3,
                "periodo_letivo": "2026/2",
            }
        ],
        "total": 1,
        "limit": 20,
        "offset": 0,
    }


async def test_vinculo_de_outro_aluno_nao_esconde_a_turma(client, db):
    headers, _ = await entrar(client, db)
    _, outro_id = await entrar(client, db, "aluno2.teste")
    turma = await criar_turma(db)
    await vincular(db, turma, outro_id)
    await criar_solicitacao(db, await criar_turma(db, codigo="OUTRA-PEND"), outro_id)

    r = await client.get("/turmas/disponiveis", headers=headers)

    assert r.json()["total"] == 2


async def test_ordena_por_semestre_e_codigo_e_pagina(client, db):
    headers, _ = await entrar(client, db)
    await criar_turma(db, codigo="TADS-5A", semestre_curso=5)
    await criar_turma(db, codigo="TADS-3B", semestre_curso=3)
    await criar_turma(db, codigo="TADS-3A", semestre_curso=3)

    pagina1 = (await client.get("/turmas/disponiveis?limit=2", headers=headers)).json()
    pagina2 = (await client.get("/turmas/disponiveis?limit=2&offset=2", headers=headers)).json()

    assert [t["codigo"] for t in pagina1["items"]] == ["TADS-3A", "TADS-3B"]
    assert [t["codigo"] for t in pagina2["items"]] == ["TADS-5A"]
    assert (pagina1["total"], pagina1["limit"], pagina2["offset"]) == (3, 2, 2)


@pytest.mark.parametrize("perfil", ["docente", "coordenacao", "administrador"])
async def test_perfil_diferente_de_aluno_e_403(client, db, perfil):
    headers, _ = await entrar(client, db, "docente.teste", perfil=perfil)

    r = await client.get("/turmas/disponiveis", headers=headers)

    assert r.status_code == 403
    assert r.json()["code"] == "SEM_PERMISSAO"


async def test_sem_autenticacao_e_401(client):
    r = await client.get("/turmas/disponiveis")

    assert r.status_code == 401
