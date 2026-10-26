"""Matriz de permissões das rotas da E1 (spec.md §2.3; RF-10).

Para cada rota e perfil: o pedido passa da autorização (status esperado) ou recebe 403.
"""

import uuid

import pytest

from tests.helpers import bearer, criar_usuario

PERFIS = ["administrador", "coordenacao", "docente", "aluno"]
ID = uuid.uuid4()

# (método, rota, status quando permitido, perfis permitidos)
MATRIZ = [
    ("GET", "/me", 200, PERFIS),
    ("GET", "/turmas/minhas", 200, PERFIS),
    ("GET", "/avisos", 200, PERFIS),
    ("GET", f"/avisos/{ID}", 404, PERFIS),
    ("GET", "/turmas/disponiveis", 200, ["aluno"]),
    ("POST", f"/turmas/{ID}/solicitacoes", 404, ["aluno"]),
    ("GET", "/solicitacoes/minhas", 200, ["aluno"]),
    ("DELETE", f"/solicitacoes/{ID}", 404, ["aluno"]),
]

CASOS = [
    pytest.param(
        metodo,
        rota,
        perfil,
        status if perfil in permitidos else 403,
        id=f"{metodo} {rota.replace(str(ID), '{id}')} [{perfil}]",
    )
    for metodo, rota, status, permitidos in MATRIZ
    for perfil in PERFIS
]


@pytest.mark.parametrize(("metodo", "rota", "perfil", "esperado"), CASOS)
async def test_matriz_de_permissoes(client, db, metodo, rota, perfil, esperado):
    usuario = await criar_usuario(db, username=f"{perfil}.matriz", perfil=perfil)

    r = await client.request(metodo, rota, headers=bearer(usuario))

    assert r.status_code == esperado
    if esperado == 403:
        assert r.json()["code"] == "SEM_PERMISSAO"


@pytest.mark.parametrize(("metodo", "rota"), [(m, r) for m, r, _, _ in MATRIZ])
async def test_toda_rota_protegida_exige_autenticacao(client, metodo, rota):
    r = await client.request(metodo, rota)

    assert (r.status_code, r.json()["code"]) == (401, "NAO_AUTENTICADO")
