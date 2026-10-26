"""Regras de duplicidade da solicitação de inscrição (RF-14; spec.md §3.2)."""

import asyncio

import pytest
from sqlalchemy.exc import IntegrityError

from src.models.solicitacao_inscricao import SolicitacaoInscricao
from tests.helpers import criar_solicitacao, criar_turma, criar_usuario, entrar

pytestmark = pytest.mark.mock_auth


async def test_segunda_solicitacao_pendente_e_409(client, db):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db)

    primeira = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)
    segunda = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert primeira.status_code == 201
    assert (segunda.status_code, segunda.json()["code"]) == (409, "SOLICITACAO_DUPLICADA")


@pytest.mark.parametrize("status", ["recusada", "cancelada"])
async def test_pode_solicitar_de_novo_apos_recusa_ou_cancelamento(client, db, status):
    headers, aluno_id = await entrar(client, db)
    turma = await criar_turma(db)
    await criar_solicitacao(db, turma, aluno_id, status=status)

    r = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert r.status_code == 201


async def test_cancelar_e_solicitar_de_novo(client, db):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db)
    criada = (await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)).json()

    await client.delete(f"/solicitacoes/{criada['id']}", headers=headers)
    r = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert r.status_code == 201


async def test_turma_sai_de_disponiveis_enquanto_ha_pendente(client, db):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db)
    criada = (await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)).json()

    durante = (await client.get("/turmas/disponiveis", headers=headers)).json()["total"]
    await client.delete(f"/solicitacoes/{criada['id']}", headers=headers)
    depois = (await client.get("/turmas/disponiveis", headers=headers)).json()["total"]

    assert (durante, depois) == (0, 1)


async def test_solicitacoes_simultaneas_geram_uma_so_pendente(client, db):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db)

    respostas = await asyncio.gather(
        *[client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers) for _ in range(5)]
    )

    assert sorted(r.status_code for r in respostas) == [201, 409, 409, 409, 409]
    assert {r.json()["code"] for r in respostas if r.status_code == 409} == {
        "SOLICITACAO_DUPLICADA"
    }


async def test_banco_impede_duas_pendentes_para_a_mesma_turma(db):
    aluno_id = (await criar_usuario(db)).id
    turma = await criar_turma(db)
    await criar_solicitacao(db, turma, aluno_id)
    db.add(SolicitacaoInscricao(turma_id=turma.id, aluno_id=aluno_id))

    with pytest.raises(IntegrityError):
        await db.commit()
