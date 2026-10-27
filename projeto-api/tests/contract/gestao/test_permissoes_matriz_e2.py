"""Matriz de permissões da E2 por perfil (spec §2.3; RF-10).

Com ids aleatórios a rota pode responder 404/422 a quem tem acesso; o que importa aqui é quem
recebe 403 SEM_PERMISSAO só pelo perfil. Regras por vínculo/autoria do docente estão nos
testes de integração da gestão.
"""

import uuid

import pytest

from tests.helpers import bearer, criar_usuario

ID = uuid.uuid4()
PERFIS = ["administrador", "coordenacao", "docente", "aluno"]
GESTAO = ["administrador", "coordenacao"]
COM_DOCENTE = GESTAO + ["docente"]

# (método, rota, corpo, perfis que passam da checagem de perfil)
MATRIZ = [
    ("GET", "/gestao/usuarios", None, GESTAO),
    ("GET", f"/gestao/usuarios/{ID}", None, GESTAO),
    ("PATCH", f"/gestao/usuarios/{ID}", {"ativo": True}, ["administrador"]),
    ("GET", "/gestao/turmas", None, COM_DOCENTE),
    ("POST", "/gestao/turmas", {}, GESTAO),
    ("PATCH", f"/gestao/turmas/{ID}", {"nome": "Nome"}, GESTAO),
    ("DELETE", f"/gestao/turmas/{ID}", None, GESTAO),
    ("POST", f"/gestao/turmas/{ID}/vinculos", {}, GESTAO),
    ("DELETE", f"/gestao/turmas/{ID}/vinculos/{ID}", None, GESTAO),
    ("GET", "/gestao/solicitacoes", None, COM_DOCENTE),
    ("GET", "/gestao/avisos", None, COM_DOCENTE),
    ("GET", "/gestao/avisos?situacao=excluido", None, GESTAO),
    ("POST", "/gestao/avisos", {}, COM_DOCENTE),
]

CASOS = [
    pytest.param(m, r, c, p, p in permitidos, id=f"{m} {r.replace(str(ID), '{id}')} [{p}]")
    for m, r, c, permitidos in MATRIZ
    for p in PERFIS
]


@pytest.mark.parametrize(("metodo", "rota", "corpo", "perfil", "permitido"), CASOS)
async def test_matriz_de_permissoes_da_gestao(client, db, metodo, rota, corpo, perfil, permitido):
    usuario = await criar_usuario(db, username=f"{perfil}.m2", perfil=perfil)

    r = await client.request(metodo, rota, headers=bearer(usuario), json=corpo)

    if permitido:
        assert r.status_code != 403, r.text
    else:
        assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")
