"""Contrato de /gestao/usuarios (contracts/api.md §10; RF-09)."""

import uuid

import pytest

from tests.helpers import bearer, criar_turma, criar_usuario, vincular


@pytest.fixture
async def admin(db):
    return await criar_usuario(db, username="admin.g", nome="Admin G", perfil="administrador")


@pytest.fixture
async def coord(db):
    return await criar_usuario(db, username="coord.g", nome="Coord G", perfil="coordenacao")


# --- GET /gestao/usuarios -------------------------------------------------------------------


async def test_lista_paginada_com_os_campos_do_contrato(client, db, admin):
    await criar_usuario(db, username="aluno.g", nome="Aluno G")

    r = await client.get("/gestao/usuarios", headers=bearer(admin))

    assert r.status_code == 200
    body = r.json()
    assert (body["total"], body["limit"], body["offset"]) == (2, 20, 0)
    item = next(i for i in body["items"] if i["username"] == "aluno.g")
    assert set(item) == {"id", "username", "nome", "perfil", "ativo", "ultimo_login_em"}
    assert (item["perfil"], item["ativo"], item["ultimo_login_em"]) == ("aluno", True, None)


async def test_ordena_por_nome(client, db, admin):
    for nome in ["Zélia", "Bruno", "Ana"]:
        await criar_usuario(db, username=nome.lower(), nome=nome)

    r = await client.get("/gestao/usuarios", headers=bearer(admin))

    assert [i["nome"] for i in r.json()["items"]] == ["Admin G", "Ana", "Bruno", "Zélia"]


async def test_filtros_q_perfil_e_ativo(client, db, admin):
    await criar_usuario(db, username="maria.silva", nome="Maria Silva", perfil="docente")
    await criar_usuario(db, username="joao", nome="João Souza", ativo=False)

    por_q = await client.get("/gestao/usuarios?q=SILVA", headers=bearer(admin))
    por_username = await client.get("/gestao/usuarios?q=joao", headers=bearer(admin))
    por_perfil = await client.get("/gestao/usuarios?perfil=docente", headers=bearer(admin))
    inativos = await client.get("/gestao/usuarios?ativo=false", headers=bearer(admin))

    assert [i["username"] for i in por_q.json()["items"]] == ["maria.silva"]
    assert [i["username"] for i in por_username.json()["items"]] == ["joao"]
    assert [i["username"] for i in por_perfil.json()["items"]] == ["maria.silva"]
    assert [i["username"] for i in inativos.json()["items"]] == ["joao"]


async def test_coordenacao_le_a_lista(client, coord):
    assert (await client.get("/gestao/usuarios", headers=bearer(coord))).status_code == 200


async def test_docente_nao_lista_usuarios(client, db):
    docente = await criar_usuario(db, username="d.g", perfil="docente")

    r = await client.get("/gestao/usuarios", headers=bearer(docente))

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.mark.parametrize("query", ["perfil=monitor", "ativo=talvez", "limit=0"])
async def test_filtro_invalido_e_422(client, admin, query):
    r = await client.get(f"/gestao/usuarios?{query}", headers=bearer(admin))

    assert r.status_code == 422


# --- GET /gestao/usuarios/{id} --------------------------------------------------------------


async def test_detalhe_traz_as_turmas_com_o_papel(client, db, admin):
    aluno = await criar_usuario(db, username="aluno.det", nome="Aluno Det")
    turma = await criar_turma(db, codigo="TADS-3A", nome="TADS 3º Sem A")
    await vincular(db, turma, aluno.id)

    r = await client.get(f"/gestao/usuarios/{aluno.id}", headers=bearer(admin))

    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "aluno.det"
    assert body["turmas"] == [
        {"id": str(turma.id), "codigo": "TADS-3A", "nome": "TADS 3º Sem A", "papel": "aluno"}
    ]


async def test_detalhe_inexistente_e_404(client, admin):
    r = await client.get(f"/gestao/usuarios/{uuid.uuid4()}", headers=bearer(admin))

    assert (r.status_code, r.json()["code"]) == (404, "USUARIO_NAO_ENCONTRADO")


# --- PATCH /gestao/usuarios/{id} ------------------------------------------------------------


async def test_administrador_altera_perfil_e_situacao(client, db, admin):
    alvo = await criar_usuario(db, username="alvo")

    r = await client.patch(
        f"/gestao/usuarios/{alvo.id}",
        headers=bearer(admin),
        json={"perfil": "docente", "ativo": False},
    )

    assert r.status_code == 200
    assert (r.json()["perfil"], r.json()["ativo"]) == ("docente", False)
    assert set(r.json()) == {"id", "username", "nome", "perfil", "ativo", "ultimo_login_em"}


async def test_coordenacao_nao_altera_perfil(client, db, coord):
    alvo = await criar_usuario(db, username="alvo")

    r = await client.patch(
        f"/gestao/usuarios/{alvo.id}", headers=bearer(coord), json={"perfil": "docente"}
    )

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


async def test_patch_de_usuario_inexistente_e_404(client, admin):
    r = await client.patch(
        f"/gestao/usuarios/{uuid.uuid4()}", headers=bearer(admin), json={"ativo": False}
    )

    assert (r.status_code, r.json()["code"]) == (404, "USUARIO_NAO_ENCONTRADO")


async def test_perfil_incompativel_com_vinculos_e_409(client, db, admin):
    aluno = await criar_usuario(db, username="aluno.vinc")
    await vincular(db, await criar_turma(db), aluno.id)

    r = await client.patch(
        f"/gestao/usuarios/{aluno.id}", headers=bearer(admin), json={"perfil": "coordenacao"}
    )

    assert (r.status_code, r.json()["code"]) == (409, "PERFIL_INCOMPATIVEL")


@pytest.mark.parametrize(
    "corpo",
    [{}, {"perfil": "monitor"}, {"ativo": "sim"}, {"perfil": None}],
    ids=["vazio", "perfil-invalido", "ativo-invalido", "perfil-nulo"],
)
async def test_corpo_invalido_e_422(client, db, admin, corpo):
    alvo = await criar_usuario(db, username="alvo")

    r = await client.patch(f"/gestao/usuarios/{alvo.id}", headers=bearer(admin), json=corpo)

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
