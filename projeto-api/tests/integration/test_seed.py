"""Seed de desenvolvimento: usuários do mock com os quatro perfis (RF-03)."""

import pytest
from sqlalchemy import func, select

from scripts.seed_dev_data import PERFIS_TESTE, seed
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.providers.auth.mock_moodle import USUARIOS_TESTE
from tests.helpers import entrar, login

pytestmark = pytest.mark.mock_auth


async def _perfis(db) -> dict[str, str]:
    return dict((await db.execute(select(Usuario.username, Usuario.perfil))).all())


async def test_seed_cria_todos_os_usuarios_do_mock_com_seus_perfis(db):
    await seed(db)

    perfis = await _perfis(db)
    assert set(perfis) == set(USUARIOS_TESTE)
    assert perfis["admin.conecta"] == "administrador"
    assert perfis["admin.teste"] == "administrador"
    assert perfis["coord.teste"] == "coordenacao"
    assert perfis["docente.teste"] == "docente"
    assert perfis["aluno.teste"] == "aluno"
    assert set(perfis.values()) == {"administrador", "coordenacao", "docente", "aluno"}


async def test_seed_e_idempotente_e_restaura_os_perfis(db):
    await seed(db)
    docente = await db.scalar(select(Usuario).where(Usuario.username == "docente.teste"))
    docente.perfil = "aluno"
    await db.commit()

    await seed(db)

    assert await _perfis(db) == PERFIS_TESTE


async def test_login_apos_o_seed_usa_o_perfil_semeado(client, db):
    await seed(db)

    r = await login(client, "coord.teste")

    assert r.json()["usuario"]["perfil"] == "coordenacao"


async def _contar(db, modelo) -> int:
    return await db.scalar(select(func.count()).select_from(modelo))


async def test_seed_cria_turmas_vinculos_e_solicitacoes(db):
    await seed(db)

    turmas = {t.codigo: t for t in (await db.scalars(select(Turma))).all()}
    assert {t.semestre_curso for c, t in turmas.items() if c != "TADS-5A-2026-2"} == {3}
    assert turmas["TADS-5A-2026-2"].semestre_curso == 5
    assert len(turmas) == 4
    vinculos = (
        await db.execute(
            select(Usuario.username, Turma.codigo, VinculoTurma.papel)
            .join(Usuario, Usuario.id == VinculoTurma.usuario_id)
            .join(Turma, Turma.id == VinculoTurma.turma_id)
        )
    ).all()
    assert ("aluno.teste", "TADS-3A-2026-2", "aluno") in vinculos
    assert ("aluno3.teste", "TADS-3C-2026-2", "aluno") in vinculos
    assert ("docente.teste", "TADS-3A-2026-2", "docente") in vinculos
    assert not [v for v in vinculos if v[0] == "aluno.sem.turma"]
    pendentes = await db.scalar(
        select(func.count())
        .select_from(SolicitacaoInscricao)
        .where(SolicitacaoInscricao.status == "pendente")
    )
    assert pendentes == 1


async def test_seed_de_turmas_e_idempotente(db):
    await seed(db)
    contagens = [await _contar(db, m) for m in (Turma, VinculoTurma, SolicitacaoInscricao)]

    await seed(db)

    assert [await _contar(db, m) for m in (Turma, VinculoTurma, SolicitacaoInscricao)] == contagens


async def test_aluno_sem_turma_tem_turmas_disponiveis_apos_o_seed(client, db):
    await seed(db)
    headers, _ = await entrar(client, db, "aluno.sem.turma")

    r = await client.get("/turmas/disponiveis", headers=headers)

    assert r.json()["total"] >= 1
