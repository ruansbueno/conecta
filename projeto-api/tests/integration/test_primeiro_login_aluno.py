"""Primeiro login cria aluno; logins seguintes não mexem no perfil (RF-08)."""

import pytest
from sqlalchemy import select

from src.models.usuario import Usuario
from src.providers.auth.factory import get_auth_provider
from src.providers.auth.mock_moodle import MockMoodleAuthProvider
from tests.helpers import login

pytestmark = pytest.mark.mock_auth


async def _buscar(session_factory, username) -> Usuario | None:
    async with session_factory() as s:
        return await s.scalar(select(Usuario).where(Usuario.username == username))


async def test_primeiro_login_cria_usuario_aluno(client, session_factory):
    assert await _buscar(session_factory, "docente.teste") is None

    r = await login(client, "docente.teste")

    assert r.status_code == 200
    usuario = await _buscar(session_factory, "docente.teste")
    assert usuario.perfil == "aluno"  # o provedor nunca define o perfil
    assert usuario.nome == "Docente de Teste"
    assert usuario.ativo is True
    assert usuario.ultimo_login_em is not None


async def test_novo_login_atualiza_nome_e_ultimo_login_mas_nao_o_perfil(
    app, client, session_factory
):
    await login(client)
    async with session_factory() as s:
        usuario = await s.scalar(select(Usuario).where(Usuario.username == "aluno.teste"))
        usuario.perfil = "docente"
        await s.commit()
    antes = await _buscar(session_factory, "aluno.teste")

    app.dependency_overrides[get_auth_provider] = lambda: MockMoodleAuthProvider(
        {"aluno.teste": "Nome Novo no Moodle"}
    )
    r = await login(client)

    depois = await _buscar(session_factory, "aluno.teste")
    assert r.json()["usuario"]["perfil"] == "docente"
    assert depois.id == antes.id
    assert depois.perfil == "docente"
    assert depois.nome == "Nome Novo no Moodle"
    assert depois.ultimo_login_em > antes.ultimo_login_em
    assert depois.atualizado_em > antes.atualizado_em


async def test_login_sem_mudanca_de_nome_nao_altera_atualizado_em(client, session_factory):
    await login(client)
    antes = await _buscar(session_factory, "aluno.teste")

    await login(client)

    depois = await _buscar(session_factory, "aluno.teste")
    assert depois.atualizado_em == antes.atualizado_em
    assert depois.ultimo_login_em > antes.ultimo_login_em
