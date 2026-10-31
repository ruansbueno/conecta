"""Seed de desenvolvimento da E3: agenda e grade de exemplo (tasks E3 T026)."""

import pytest
from sqlalchemy import func, select

from scripts.seed_dev_data import EVENTOS_TESTE, HORARIOS_TESTE, seed
from src.models.evento import Evento
from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao
from src.models.horario import Horario
from tests.helpers import entrar

pytestmark = pytest.mark.mock_auth


async def _contar(db, modelo) -> int:
    return await db.scalar(select(func.count()).select_from(modelo))


async def test_seed_cria_os_eventos_e_e_idempotente(db):
    await seed(db)
    contagens = [await _contar(db, m) for m in (Evento, EventoVersao, EventoHistorico)]

    await seed(db)

    assert [await _contar(db, m) for m in (Evento, EventoVersao, EventoHistorico)] == contagens
    assert contagens[0] == len(EVENTOS_TESTE)


async def test_seed_cobre_os_casos_da_agenda(db):
    await seed(db)

    eventos = (await db.scalars(select(Evento))).all()
    assert {e.situacao for e in eventos} == {"ativo", "arquivado"}
    assert any(e.versao_atual == 2 for e in eventos)
    assert any(e.fim is None for e in eventos)
    assert any(e.fim is not None and (e.fim - e.inicio).days >= 1 for e in eventos)
    for evento in eventos:
        versoes = await db.scalar(
            select(func.count())
            .select_from(EventoVersao)
            .where(EventoVersao.evento_id == evento.id)
        )
        assert versoes == evento.versao_atual, evento.titulo


async def test_aluno_ve_eventos_em_andamento_e_proximos_apos_o_seed(client, db):
    await seed(db)
    headers, _ = await entrar(client, db, "aluno.teste")

    r = await client.get("/eventos", headers=headers)

    assert r.status_code == 200
    assert r.json()["total"] >= 2


async def test_seed_cria_a_grade_com_um_conflito_de_sala_e_e_idempotente(client, db):
    await seed(db)
    total = await _contar(db, Horario)
    await seed(db)

    assert total == await _contar(db, Horario) == len(HORARIOS_TESTE)
    headers, _ = await entrar(client, db, "aluno.teste")
    r = await client.get("/turmas/minhas", headers=headers)
    turma_a = next(t for t in r.json()["items"] if t["codigo"] == "TADS-3A-2026-2")
    grade = await client.get(f"/turmas/{turma_a['id']}/horarios", headers=headers)
    assert grade.status_code == 200
    assert grade.json()["total"] >= 2
    locais = [h.local for h in (await db.scalars(select(Horario))).all() if h.dia_semana == 1]
    assert len([loc for loc in locais if loc and loc.casefold().replace(" ", "") == "lab4"]) >= 2
