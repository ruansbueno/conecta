"""Matriz de permissões da E3 por perfil (spec E3 §2.3, §2.4; RF-43).

Como na matriz da E2: com ids aleatórios a rota pode responder 404/422 a quem tem acesso; o que
importa aqui é quem recebe 403 SEM_PERMISSAO só pelo perfil. Autoria e vínculo estão nos testes
de integração.
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
    ("GET", "/eventos", None, PERFIS),
    ("GET", f"/eventos/{ID}", None, PERFIS),
    ("GET", "/gestao/eventos", None, COM_DOCENTE),
    ("GET", "/gestao/eventos?situacao=excluido", None, GESTAO),
    ("POST", "/gestao/eventos", {}, COM_DOCENTE),
    ("GET", f"/gestao/eventos/{ID}", None, COM_DOCENTE),
    ("PATCH", f"/gestao/eventos/{ID}", {"titulo": "Novo título"}, COM_DOCENTE),
    ("POST", f"/gestao/eventos/{ID}/arquivar", None, COM_DOCENTE),
    ("POST", f"/gestao/eventos/{ID}/desarquivar", None, COM_DOCENTE),
    ("DELETE", f"/gestao/eventos/{ID}", None, COM_DOCENTE),
    ("GET", f"/gestao/eventos/{ID}/versoes", None, COM_DOCENTE),
    ("GET", f"/gestao/eventos/{ID}/historico", None, COM_DOCENTE),
    ("POST", f"/gestao/turmas/{ID}/horarios", {}, GESTAO),
    ("GET", f"/gestao/turmas/{ID}/horarios", None, GESTAO),
    ("PATCH", f"/gestao/turmas/{ID}/horarios/{ID}", {"local": "Lab 4"}, GESTAO),
    ("DELETE", f"/gestao/turmas/{ID}/horarios/{ID}", None, GESTAO),
]

CASOS = [
    pytest.param(m, r, c, p, p in permitidos, id=f"{m} {r.replace(str(ID), '{id}')} [{p}]")
    for m, r, c, permitidos in MATRIZ
    for p in PERFIS
]


@pytest.mark.parametrize(("metodo", "rota", "corpo", "perfil", "permitido"), CASOS)
async def test_matriz_de_permissoes_da_e3(client, db, metodo, rota, corpo, perfil, permitido):
    usuario = await criar_usuario(db, username=f"{perfil}.m3", perfil=perfil)

    r = await client.request(metodo, rota, headers=bearer(usuario), json=corpo)

    if permitido:
        assert r.status_code != 403, r.text
    else:
        assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")
