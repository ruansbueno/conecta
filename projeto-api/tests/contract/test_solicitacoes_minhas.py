"""Contrato de GET /solicitacoes/minhas e DELETE /solicitacoes/{id} (§6–7; RF-15)."""

import uuid
from datetime import UTC, datetime, timedelta

import pytest

from src.models.solicitacao_inscricao import SolicitacaoInscricao
from tests.helpers import criar_solicitacao, criar_turma, entrar

pytestmark = pytest.mark.mock_auth

AGORA = datetime.now(UTC)


async def test_lista_as_solicitacoes_do_aluno_da_mais_recente_para_a_mais_antiga(client, db):
    headers, aluno_id = await entrar(client, db)
    _, outro_id = await entrar(client, db, "aluno2.teste")
    turma_b = await criar_turma(db, codigo="TADS-3B-2026-2", nome="TADS 3º Sem B")
    recusada = await criar_solicitacao(
        db,
        turma_b,
        aluno_id,
        status="recusada",
        solicitada_em=AGORA - timedelta(days=2),
        decidida_em=AGORA - timedelta(days=1),
        motivo_recusa="Turma completa",
    )
    pendente = await criar_solicitacao(db, await criar_turma(db), aluno_id, solicitada_em=AGORA)
    await criar_solicitacao(db, await criar_turma(db), outro_id)

    r = await client.get("/solicitacoes/minhas", headers=headers)

    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert [s["id"] for s in body["items"]] == [str(pendente.id), str(recusada.id)]
    item = body["items"][1]
    assert set(item) == {"id", "turma", "status", "solicitada_em", "decidida_em", "motivo_recusa"}
    assert item["turma"] == {
        "id": str(turma_b.id),
        "codigo": "TADS-3B-2026-2",
        "nome": "TADS 3º Sem B",
    }
    assert item["status"] == "recusada"
    assert item["motivo_recusa"] == "Turma completa"
    assert item["decidida_em"].endswith("Z")
    assert body["items"][0]["decidida_em"] is None


async def test_filtra_por_status(client, db):
    headers, aluno_id = await entrar(client, db)
    await criar_solicitacao(db, await criar_turma(db), aluno_id)
    cancelada = await criar_solicitacao(db, await criar_turma(db), aluno_id, status="cancelada")

    r = await client.get("/solicitacoes/minhas?status=cancelada", headers=headers)

    assert [s["id"] for s in r.json()["items"]] == [str(cancelada.id)]
    assert r.json()["total"] == 1


async def test_status_invalido_e_422(client, db):
    headers, _ = await entrar(client, db)

    r = await client.get("/solicitacoes/minhas?status=qualquer", headers=headers)

    assert r.status_code == 422
    assert r.json()["errors"][0]["campo"] == "status"


async def test_pagina(client, db):
    headers, aluno_id = await entrar(client, db)
    for i in range(3):
        await criar_solicitacao(
            db, await criar_turma(db), aluno_id, solicitada_em=AGORA - timedelta(hours=i)
        )

    r = await client.get("/solicitacoes/minhas?limit=1&offset=2", headers=headers)

    assert len(r.json()["items"]) == 1
    assert (r.json()["total"], r.json()["limit"], r.json()["offset"]) == (3, 1, 2)


@pytest.mark.parametrize("perfil", ["docente", "coordenacao", "administrador"])
async def test_listar_com_perfil_diferente_de_aluno_e_403(client, db, perfil):
    headers, _ = await entrar(client, db, "docente.teste", perfil=perfil)

    r = await client.get("/solicitacoes/minhas", headers=headers)

    assert r.status_code == 403
    assert r.json()["code"] == "SEM_PERMISSAO"


# --- DELETE /solicitacoes/{id} --------------------------------------------------------------


async def test_cancela_a_propria_solicitacao_pendente(client, db, session_factory):
    headers, aluno_id = await entrar(client, db)
    solicitacao = await criar_solicitacao(db, await criar_turma(db), aluno_id)

    r = await client.delete(f"/solicitacoes/{solicitacao.id}", headers=headers)

    assert r.status_code == 204
    assert r.content == b""
    async with session_factory() as s:
        cancelada = await s.get(SolicitacaoInscricao, solicitacao.id)
    assert cancelada.status == "cancelada"  # muda de estado; a linha não é apagada
    assert cancelada.decidida_em is not None
    assert cancelada.decidida_por == aluno_id


async def test_solicitacao_de_outro_aluno_e_404(client, db):
    headers, _ = await entrar(client, db)
    _, outro_id = await entrar(client, db, "aluno2.teste")
    solicitacao = await criar_solicitacao(db, await criar_turma(db), outro_id)

    r = await client.delete(f"/solicitacoes/{solicitacao.id}", headers=headers)

    assert r.status_code == 404
    assert r.json()["code"] == "SOLICITACAO_NAO_ENCONTRADA"


async def test_solicitacao_inexistente_e_404(client, db):
    headers, _ = await entrar(client, db)

    r = await client.delete(f"/solicitacoes/{uuid.uuid4()}", headers=headers)

    assert r.status_code == 404
    assert r.json()["code"] == "SOLICITACAO_NAO_ENCONTRADA"


@pytest.mark.parametrize("status", ["aprovada", "recusada", "cancelada"])
async def test_solicitacao_em_estado_final_e_409(client, db, status):
    headers, aluno_id = await entrar(client, db)
    solicitacao = await criar_solicitacao(db, await criar_turma(db), aluno_id, status=status)

    r = await client.delete(f"/solicitacoes/{solicitacao.id}", headers=headers)

    assert r.status_code == 409
    assert r.json()["code"] == "SOLICITACAO_NAO_PENDENTE"


async def test_cancelar_com_perfil_diferente_de_aluno_e_403(client, db):
    headers, _ = await entrar(client, db, "docente.teste", perfil="docente")

    r = await client.delete(f"/solicitacoes/{uuid.uuid4()}", headers=headers)

    assert r.status_code == 403


async def test_id_que_nao_e_uuid_e_422(client, db):
    headers, _ = await entrar(client, db)

    r = await client.delete("/solicitacoes/abc", headers=headers)

    assert r.status_code == 422
