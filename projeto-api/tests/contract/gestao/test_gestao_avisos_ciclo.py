"""Contrato de PATCH, arquivar, desarquivar e DELETE de /gestao/avisos (§14; RF-25, RF-26)."""

import uuid

import pytest

from tests.helpers import bearer, criar_usuario


async def test_editar_cria_versao_e_marca_editado(client, coord, turmas, publicar):
    aviso = await publicar(
        coord, destinos=[{"tipo": "turma", "turma_id": str(t.id)} for t in turmas]
    )

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={
            "conteudo": "Reunião transferida para sábado, às 10h.",
            "destinos": [{"tipo": "turma", "turma_id": str(t.id)} for t in turmas[:2]],
        },
    )

    assert r.status_code == 200
    body = r.json()
    assert (body["versao_atual"], body["conteudo"]) == (
        2,
        "Reunião transferida para sábado, às 10h.",
    )
    assert body["editado_em"] is not None
    assert len(body["destinos"]) == 2


async def test_editar_sem_mudanca_e_422(client, coord, publicar):
    aviso = await publicar(coord, titulo="Mesmo título")

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={"titulo": "Mesmo título", "destinos": [{"tipo": "todos"}]},
    )

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")


@pytest.mark.parametrize("corpo", [{}, {"titulo": "ab"}, {"destinos": []}, {"campo": 1}])
async def test_patch_invalido_e_422(client, coord, publicar, corpo):
    aviso = await publicar(coord)

    r = await client.patch(f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json=corpo)

    assert r.status_code == 422


@pytest.mark.parametrize("acao", ["arquivar", "excluir"])
async def test_editar_arquivado_ou_excluido_e_409(client, coord, publicar, acao):
    aviso = await publicar(coord)
    if acao == "arquivar":
        await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(coord))
    else:
        await client.delete(f"/gestao/avisos/{aviso['id']}", headers=bearer(coord))

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"titulo": "Novo título"}
    )

    assert (r.status_code, r.json()["code"]) == (409, "AVISO_NAO_EDITAVEL")


async def test_arquivar_e_desarquivar(client, coord, publicar):
    aviso = await publicar(coord)

    arq = await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(coord))
    de_novo = await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(coord))
    des = await client.post(f"/gestao/avisos/{aviso['id']}/desarquivar", headers=bearer(coord))
    des_de_novo = await client.post(
        f"/gestao/avisos/{aviso['id']}/desarquivar", headers=bearer(coord)
    )

    assert (arq.status_code, arq.json()["situacao"]) == (200, "arquivado")
    assert arq.json()["arquivado_em"] is not None
    assert (de_novo.status_code, de_novo.json()["code"]) == (409, "AVISO_SITUACAO_INVALIDA")
    assert (des.status_code, des.json()["situacao"], des.json()["arquivado_em"]) == (
        200,
        "ativo",
        None,
    )
    assert (des_de_novo.status_code, des_de_novo.json()["code"]) == (409, "AVISO_SITUACAO_INVALIDA")


async def test_excluir_some_de_avisos_e_de_gestao(client, db, coord, publicar):
    aluno = await criar_usuario(db, username="a.exc")
    aviso = await publicar(coord, titulo="Para excluir")

    r = await client.delete(f"/gestao/avisos/{aviso['id']}", headers=bearer(coord))
    no_app = await client.get(f"/avisos/{aviso['id']}", headers=bearer(aluno))
    gestao = await client.get("/gestao/avisos", headers=bearer(coord))
    de_novo = await client.delete(f"/gestao/avisos/{aviso['id']}", headers=bearer(coord))
    arquivar = await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(coord))

    assert r.status_code == 204
    assert no_app.status_code == 404
    assert gestao.json()["total"] == 0
    assert (de_novo.status_code, de_novo.json()["code"]) == (404, "AVISO_NAO_ENCONTRADO")
    # Excluído não existe para as ações, como nos eventos (emenda v2.4).
    assert (arquivar.status_code, arquivar.json()["code"]) == (404, "AVISO_NAO_ENCONTRADO")


@pytest.mark.parametrize(
    ("metodo", "sufixo"),
    [("PATCH", ""), ("POST", "/arquivar"), ("POST", "/desarquivar"), ("DELETE", "")],
)
async def test_aviso_inexistente_e_404(client, coord, metodo, sufixo):
    r = await client.request(
        metodo,
        f"/gestao/avisos/{uuid.uuid4()}{sufixo}",
        headers=bearer(coord),
        json={"titulo": "Título"},
    )

    assert (r.status_code, r.json()["code"]) == (404, "AVISO_NAO_ENCONTRADO")
