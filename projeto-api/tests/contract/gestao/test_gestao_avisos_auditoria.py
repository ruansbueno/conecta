"""Contrato de /gestao/avisos/{id}/versoes e /historico (contracts/api.md §15; RF-28)."""

import uuid

import pytest

from tests.helpers import bearer, criar_usuario


async def _avisar_editar_arquivar(client, coord, publicar):
    aviso = await publicar(coord, titulo="Reunião", conteudo="Sexta, 19h.")
    await client.patch(
        f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"conteudo": "Sábado, 10h."}
    )
    await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(coord))
    return aviso


async def test_versoes_da_mais_recente_para_a_mais_antiga(client, coord, publicar):
    aviso = await _avisar_editar_arquivar(client, coord, publicar)

    r = await client.get(f"/gestao/avisos/{aviso['id']}/versoes", headers=bearer(coord))

    assert r.status_code == 200
    body = r.json()
    assert (body["total"], body["limit"], body["offset"]) == (2, 20, 0)
    v2, v1 = body["items"]
    assert set(v2) == {
        "versao",
        "titulo",
        "conteudo",
        "publicar_em",
        "destinos",
        "criada_por",
        "criada_em",
    }
    assert (v2["versao"], v2["conteudo"]) == (2, "Sábado, 10h.")
    assert (v1["versao"], v1["conteudo"]) == (1, "Sexta, 19h.")
    assert v1["destinos"] == [{"tipo": "todos", "turma_id": None, "semestre": None}]
    assert v2["criada_por"] == {"id": str(coord.id), "nome": "Maria Coordenadora"}


async def test_historico_com_tipo_usuario_data_e_alteracoes(client, coord, publicar):
    aviso = await _avisar_editar_arquivar(client, coord, publicar)

    r = await client.get(f"/gestao/avisos/{aviso['id']}/historico", headers=bearer(coord))

    assert r.status_code == 200
    itens = r.json()["items"]
    assert [i["tipo"] for i in itens] == ["arquivado", "editado", "criado"]
    assert set(itens[0]) == {"id", "tipo", "usuario", "ocorrido_em", "versao", "alteracoes"}
    arquivado, editado, criado = itens
    assert (arquivado["versao"], arquivado["alteracoes"]) == (None, None)
    assert editado["versao"] == 2
    assert editado["alteracoes"] == {"conteudo": {"de": "Sexta, 19h.", "para": "Sábado, 10h."}}
    assert (criado["versao"], criado["alteracoes"]) == (1, None)
    assert criado["usuario"] == {"id": str(coord.id), "nome": "Maria Coordenadora"}


async def test_paginacao_das_versoes(client, coord, publicar):
    aviso = await publicar(coord, titulo="Versão 1")
    for i in range(2, 5):
        p = await client.patch(
            f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"titulo": f"Versão {i}"}
        )
        assert p.status_code == 200, p.text

    r = await client.get(
        f"/gestao/avisos/{aviso['id']}/versoes?limit=2&offset=1", headers=bearer(coord)
    )

    assert [v["titulo"] for v in r.json()["items"]] == ["Versão 3", "Versão 2"], r.text
    assert r.json()["total"] == 4


@pytest.mark.parametrize("recurso", ["versoes", "historico"])
async def test_excluido_continua_auditavel_pela_gestao(client, coord, publicar, recurso):
    aviso = await publicar(coord)
    await client.delete(f"/gestao/avisos/{aviso['id']}", headers=bearer(coord))

    r = await client.get(f"/gestao/avisos/{aviso['id']}/{recurso}", headers=bearer(coord))

    assert r.status_code == 200 and r.json()["total"] >= 1


@pytest.mark.parametrize("recurso", ["versoes", "historico"])
async def test_docente_so_ve_dos_proprios_avisos(client, db, coord, publicar, recurso):
    docente = await criar_usuario(db, username="d.aud", perfil="docente")
    aviso = await publicar(coord)

    r = await client.get(f"/gestao/avisos/{aviso['id']}/{recurso}", headers=bearer(docente))

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.mark.parametrize("recurso", ["versoes", "historico"])
async def test_aviso_inexistente_e_404(client, coord, recurso):
    r = await client.get(f"/gestao/avisos/{uuid.uuid4()}/{recurso}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "AVISO_NAO_ENCONTRADO")
