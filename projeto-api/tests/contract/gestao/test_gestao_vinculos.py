"""Contrato de /gestao/turmas/{id}/vinculos (contracts/api.md §12; RF-19)."""

import uuid

import pytest

from tests.helpers import bearer, criar_turma, criar_usuario, vincular


@pytest.fixture
async def coord(db):
    return await criar_usuario(db, username="coord.v", perfil="coordenacao")


@pytest.fixture
async def turma(db):
    return await criar_turma(db, codigo="T-VINC")


async def test_lista_vinculos_no_formato_do_contrato(client, db, coord, turma):
    aluno = await criar_usuario(db, username="aluno.v", nome="Aluno V")
    await vincular(db, turma, aluno.id, origem="solicitacao")

    r = await client.get(f"/gestao/turmas/{turma.id}/vinculos", headers=bearer(coord))

    assert r.status_code == 200
    body = r.json()
    assert (body["total"], body["limit"], body["offset"]) == (1, 20, 0)
    item = body["items"][0]
    assert set(item) == {"usuario", "papel", "origem", "criado_em"}
    assert item["usuario"] == {"id": str(aluno.id), "username": "aluno.v", "nome": "Aluno V"}
    assert (item["papel"], item["origem"]) == ("aluno", "solicitacao")


async def test_filtro_por_papel(client, db, coord, turma):
    await vincular(db, turma, (await criar_usuario(db, username="a1")).id)
    docente = await criar_usuario(db, username="d1", perfil="docente")
    await vincular(db, turma, docente.id, papel="docente")

    r = await client.get(f"/gestao/turmas/{turma.id}/vinculos?papel=docente", headers=bearer(coord))

    assert [i["usuario"]["username"] for i in r.json()["items"]] == ["d1"]


async def test_lista_de_turma_inexistente_e_404(client, coord):
    r = await client.get(f"/gestao/turmas/{uuid.uuid4()}/vinculos", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_docente_da_turma_le_e_docente_alheio_recebe_403(client, db, turma):
    da_turma = await criar_usuario(db, username="d.da", perfil="docente")
    alheio = await criar_usuario(db, username="d.alheio", perfil="docente")
    await vincular(db, turma, da_turma.id, papel="docente")

    ok = await client.get(f"/gestao/turmas/{turma.id}/vinculos", headers=bearer(da_turma))
    nao = await client.get(f"/gestao/turmas/{turma.id}/vinculos", headers=bearer(alheio))

    assert ok.status_code == 200
    assert (nao.status_code, nao.json()["code"]) == (403, "SEM_PERMISSAO")


# --- POST ----------------------------------------------------------------------------------


async def test_vincula_docente(client, db, coord, turma):
    docente = await criar_usuario(db, username="d.novo", nome="Docente Novo", perfil="docente")

    r = await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(docente.id), "papel": "docente"},
    )

    assert r.status_code == 201
    assert r.json()["usuario"]["username"] == "d.novo"
    assert (r.json()["papel"], r.json()["origem"]) == ("docente", "gestao")


async def test_turma_ou_usuario_inexistente_e_404(client, db, coord, turma):
    aluno = await criar_usuario(db, username="a.x")

    sem_turma = await client.post(
        f"/gestao/turmas/{uuid.uuid4()}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(aluno.id), "papel": "aluno"},
    )
    sem_usuario = await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(uuid.uuid4()), "papel": "aluno"},
    )

    assert sem_turma.json()["code"] == "TURMA_NAO_ENCONTRADA"
    assert (sem_usuario.status_code, sem_usuario.json()["code"]) == (404, "USUARIO_NAO_ENCONTRADO")


async def test_ja_vinculado_e_409(client, db, coord, turma):
    aluno = await criar_usuario(db, username="a.dup")
    await vincular(db, turma, aluno.id)

    r = await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(aluno.id), "papel": "aluno"},
    )

    assert (r.status_code, r.json()["code"]) == (409, "JA_VINCULADO")


@pytest.mark.parametrize(
    ("perfil", "papel"),
    [
        ("aluno", "docente"),
        ("docente", "aluno"),
        ("coordenacao", "docente"),
        ("administrador", "aluno"),
    ],
)
async def test_papel_incompativel_com_perfil_e_409(client, db, coord, turma, perfil, papel):
    usuario = await criar_usuario(db, username=f"u.{perfil}", perfil=perfil)

    r = await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(usuario.id), "papel": papel},
    )

    assert (r.status_code, r.json()["code"]) == (409, "PERFIL_INCOMPATIVEL")


@pytest.mark.parametrize(
    "corpo",
    [
        {},
        {"usuario_id": "abc", "papel": "aluno"},
        {"usuario_id": str(uuid.uuid4())},
        {"usuario_id": str(uuid.uuid4()), "papel": "monitor"},
    ],
)
async def test_corpo_invalido_e_422(client, coord, turma, corpo):
    r = await client.post(f"/gestao/turmas/{turma.id}/vinculos", headers=bearer(coord), json=corpo)

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")


# --- DELETE --------------------------------------------------------------------------------


async def test_remove_vinculo(client, db, coord, turma):
    aluno = await criar_usuario(db, username="a.rm")
    await vincular(db, turma, aluno.id)

    r = await client.delete(f"/gestao/turmas/{turma.id}/vinculos/{aluno.id}", headers=bearer(coord))
    lista = await client.get(f"/gestao/turmas/{turma.id}/vinculos", headers=bearer(coord))

    assert r.status_code == 204
    assert lista.json()["total"] == 0


async def test_remover_vinculo_inexistente_e_404(client, db, coord, turma):
    aluno = await criar_usuario(db, username="a.sem")

    r = await client.delete(f"/gestao/turmas/{turma.id}/vinculos/{aluno.id}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "VINCULO_NAO_ENCONTRADO")
