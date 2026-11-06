"""Contrato de /gestao/acessos (contracts/api.md §10a; RF-50, RF-51, emenda v2.3): pedidos de
acesso de servidores (tipo institucional administrativo). Administração concede qualquer perfil;
coordenação, só docente ou coordenação, e só a pedidos pendentes.
"""

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from src.models.usuario import Usuario
from tests.helpers import bearer, criar_turma, criar_usuario, login


@pytest.fixture
async def admin(db):
    return await criar_usuario(db, username="admin.a", nome="Admin A", perfil="administrador")


@pytest.fixture
async def coord(db):
    return await criar_usuario(db, username="coord.a", nome="Coord A", perfil="coordenacao")


async def pedido(db, username="servidor.a", nome="Servidor A", situacao="pendente", **campos):
    return await criar_usuario(
        db,
        username=username,
        nome=nome,
        perfil=None,
        situacao_acesso=situacao,
        tipo_institucional="administrativo",
        email=f"{username}@ifsul.edu.br",
        **campos,
    )


# --- GET /gestao/acessos ---------------------------------------------------------------------


async def test_lista_os_pendentes_no_formato_do_contrato(client, db, admin):
    alvo = await pedido(db)

    r = await client.get("/gestao/acessos", headers=bearer(admin))

    assert r.status_code == 200
    body = r.json()
    assert (body["total"], body["limit"], body["offset"]) == (1, 20, 0)
    item = body["items"][0]
    assert set(item) == {
        "id",
        "username",
        "nome",
        "email",
        "tipo_institucional",
        "situacao",
        "solicitado_em",
        "decidido_em",
        "decidido_por",
    }
    assert item["id"] == str(alvo.id)
    assert (item["situacao"], item["tipo_institucional"]) == ("pendente", "administrativo")
    assert (item["decidido_em"], item["decidido_por"]) == (None, None)


async def test_mais_antigos_primeiro_e_filtro_por_situacao(client, db, admin):
    agora = datetime.now(UTC)
    await pedido(db, "s.novo", "Novo", criado_em=agora)
    await pedido(db, "s.antigo", "Antigo", criado_em=agora - timedelta(days=2))
    await pedido(db, "s.recusado", "Recusado", situacao="recusado")

    pendentes = await client.get("/gestao/acessos", headers=bearer(admin))
    recusados = await client.get("/gestao/acessos?situacao=recusado", headers=bearer(admin))

    assert [i["username"] for i in pendentes.json()["items"]] == ["s.antigo", "s.novo"]
    assert [i["username"] for i in recusados.json()["items"]] == ["s.recusado"]


async def test_coordenacao_tambem_ve_os_pedidos(client, db, coord):
    await pedido(db)

    r = await client.get("/gestao/acessos", headers=bearer(coord))

    assert r.json()["total"] == 1


@pytest.mark.parametrize("perfil", ["docente", "aluno"])
async def test_docente_e_aluno_nao_veem(client, db, perfil):
    usuario = await criar_usuario(db, username=f"{perfil}.a", perfil=perfil)

    r = await client.get("/gestao/acessos", headers=bearer(usuario))

    assert r.status_code == 403


async def test_situacao_invalida_e_422(client, admin):
    r = await client.get("/gestao/acessos?situacao=liberado", headers=bearer(admin))

    assert r.status_code == 422


# --- POST /gestao/acessos/{id}/aprovar -------------------------------------------------------


@pytest.mark.parametrize("perfil", ["administrador", "coordenacao", "docente", "aluno"])
async def test_administracao_concede_qualquer_perfil(client, db, admin, perfil):
    alvo = await pedido(db)

    r = await client.post(
        f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(admin), json={"perfil": perfil}
    )

    assert r.status_code == 200
    assert r.json()["perfil"] == perfil
    assert r.json()["situacao"] == "liberado"
    assert r.json()["decidido_por"] == {"id": str(admin.id), "nome": "Admin A"}
    assert r.json()["decidido_em"] is not None


@pytest.mark.parametrize("perfil", ["docente", "coordenacao"])
async def test_coordenacao_concede_docente_ou_coordenacao(client, db, coord, perfil):
    alvo = await pedido(db)

    r = await client.post(
        f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(coord), json={"perfil": perfil}
    )

    assert r.status_code == 200
    assert r.json()["perfil"] == perfil


@pytest.mark.parametrize("perfil", ["administrador", "aluno"])
async def test_coordenacao_nao_concede_administrador_nem_aluno(client, db, coord, perfil):
    alvo = await pedido(db)

    r = await client.post(
        f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(coord), json={"perfil": perfil}
    )

    assert r.status_code == 403
    assert r.json()["code"] == "SEM_PERMISSAO"
    assert (await _situacao(db, alvo.id)) == ("pendente", None)


async def test_recusado_so_a_administracao_libera(client, db, admin, coord):
    alvo = await pedido(db, situacao="recusado")

    pela_coord = await client.post(
        f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(coord), json={"perfil": "docente"}
    )
    pelo_admin = await client.post(
        f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(admin), json={"perfil": "docente"}
    )

    assert pela_coord.status_code == 403
    assert pelo_admin.status_code == 200


async def test_aprovar_quem_ja_esta_liberado_e_409(client, db, admin):
    ja = await criar_usuario(db, username="ja.liberado", perfil="docente")

    r = await client.post(
        f"/gestao/acessos/{ja.id}/aprovar", headers=bearer(admin), json={"perfil": "docente"}
    )

    assert r.status_code == 409
    assert r.json()["code"] == "ACESSO_JA_DECIDIDO"


async def test_aprovar_sem_perfil_ou_com_perfil_invalido_e_422(client, db, admin):
    alvo = await pedido(db)

    sem = await client.post(f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(admin), json={})
    invalido = await client.post(
        f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(admin), json={"perfil": "reitor"}
    )

    assert (sem.status_code, invalido.status_code) == (422, 422)


async def test_aprovar_quem_nao_existe_e_404(client, admin):
    r = await client.post(
        f"/gestao/acessos/{uuid.uuid4()}/aprovar", headers=bearer(admin), json={"perfil": "docente"}
    )

    assert r.status_code == 404
    assert r.json()["code"] == "USUARIO_NAO_ENCONTRADO"


async def test_aprovado_entra_no_proximo_login_com_o_perfil(client, db, app, admin):
    from src.providers.auth.factory import get_auth_provider
    from src.providers.auth.mock import MockAuthProvider

    app.dependency_overrides[get_auth_provider] = lambda: MockAuthProvider(
        {"servidor.a": ("Servidor A", "administrativo")}
    )
    assert (await login(client, "servidor.a")).json()["code"] == "ACESSO_PENDENTE"
    alvo = await db.scalar(select(Usuario).where(Usuario.username == "servidor.a"))

    await client.post(
        f"/gestao/acessos/{alvo.id}/aprovar", headers=bearer(admin), json={"perfil": "docente"}
    )
    r = await login(client, "servidor.a")

    assert r.status_code == 200
    assert r.json()["usuario"]["perfil"] == "docente"


# --- POST /gestao/acessos/{id}/recusar -------------------------------------------------------


@pytest.mark.parametrize("perfil", ["administrador", "coordenacao"])
async def test_administracao_ou_coordenacao_recusa_um_pendente(client, db, perfil):
    gestor = await criar_usuario(db, username=f"gestor.{perfil}", perfil=perfil)
    alvo = await pedido(db)

    r = await client.post(f"/gestao/acessos/{alvo.id}/recusar", headers=bearer(gestor))

    assert r.status_code == 200
    assert (r.json()["situacao"], r.json()["perfil"]) == ("recusado", None)
    assert r.json()["decidido_por"]["id"] == str(gestor.id)


async def test_recusar_o_que_nao_esta_pendente_e_409(client, db, admin):
    recusado = await pedido(db, situacao="recusado")
    liberado = await criar_usuario(db, username="ja.liberado", perfil="docente")

    for alvo in (recusado, liberado):
        r = await client.post(f"/gestao/acessos/{alvo.id}/recusar", headers=bearer(admin))
        assert r.status_code == 409
        assert r.json()["code"] == "ACESSO_JA_DECIDIDO"


# --- quem não está liberado fica fora do resto da gestão -------------------------------------


async def test_lista_de_usuarios_mostra_so_quem_esta_liberado(client, db, admin):
    await pedido(db)
    await pedido(db, "s.recusado", situacao="recusado")

    r = await client.get("/gestao/usuarios", headers=bearer(admin))

    assert [i["username"] for i in r.json()["items"]] == ["admin.a"]


async def test_alterar_ou_ver_quem_aguarda_pela_rota_de_usuarios_e_404(client, db, admin):
    alvo = await pedido(db)

    detalhe = await client.get(f"/gestao/usuarios/{alvo.id}", headers=bearer(admin))
    patch = await client.patch(
        f"/gestao/usuarios/{alvo.id}", headers=bearer(admin), json={"perfil": "docente"}
    )

    assert (detalhe.status_code, patch.status_code) == (404, 404)


async def test_quem_aguarda_nao_pode_ser_vinculado_a_turma(client, db, coord):
    alvo = await pedido(db)
    turma = await criar_turma(db)

    r = await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(alvo.id), "papel": "docente"},
    )

    assert r.status_code == 404
    assert r.json()["code"] == "USUARIO_NAO_ENCONTRADO"


async def _situacao(db, usuario_id):
    usuario = await db.scalar(
        select(Usuario).where(Usuario.id == usuario_id).execution_options(populate_existing=True)
    )
    return usuario.situacao_acesso, usuario.perfil
