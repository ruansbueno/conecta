"""Contrato de POST /turmas/{turma_id}/solicitacoes (contracts/api.md §5; RF-13, RF-14)."""

import uuid

import pytest
from sqlalchemy import func, select

from src.models.vinculo_turma import VinculoTurma
from tests.helpers import criar_solicitacao, criar_turma, entrar, vincular

pytestmark = pytest.mark.mock_auth


async def test_cria_solicitacao_pendente_sem_criar_vinculo(client, db):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db)

    r = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert r.status_code == 201
    body = r.json()
    assert set(body) == {"id", "turma_id", "status", "solicitada_em"}
    uuid.UUID(body["id"])
    assert body["turma_id"] == str(turma.id)
    assert body["status"] == "pendente"
    assert body["solicitada_em"].endswith("Z")
    assert await db.scalar(select(func.count()).select_from(VinculoTurma)) == 0


@pytest.mark.parametrize(
    "campos", [{"ativa": False}, {"inscricoes_abertas": False}], ids=["inativa", "fechada"]
)
async def test_turma_indisponivel_e_404(client, db, campos):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db, **campos)

    r = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert r.status_code == 404
    assert r.json()["code"] == "TURMA_INDISPONIVEL"


async def test_turma_inexistente_e_404(client, db):
    headers, _ = await entrar(client, db)

    r = await client.post(f"/turmas/{uuid.uuid4()}/solicitacoes", headers=headers)

    assert r.status_code == 404
    assert r.json()["code"] == "TURMA_INDISPONIVEL"


async def test_aluno_ja_vinculado_e_409(client, db):
    headers, aluno_id = await entrar(client, db)
    turma = await criar_turma(db)
    await vincular(db, turma, aluno_id)

    r = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert r.status_code == 409
    assert r.json()["code"] == "JA_VINCULADO"


async def test_solicitacao_pendente_repetida_e_409(client, db):
    headers, aluno_id = await entrar(client, db)
    turma = await criar_turma(db)
    await criar_solicitacao(db, turma, aluno_id)

    r = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert r.status_code == 409
    assert r.json()["code"] == "SOLICITACAO_DUPLICADA"


@pytest.mark.parametrize("perfil", ["docente", "coordenacao", "administrador"])
async def test_perfil_diferente_de_aluno_e_403(client, db, perfil):
    headers, _ = await entrar(client, db, "docente.teste", perfil=perfil)
    turma = await criar_turma(db)

    r = await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)

    assert r.status_code == 403
    assert r.json()["code"] == "SEM_PERMISSAO"


async def test_turma_id_que_nao_e_uuid_e_422(client, db):
    headers, _ = await entrar(client, db)

    r = await client.post("/turmas/abc/solicitacoes", headers=headers)

    assert r.status_code == 422
    assert r.json()["errors"][0]["campo"] == "turma_id"


async def test_solicitar_por_cookie_exige_csrf(client, db):
    await entrar(client, db)
    turma = await criar_turma(db)

    sem = await client.post(f"/turmas/{turma.id}/solicitacoes")
    com = await client.post(
        f"/turmas/{turma.id}/solicitacoes",
        headers={"X-CSRF-Token": client.cookies["conecta_csrf"]},
    )

    assert (sem.status_code, sem.json()["code"]) == (403, "CSRF_INVALIDO")
    assert com.status_code == 201
