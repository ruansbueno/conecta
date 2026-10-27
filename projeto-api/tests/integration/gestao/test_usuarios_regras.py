"""Regras de perfil e situação (RF-09; US5 cenários 1–2; plan-e2 D-E2-9)."""

import pytest

from tests.helpers import bearer, criar_usuario, login

pytestmark = pytest.mark.mock_auth


async def test_perfil_alterado_vale_na_requisicao_seguinte_do_usuario(client, db):
    admin = await criar_usuario(db, username="admin.r", perfil="administrador")
    token = (await login(client)).json()["access_token"]  # aluno.teste nasce aluno
    usuario_id = (await client.get("/me", headers={"Authorization": f"Bearer {token}"})).json()[
        "id"
    ]

    await client.patch(
        f"/gestao/usuarios/{usuario_id}", headers=bearer(admin), json={"perfil": "coordenacao"}
    )
    r = await client.get("/gestao/usuarios", headers={"Authorization": f"Bearer {token}"})

    assert r.status_code == 200  # mesmo token, perfil novo


async def test_desativar_corta_o_token_em_uso(client, db):
    admin = await criar_usuario(db, username="admin.r", perfil="administrador")
    alvo = await criar_usuario(db, username="alvo.r")

    await client.patch(f"/gestao/usuarios/{alvo.id}", headers=bearer(admin), json={"ativo": False})
    r = await client.get("/me", headers=bearer(alvo))

    assert (r.status_code, r.json()["code"]) == (403, "USUARIO_INATIVO")


async def test_atualizado_em_muda_com_perfil(client, db):
    admin = await criar_usuario(db, username="admin.r", perfil="administrador")
    alvo = await criar_usuario(db, username="alvo.r")
    antes = alvo.atualizado_em

    await client.patch(
        f"/gestao/usuarios/{alvo.id}", headers=bearer(admin), json={"perfil": "docente"}
    )
    await db.refresh(alvo)

    assert alvo.atualizado_em > antes


async def test_administrador_nao_desativa_a_si_proprio(client, db):
    admin = await criar_usuario(db, username="admin.r", perfil="administrador")
    await criar_usuario(db, username="admin.2", perfil="administrador")

    r = await client.patch(
        f"/gestao/usuarios/{admin.id}", headers=bearer(admin), json={"ativo": False}
    )

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == "ativo"


async def test_ultimo_administrador_ativo_nao_e_rebaixado(client, db):
    admin = await criar_usuario(db, username="admin.r", perfil="administrador")
    await criar_usuario(db, username="admin.inativo", perfil="administrador", ativo=False)

    r = await client.patch(
        f"/gestao/usuarios/{admin.id}", headers=bearer(admin), json={"perfil": "coordenacao"}
    )

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == "perfil"


async def test_com_outro_administrador_ativo_pode_rebaixar(client, db):
    admin = await criar_usuario(db, username="admin.r", perfil="administrador")
    outro = await criar_usuario(db, username="admin.2", perfil="administrador")

    r = await client.patch(
        f"/gestao/usuarios/{outro.id}", headers=bearer(admin), json={"perfil": "coordenacao"}
    )

    assert r.status_code == 200
