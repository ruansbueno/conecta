"""Docente vê só as provas que ele criou (emenda E3.1, RF-53; specs/004).

As demais regras de alcance continuam valendo para todos os tipos de evento: para o docente,
uma prova precisa alcançá-lo E ser dele. Os outros tipos e os outros perfis não mudam.
"""

from datetime import UTC, datetime, timedelta

import pytest

from tests.helpers import (
    TODOS,
    bearer,
    criar_evento,
    criar_turma,
    criar_usuario,
    turma_destino,
    vincular,
)


@pytest.fixture
async def cenario(db):
    c = {"D": await criar_turma(db, codigo="D", semestre_curso=5)}
    for username, perfil in [
        ("docente", "docente"),
        ("colega", "docente"),
        ("coord", "coordenacao"),
        ("aluno.d", "aluno"),
    ]:
        c[username] = await criar_usuario(db, username=username, nome=username, perfil=perfil)
    await vincular(db, c["D"], c["docente"].id, papel="docente")
    await vincular(db, c["D"], c["colega"].id, papel="docente")
    await vincular(db, c["D"], c["aluno.d"].id)
    d = turma_destino(c["D"])
    c["prova.minha"] = await criar_evento(db, c["docente"], [d], tipo="prova", titulo="Minha")
    c["prova.colega"] = await criar_evento(db, c["colega"], [d], tipo="prova", titulo="Colega")
    c["prova.coord"] = await criar_evento(db, c["coord"], [d], tipo="prova", titulo="Coord")
    c["prova.todos"] = await criar_evento(db, c["coord"], [TODOS], tipo="prova", titulo="Todos")
    c["palestra.coord"] = await criar_evento(db, c["coord"], [d], tipo="palestra")
    return c


async def _ids(client, usuario, query: str = "") -> set[str]:
    r = await client.get(f"/eventos?limit=100{query}", headers=bearer(usuario))
    assert r.status_code == 200
    return {e["id"] for e in r.json()["items"]}


def _id(cenario, nome: str) -> str:
    return str(cenario[nome].id)


async def test_docente_ve_so_as_proprias_provas_e_os_outros_tipos(client, cenario):
    ids = await _ids(client, cenario["docente"])

    assert _id(cenario, "prova.minha") in ids
    assert _id(cenario, "palestra.coord") in ids
    for alheia in ("prova.colega", "prova.coord", "prova.todos"):
        assert _id(cenario, alheia) not in ids


async def test_filtro_de_provas_e_janela_do_mes_seguem_a_mesma_regra(client, cenario):
    agora = datetime.now(UTC)
    janela = (
        f"&de={(agora - timedelta(days=2)).isoformat()}"
        f"&ate={(agora + timedelta(days=30)).isoformat()}&incluir_encerrados=true"
    ).replace("+", "%2B")

    assert await _ids(client, cenario["docente"], "&tipo=prova") == {_id(cenario, "prova.minha")}
    mes = await _ids(client, cenario["docente"], janela)
    assert _id(cenario, "prova.minha") in mes
    assert _id(cenario, "prova.colega") not in mes
    assert _id(cenario, "prova.coord") not in mes


async def test_detalhe_da_prova_de_outro_e_404_para_o_docente(client, cenario):
    r = await client.get(
        f"/eventos/{cenario['prova.colega'].id}", headers=bearer(cenario["docente"])
    )
    assert r.status_code == 404
    assert r.json()["code"] == "EVENTO_NAO_ENCONTRADO"

    r = await client.get(
        f"/eventos/{cenario['prova.minha'].id}", headers=bearer(cenario["docente"])
    )
    assert r.status_code == 200


async def test_cada_docente_ve_a_sua_prova(client, cenario):
    ids = await _ids(client, cenario["colega"], "&tipo=prova")

    assert ids == {_id(cenario, "prova.colega")}


@pytest.mark.parametrize("perfil", ["aluno.d", "coord"])
async def test_aluno_e_coordenacao_continuam_vendo_as_provas_que_os_alcancam(
    client, cenario, perfil
):
    ids = await _ids(client, cenario[perfil], "&tipo=prova")

    esperadas = (
        {"prova.todos"}
        if perfil == "coord"
        else {"prova.minha", "prova.colega", "prova.coord", "prova.todos"}
    )
    assert ids == {_id(cenario, n) for n in esperadas}
