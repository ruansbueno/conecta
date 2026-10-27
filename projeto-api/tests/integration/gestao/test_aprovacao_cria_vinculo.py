"""Decisão de solicitações (RF-17; US5 cenário 5; plan-e2 D-E2-7, D-E2-8)."""

import asyncio

from sqlalchemy import select

from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.vinculo_turma import VinculoTurma
from tests.helpers import bearer, criar_solicitacao, criar_turma, criar_usuario, vincular


async def test_aprovar_cria_o_vinculo_e_o_aluno_passa_a_ver_a_turma(client, db):
    coord = await criar_usuario(db, username="c.ap", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.ap")
    turma = await criar_turma(db)
    solicitacao = await criar_solicitacao(db, turma, aluno.id)

    await client.post(f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(coord))

    vinculo = await db.scalar(select(VinculoTurma).where(VinculoTurma.usuario_id == aluno.id))
    minhas = await client.get("/turmas/minhas", headers=bearer(aluno))
    assert (vinculo.papel, vinculo.origem, vinculo.criado_por) == ("aluno", "solicitacao", coord.id)
    assert [t["id"] for t in minhas.json()["items"]] == [str(turma.id)]


async def test_aprovar_com_vinculo_ja_existente_recusa_automaticamente(client, db, session_factory):
    coord = await criar_usuario(db, username="c.ap", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.ap")
    turma = await criar_turma(db)
    solicitacao = await criar_solicitacao(db, turma, aluno.id)
    await vincular(db, turma, aluno.id, origem="gestao")  # vínculo criado por outra via

    r = await client.post(f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (409, "JA_VINCULADO")
    async with session_factory() as nova:
        registrada = await nova.get(SolicitacaoInscricao, solicitacao.id)
    assert registrada.status == "recusada"
    assert registrada.decidida_por == coord.id
    assert registrada.motivo_recusa


async def test_decisoes_simultaneas_uma_vence_a_outra_e_409(client, db):
    coord = await criar_usuario(db, username="c.ap", perfil="coordenacao")
    admin = await criar_usuario(db, username="adm.ap", perfil="administrador")
    aluno = await criar_usuario(db, username="a.ap")
    solicitacao = await criar_solicitacao(db, await criar_turma(db), aluno.id)

    respostas = await asyncio.gather(
        client.post(f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(coord)),
        client.post(f"/gestao/solicitacoes/{solicitacao.id}/recusar", headers=bearer(admin)),
    )

    assert sorted(r.status_code for r in respostas) == [200, 409]
    vinculos = (await db.scalars(select(VinculoTurma))).all()
    aprovada = any(r.status_code == 200 and r.json()["status"] == "aprovada" for r in respostas)
    assert len(vinculos) == (1 if aprovada else 0)


async def test_docente_da_turma_a_nao_decide_na_turma_b(client, db):
    docente = await criar_usuario(db, username="d.ap", perfil="docente")
    aluno = await criar_usuario(db, username="a.ap")
    turma_a, turma_b = await criar_turma(db), await criar_turma(db)
    await vincular(db, turma_a, docente.id, papel="docente")
    na_b = await criar_solicitacao(db, turma_b, aluno.id)

    r = await client.post(f"/gestao/solicitacoes/{na_b.id}/recusar", headers=bearer(docente))
    lista = await client.get("/gestao/solicitacoes", headers=bearer(docente))
    filtro_alheio = await client.get(
        f"/gestao/solicitacoes?turma_id={turma_b.id}", headers=bearer(docente)
    )

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")
    assert lista.json()["total"] == 0  # docente só vê as das suas turmas
    assert filtro_alheio.status_code == 403


async def test_docente_vinculado_pela_coordenacao_passa_a_poder_aprovar(client, db):
    coord = await criar_usuario(db, username="c.ap", perfil="coordenacao")
    docente = await criar_usuario(db, username="d.ap", perfil="docente")
    aluno = await criar_usuario(db, username="a.ap")
    turma = await criar_turma(db)
    solicitacao = await criar_solicitacao(db, turma, aluno.id)

    await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(docente.id), "papel": "docente"},
    )
    r = await client.post(f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(docente))

    assert r.status_code == 200  # US5 cenário 3


async def test_solicitante_que_deixou_de_ser_aluno_nao_e_vinculado_como_aluno(client, db):
    admin = await criar_usuario(db, username="adm.ap", perfil="administrador")
    aluno = await criar_usuario(db, username="a.ap")
    solicitacao = await criar_solicitacao(db, await criar_turma(db), aluno.id)
    await client.patch(
        f"/gestao/usuarios/{aluno.id}", headers=bearer(admin), json={"perfil": "docente"}
    )

    r = await client.post(f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(admin))

    assert (r.status_code, r.json()["code"]) == (409, "PERFIL_INCOMPATIVEL")
