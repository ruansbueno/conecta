"""Contrato de GET /gestao/avisos e GET /gestao/avisos/{id} (contracts/api.md §14; RF-34)."""

import uuid

import pytest

from tests.contract.gestao.conftest import futuro
from tests.helpers import bearer, criar_usuario


async def _ids(client, autor, query=""):
    r = await client.get(f"/gestao/avisos?{query}", headers=bearer(autor))
    assert r.status_code == 200, r.text
    return {i["titulo"] for i in r.json()["items"]}


async def test_situacoes_ativo_agendado_arquivado_excluido(client, coord, publicar):
    await publicar(coord, titulo="Publicado")
    await publicar(coord, titulo="Agendado", publicar_em=futuro())
    arquivado = await publicar(coord, titulo="Arquivado")
    excluido = await publicar(coord, titulo="Excluido")
    await client.post(f"/gestao/avisos/{arquivado['id']}/arquivar", headers=bearer(coord))
    await client.delete(f"/gestao/avisos/{excluido['id']}", headers=bearer(coord))

    assert await _ids(client, coord) == {"Publicado", "Agendado", "Arquivado"}
    assert await _ids(client, coord, "situacao=ativo") == {"Publicado"}
    assert await _ids(client, coord, "situacao=agendado") == {"Agendado"}
    assert await _ids(client, coord, "situacao=arquivado") == {"Arquivado"}
    assert await _ids(client, coord, "situacao=excluido") == {"Excluido"}


async def test_filtros_autor_turma_e_busca(client, db, coord, turmas, publicar):
    outro = await criar_usuario(db, username="adm.av", perfil="administrador")
    await publicar(coord, titulo="Da coordenação", conteudo="matrícula aberta")
    await publicar(
        outro, titulo="Do admin", destinos=[{"tipo": "turma", "turma_id": str(turmas[0].id)}]
    )

    assert await _ids(client, coord, f"autor_id={outro.id}") == {"Do admin"}
    assert await _ids(client, coord, f"turma_id={turmas[0].id}") == {"Do admin"}
    assert await _ids(client, coord, "q=MATRÍCULA") == {"Da coordenação"}
    assert await _ids(client, coord, "q=admin") == {"Do admin"}


async def test_paginacao_e_ordem_mais_recente_primeiro(client, coord, publicar):
    for i in range(3):
        await publicar(coord, titulo=f"Aviso {i}")

    r = await client.get("/gestao/avisos?limit=2", headers=bearer(coord))

    assert [i["titulo"] for i in r.json()["items"]] == ["Aviso 2", "Aviso 1"]
    assert (r.json()["total"], r.json()["limit"]) == (3, 2)


async def test_docente_lista_so_os_que_publicou_e_nao_ve_excluidos(client, db, coord, publicar):
    docente = await criar_usuario(db, username="d.lst", perfil="docente")
    await publicar(coord, titulo="Da coordenação")

    lista = await client.get("/gestao/avisos", headers=bearer(docente))
    excluidos = await client.get("/gestao/avisos?situacao=excluido", headers=bearer(docente))

    assert lista.json()["total"] == 0
    assert (excluidos.status_code, excluidos.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.mark.parametrize("query", ["situacao=todos", "autor_id=abc", "turma_id=1"])
async def test_filtro_invalido_e_422(client, coord, query):
    assert (await client.get(f"/gestao/avisos?{query}", headers=bearer(coord))).status_code == 422


async def test_detalhe_404_e_403_para_docente_em_aviso_alheio(client, db, coord, publicar):
    docente = await criar_usuario(db, username="d.det", perfil="docente")
    aviso = await publicar(coord)

    ok = await client.get(f"/gestao/avisos/{aviso['id']}", headers=bearer(coord))
    alheio = await client.get(f"/gestao/avisos/{aviso['id']}", headers=bearer(docente))
    inexistente = await client.get(f"/gestao/avisos/{uuid.uuid4()}", headers=bearer(coord))

    assert ok.json() == aviso
    assert (alheio.status_code, alheio.json()["code"]) == (403, "SEM_PERMISSAO")
    assert (inexistente.status_code, inexistente.json()["code"]) == (404, "AVISO_NAO_ENCONTRADO")
