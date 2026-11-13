"""Versões e histórico do evento (spec E3 §2.2, US3; RF-39, RF-41, RF-42; SC-E3-003)."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from src.models.evento import Evento
from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao
from src.repositories.auditoria_repository import AuditoriaRepository
from tests.helpers import bearer, criar_turma, criar_usuario, vincular

BASE = {
    "titulo": "Banca de TCC",
    "tipo": "banca",
    "inicio": "2030-04-10T19:00:00Z",
    "fim": "2030-04-10T21:00:00Z",
    "local": "Sala 203",
    "destinos": [{"tipo": "todos"}],
}


@pytest.fixture
async def coord(db):
    return await criar_usuario(db, username="coord.hist", nome="Coord Hist", perfil="coordenacao")


async def _criar(client, autor, **campos) -> dict:
    r = await client.post("/gestao/eventos", headers=bearer(autor), json=BASE | campos)
    assert r.status_code == 201, r.text
    return r.json()


async def _contar(db, modelo) -> int:
    return await db.scalar(select(func.count()).select_from(modelo))


async def test_cada_operacao_gera_um_registro_com_usuario_e_data(client, db, coord):
    evento = await _criar(client, coord)
    url = f"/gestao/eventos/{evento['id']}"
    await client.patch(url, headers=bearer(coord), json={"titulo": "Banca remarcada"})
    await client.post(f"{url}/arquivar", headers=bearer(coord))
    await client.post(f"{url}/desarquivar", headers=bearer(coord))
    await client.delete(url, headers=bearer(coord))

    r = await client.get(f"{url}/historico", headers=bearer(coord))

    assert r.status_code == 200
    itens = r.json()["items"]
    assert [i["tipo"] for i in itens] == [
        "excluido",
        "desarquivado",
        "arquivado",
        "editado",
        "criado",
    ]
    assert all(i["usuario"] == {"id": str(coord.id), "nome": "Coord Hist"} for i in itens)
    assert all(i["ocorrido_em"] for i in itens)
    assert [i["versao"] for i in itens] == [None, None, None, 2, 1]


async def test_edicao_registra_so_os_campos_alterados_com_de_e_para(client, db, coord):
    turma = await criar_turma(db)
    evento = await _criar(client, coord)

    await client.patch(
        f"/gestao/eventos/{evento['id']}",
        headers=bearer(coord),
        json={
            "titulo": "Banca de TCC",
            "inicio": "2030-04-11T19:00:00Z",
            "fim": "2030-04-11T21:00:00Z",
            "local": "Lab 4",
            "destinos": [{"tipo": "turma", "turma_id": str(turma.id)}],
        },
    )

    r = await client.get(f"/gestao/eventos/{evento['id']}/historico", headers=bearer(coord))
    alteracoes = r.json()["items"][0]["alteracoes"]
    assert set(alteracoes) == {"inicio", "fim", "local", "destinos"}
    assert alteracoes["local"] == {"de": "Sala 203", "para": "Lab 4"}
    assert alteracoes["inicio"] == {
        "de": "2030-04-10T19:00:00+00:00",
        "para": "2030-04-11T19:00:00+00:00",
    }
    assert alteracoes["destinos"]["para"] == [
        {"tipo": "turma", "turma_id": str(turma.id), "semestre": None}
    ]


async def test_versoes_preservam_cada_versao_completa(client, db, coord):
    evento = await _criar(client, coord)
    await client.patch(
        f"/gestao/eventos/{evento['id']}",
        headers=bearer(coord),
        json={"local": "Lab 4", "descricao": "Nova sala", "destinos": [{"tipo": "docentes"}]},
    )

    r = await client.get(f"/gestao/eventos/{evento['id']}/versoes", headers=bearer(coord))

    assert r.status_code == 200
    v2, v1 = r.json()["items"]
    assert (v1["versao"], v1["local"], v1["descricao"], v1["destinos"][0]["tipo"]) == (
        1,
        "Sala 203",
        None,
        "todos",
    )
    assert (v2["versao"], v2["local"], v2["descricao"], v2["destinos"][0]["tipo"]) == (
        2,
        "Lab 4",
        "Nova sala",
        "docentes",
    )
    assert set(v1) == {
        "versao",
        "titulo",
        "descricao",
        "tipo",
        "inicio",
        "fim",
        "local",
        "destinos",
        "criada_por",
        "criada_em",
    }
    assert v1["criada_por"] == {"id": str(coord.id), "nome": "Coord Hist"}


async def test_excluido_continua_auditavel_pela_gestao(client, db, coord):
    evento = await _criar(client, coord)
    await client.delete(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))
    admin = await criar_usuario(db, username="admin.hist", perfil="administrador")

    for sufixo in ("versoes", "historico"):
        r = await client.get(f"/gestao/eventos/{evento['id']}/{sufixo}", headers=bearer(admin))
        assert r.status_code == 200


async def test_docente_nao_audita_evento_alheio_e_audita_o_proprio(client, db, coord):
    docente = await criar_usuario(db, username="docente.hist", perfil="docente")
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="docente")
    alheio = await _criar(client, coord)
    proprio = await _criar(client, docente, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}])

    for sufixo in ("versoes", "historico"):
        r = await client.get(f"/gestao/eventos/{alheio['id']}/{sufixo}", headers=bearer(docente))
        assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")
        r = await client.get(f"/gestao/eventos/{proprio['id']}/{sufixo}", headers=bearer(docente))
        assert r.status_code == 200


async def test_inexistente_e_404(client, coord):
    r = await client.get(f"/gestao/eventos/{uuid.uuid4()}/historico", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "EVENTO_NAO_ENCONTRADO")


@pytest.mark.parametrize("operacao", ["criar", "editar", "arquivar", "desarquivar", "excluir"])
async def test_falha_ao_gravar_o_historico_desfaz_a_operacao_inteira(
    app, db, monkeypatch, coord, operacao
):
    transporte = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transporte, base_url="https://test") as c:
        evento = None
        if operacao != "criar":
            evento = await _criar(c, coord)
        if operacao == "desarquivar":
            await c.post(f"/gestao/eventos/{evento['id']}/arquivar", headers=bearer(coord))

        def falhar(*_, **__):
            raise RuntimeError("disco cheio")

        monkeypatch.setattr(AuditoriaRepository, "registrar", falhar)
        match operacao:
            case "criar":
                r = await c.post("/gestao/eventos", headers=bearer(coord), json=BASE)
            case "editar":
                r = await c.patch(
                    f"/gestao/eventos/{evento['id']}",
                    headers=bearer(coord),
                    json={"titulo": "Editado"},
                )
            case "excluir":
                r = await c.delete(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))
            case _:
                r = await c.post(
                    f"/gestao/eventos/{evento['id']}/{operacao}", headers=bearer(coord)
                )

    assert r.status_code == 500
    db.expire_all()
    if operacao == "criar":
        assert (await _contar(db, Evento), await _contar(db, EventoVersao)) == (0, 0)
    else:
        guardado = await db.get(Evento, evento["id"])
        situacao_antes = "arquivado" if operacao == "desarquivar" else "ativo"
        assert (guardado.titulo, guardado.situacao, guardado.versao_atual) == (
            "Banca de TCC",
            situacao_antes,
            1,
        )
        assert await _contar(db, EventoVersao) == 1
    registros_antes = {"criar": 0, "desarquivar": 2}.get(operacao, 1)
    assert await _contar(db, EventoHistorico) == registros_antes
