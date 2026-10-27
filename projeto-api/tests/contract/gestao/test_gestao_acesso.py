"""Acesso à gestão: aluno nunca entra; sem login, 401; escrita por cookie exige CSRF (RF-10, RF-33).

A lista cresce a cada fase da E2, conforme as rotas passam a existir.
"""

import uuid

import pytest

from src.core.security import create_access_token
from tests.helpers import bearer, criar_usuario

ID = uuid.uuid4()

ROTAS_GESTAO = [
    ("GET", "/gestao/usuarios"),
    ("GET", f"/gestao/usuarios/{ID}"),
    ("PATCH", f"/gestao/usuarios/{ID}"),
]
ESCRITAS = [(m, r) for m, r in ROTAS_GESTAO if m in {"POST", "PATCH", "DELETE"}]


@pytest.mark.parametrize(("metodo", "rota"), ROTAS_GESTAO)
async def test_aluno_recebe_403_em_toda_rota_de_gestao(client, db, metodo, rota):
    aluno = await criar_usuario(db, username="aluno.gestao")

    r = await client.request(metodo, rota, headers=bearer(aluno), json={})

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.mark.parametrize(("metodo", "rota"), ROTAS_GESTAO)
async def test_sem_autenticacao_e_401(client, metodo, rota):
    r = await client.request(metodo, rota, json={})

    assert (r.status_code, r.json()["code"]) == (401, "NAO_AUTENTICADO")


@pytest.mark.parametrize(("metodo", "rota"), ESCRITAS)
async def test_escrita_por_cookie_sem_csrf_e_403(client, db, metodo, rota):
    admin = await criar_usuario(db, username="admin.csrf", perfil="administrador")
    client.cookies.update(
        {"conecta_sessao": create_access_token(admin.id, admin.perfil), "conecta_csrf": "c"}
    )

    r = await client.request(metodo, rota, json={})

    assert (r.status_code, r.json()["code"]) == (403, "CSRF_INVALIDO")
