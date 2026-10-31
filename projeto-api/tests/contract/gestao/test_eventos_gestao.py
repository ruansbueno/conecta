"""Contrato de GET /gestao/eventos e GET /gestao/eventos/{id} (contracts E3 §5, §6)."""

import uuid

import pytest

from tests.contract.gestao.conftest import futuro
from tests.contract.gestao.test_eventos_criar import CAMPOS
from tests.helpers import bearer, criar_turma, criar_usuario, vincular


@pytest.fixture
async def docente(db):
    return await criar_usuario(db, username="docente.gev", perfil="docente")


async def _ids(client, usuario, query="") -> list[str]:
    r = await client.get(f"/gestao/eventos?limit=100&{query}", headers=bearer(usuario))
    assert r.status_code == 200, r.text
    return [e["id"] for e in r.json()["items"]]


async def test_gestao_ve_todos_menos_excluidos_por_inicio_crescente(client, coord, cadastrar):
    tarde = await cadastrar(coord, inicio=futuro(48))
    cedo = await cadastrar(coord, inicio=futuro(24))
    passado = await cadastrar(coord, inicio="2020-01-10T10:00:00Z")
    excluido = await cadastrar(coord)
    await client.delete(f"/gestao/eventos/{excluido['id']}", headers=bearer(coord))

    # A gestão vê também os já encerrados.
    assert await _ids(client, coord) == [passado["id"], cedo["id"], tarde["id"]]


async def test_intervalo_da_gestao_tambem_e_por_sobreposicao(client, coord, cadastrar):
    semana = await cadastrar(coord, inicio="2030-09-02T11:00:00Z", fim="2030-09-04T21:00:00Z")

    assert await _ids(client, coord, "de=2030-09-03T03:00:00Z&ate=2030-09-04T03:00:00Z") == [
        semana["id"]
    ]


async def test_docente_ve_so_os_que_criou(client, db, coord, docente, cadastrar):
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="docente")
    meu = await cadastrar(docente, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}])
    await cadastrar(coord)

    assert await _ids(client, docente) == [meu["id"]]


@pytest.mark.parametrize("situacao", ["ativo", "arquivado", "excluido"])
async def test_filtro_por_situacao(client, coord, cadastrar, situacao):
    eventos = {
        s: await cadastrar(coord, titulo=f"Evento {s}") for s in ("ativo", "arquivado", "excluido")
    }
    await client.post(
        f"/gestao/eventos/{eventos['arquivado']['id']}/arquivar", headers=bearer(coord)
    )
    await client.delete(f"/gestao/eventos/{eventos['excluido']['id']}", headers=bearer(coord))

    assert await _ids(client, coord, f"situacao={situacao}") == [eventos[situacao]["id"]]


async def test_docente_nao_lista_excluidos(client, docente):
    r = await client.get("/gestao/eventos?situacao=excluido", headers=bearer(docente))

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


async def test_filtros_tipo_autor_turma_intervalo_e_busca(client, db, coord, cadastrar):
    outra = await criar_usuario(db, username="coord.outra", perfil="coordenacao")
    turma = await criar_turma(db)
    banca = await cadastrar(coord, tipo="banca", titulo="Bancas de TCC")
    alheio = await cadastrar(outra, titulo="Reunião pedagógica")
    da_turma = await cadastrar(
        coord, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}], descricao="Sala 12"
    )
    em_2030 = await cadastrar(coord, inicio="2030-05-10T12:00:00Z")

    assert await _ids(client, coord, "tipo=banca") == [banca["id"]]
    assert await _ids(client, coord, f"autor_id={outra.id}") == [alheio["id"]]
    assert await _ids(client, coord, f"turma_id={turma.id}") == [da_turma["id"]]
    assert await _ids(client, coord, "de=2030-05-01T00:00:00Z&ate=2030-06-01T00:00:00Z") == [
        em_2030["id"]
    ]
    assert await _ids(client, coord, "q=tcc") == [banca["id"]]
    assert await _ids(client, coord, "q=sala 12") == [da_turma["id"]]


@pytest.mark.parametrize(
    ("query", "status", "code"),
    [
        (f"turma_id={uuid.uuid4()}", 404, "TURMA_NAO_ENCONTRADA"),
        ("situacao=agendado", 422, "VALIDATION_ERROR"),
        ("de=2030-06-01T00:00:00Z&ate=2030-05-01T00:00:00Z", 422, "VALIDATION_ERROR"),
    ],
    ids=["turma-inexistente", "situacao-de-aviso", "ate-antes-de-de"],
)
async def test_filtro_invalido(client, coord, query, status, code):
    r = await client.get(f"/gestao/eventos?{query}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (status, code)


async def test_detalhe_tem_o_formato_do_contrato(client, coord, cadastrar):
    evento = await cadastrar(coord, local="Auditório")

    r = await client.get(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))

    assert r.status_code == 200
    assert set(r.json()) == CAMPOS
    assert r.json() == evento


async def test_docente_nao_ve_evento_de_outra_pessoa(client, coord, docente, cadastrar):
    evento = await cadastrar(coord)

    r = await client.get(f"/gestao/eventos/{evento['id']}", headers=bearer(docente))

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


async def test_excluido_so_a_gestao_abre(client, db, coord, docente, cadastrar):
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="docente")
    meu = await cadastrar(docente, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}])
    await client.delete(f"/gestao/eventos/{meu['id']}", headers=bearer(docente))

    pela_gestao = await client.get(f"/gestao/eventos/{meu['id']}", headers=bearer(coord))
    pelo_docente = await client.get(f"/gestao/eventos/{meu['id']}", headers=bearer(docente))

    assert (pela_gestao.status_code, pela_gestao.json()["situacao"]) == (200, "excluido")
    assert (pelo_docente.status_code, pelo_docente.json()["code"]) == (
        404,
        "EVENTO_NAO_ENCONTRADO",
    )


async def test_inexistente_e_404(client, coord):
    r = await client.get(f"/gestao/eventos/{uuid.uuid4()}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "EVENTO_NAO_ENCONTRADO")
