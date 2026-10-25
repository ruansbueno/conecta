"""Seed de desenvolvimento: usuários do mock com os quatro perfis (RF-03)."""

import pytest
from sqlalchemy import select

from scripts.seed_dev_data import PERFIS_TESTE, seed
from src.models.usuario import Usuario
from src.providers.auth.mock_moodle import USUARIOS_TESTE
from tests.helpers import login

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
