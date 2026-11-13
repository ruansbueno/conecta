"""Fluxo disponíveis → solicitar → aprovação (serviço, na E1) → minhas turmas (US3)."""

import pytest
from sqlalchemy import select

from scripts.aprovar_solicitacao import aprovar
from src.api.errors import DomainError
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.vinculo_turma import VinculoTurma
from src.repositories.solicitacao_repository import SolicitacaoRepository
from tests.helpers import criar_turma, entrar

pytestmark = pytest.mark.mock_auth


async def _codigos(client, url, headers):
    return [t["codigo"] for t in (await client.get(url, headers=headers)).json()["items"]]


async def test_fluxo_completo_da_inscricao(client, db, session_factory):
    headers, aluno_id = await entrar(client, db, "aluno.sem.turma")
    await entrar(client, db, "coord.teste", perfil="coordenacao")
    turma = await criar_turma(db, codigo="TADS-3B-2026-2")
    assert await _codigos(client, "/turmas/disponiveis", headers) == ["TADS-3B-2026-2"]

    criada = (await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)).json()

    assert await _codigos(client, "/turmas/disponiveis", headers) == []
    assert await _codigos(client, "/turmas/minhas", headers) == []

    async with session_factory() as s:
        await aprovar(s, criada["id"], decisor_username="coord.teste")

    assert await _codigos(client, "/turmas/minhas", headers) == ["TADS-3B-2026-2"]
    me = (await client.get("/me", headers=headers)).json()
    assert [(t["codigo"], t["papel"]) for t in me["turmas"]] == [("TADS-3B-2026-2", "aluno")]
    minhas = (await client.get("/solicitacoes/minhas", headers=headers)).json()["items"]
    assert minhas[0]["status"] == "aprovada"
    assert minhas[0]["decidida_em"] is not None
    async with session_factory() as s:
        vinculo = await s.scalar(select(VinculoTurma).where(VinculoTurma.usuario_id == aluno_id))
    assert (vinculo.papel, vinculo.origem) == ("aluno", "solicitacao")


async def test_aprovar_registra_decisor_no_vinculo_e_na_solicitacao(client, db, session_factory):
    headers, _ = await entrar(client, db)
    _, coord_id = await entrar(client, db, "coord.teste", perfil="coordenacao")
    turma = await criar_turma(db)
    criada = (await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)).json()

    async with session_factory() as s:
        await aprovar(s, criada["id"], decisor_username="coord.teste")

    async with session_factory() as s:
        solicitacao = await s.get(SolicitacaoInscricao, criada["id"])
        vinculo = await s.scalar(select(VinculoTurma))
    assert solicitacao.decidida_por == coord_id
    assert vinculo.criado_por == coord_id


async def test_aprovar_solicitacao_que_nao_esta_pendente_e_rejeitado(client, db, session_factory):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db)
    criada = (await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)).json()
    await client.delete(f"/solicitacoes/{criada['id']}", headers=headers)
    await entrar(client, db, "coord.teste", perfil="coordenacao")

    async with session_factory() as s:
        with pytest.raises(DomainError) as exc:
            await aprovar(s, criada["id"], decisor_username="coord.teste")

    assert exc.value.code == "SOLICITACAO_NAO_PENDENTE"
    async with session_factory() as s:
        assert await s.scalar(select(VinculoTurma)) is None


async def test_script_nao_aprova_sem_decisor(client, db, session_factory):
    headers, _ = await entrar(client, db)
    turma = await criar_turma(db)
    criada = (await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)).json()

    async with session_factory() as s:
        with pytest.raises(DomainError) as exc:
            await aprovar(s, criada["id"], decisor_username=None)

    assert exc.value.code == "USUARIO_NAO_ENCONTRADO"
    async with session_factory() as s:
        solicitacao = await s.get(SolicitacaoInscricao, criada["id"])
        assert (solicitacao.status, await s.scalar(select(VinculoTurma))) == ("pendente", None)


async def test_recusar_registra_motivo_e_libera_nova_solicitacao(client, db, session_factory):
    headers, _ = await entrar(client, db)
    _, coord_id = await entrar(client, db, "coord.teste", perfil="coordenacao")
    turma = await criar_turma(db)
    criada = (await client.post(f"/turmas/{turma.id}/solicitacoes", headers=headers)).json()

    async with session_factory() as s:
        repo = SolicitacaoRepository(s)
        await repo.refuse(
            await repo.get(criada["id"]), decisor_id=coord_id, motivo="Turma completa"
        )
        await s.commit()

    item = (await client.get("/solicitacoes/minhas", headers=headers)).json()["items"][0]
    assert (item["status"], item["motivo_recusa"]) == ("recusada", "Turma completa")
    assert await _codigos(client, "/turmas/disponiveis", headers) == [turma.codigo]
