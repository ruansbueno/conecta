"""Usuário desativado não entra e perde o acesso de tokens já emitidos (RF-07)."""

import pytest
from sqlalchemy import update

from src.models.usuario import Usuario
from tests.helpers import login

pytestmark = pytest.mark.mock_auth


async def test_token_emitido_antes_da_desativacao_e_rejeitado(client, session_factory):
    token = (await login(client)).json()["access_token"]
    async with session_factory() as s:
        await s.execute(
            update(Usuario).where(Usuario.username == "aluno.teste").values(ativo=False)
        )
        await s.commit()

    r = await client.get("/me", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 403
    assert r.json()["code"] == "USUARIO_INATIVO"


async def test_usuario_desativado_nao_consegue_novo_login(client, session_factory):
    await login(client)
    async with session_factory() as s:
        await s.execute(
            update(Usuario).where(Usuario.username == "aluno.teste").values(ativo=False)
        )
        await s.commit()

    r = await login(client)

    assert r.status_code == 403
    assert r.json()["code"] == "USUARIO_INATIVO"
