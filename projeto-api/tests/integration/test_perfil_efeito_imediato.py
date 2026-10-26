"""Mudar o perfil no banco vale na requisição seguinte, sem novo login (RF-04)."""

import pytest
from sqlalchemy import update

from src.models.usuario import Usuario
from tests.helpers import login

pytestmark = pytest.mark.mock_auth


async def _mudar_perfil(session_factory, username, perfil):
    async with session_factory() as s:
        await s.execute(update(Usuario).where(Usuario.username == username).values(perfil=perfil))
        await s.commit()


async def test_me_reflete_o_novo_perfil_com_o_mesmo_token(client, session_factory):
    token = (await login(client)).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    await _mudar_perfil(session_factory, "aluno.teste", "coordenacao")
    r = await client.get("/me", headers=headers)

    assert r.json()["perfil"] == "coordenacao"


async def test_autorizacao_segue_o_perfil_do_banco_e_nao_o_do_token(client, session_factory):
    token = (await login(client)).json()["access_token"]  # token emitido com perfil "aluno"
    headers = {"Authorization": f"Bearer {token}"}
    assert (await client.get("/turmas/disponiveis", headers=headers)).status_code == 200

    await _mudar_perfil(session_factory, "aluno.teste", "docente")
    r = await client.get("/turmas/disponiveis", headers=headers)

    assert r.status_code == 403
    assert r.json()["code"] == "SEM_PERMISSAO"
