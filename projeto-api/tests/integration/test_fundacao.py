"""Fundação: modelo Usuario, formato de erro, paginação e dependências de autenticação.

RF-04, RF-05, RF-07, RF-10, RF-29.
"""

import uuid

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from src.api.errors import DomainError, register_error_handlers
from src.core.security import create_access_token, get_current_user, require_perfil
from src.db.session import get_session
from src.models.usuario import Usuario
from src.schemas.common import Page, PaginationParams


class _Corpo(BaseModel):
    titulo: str = Field(min_length=3, max_length=150)


@pytest.fixture
async def mini_client(session_factory):
    app = FastAPI()
    register_error_handlers(app)

    async def _session():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_session] = _session

    @app.get("/erro")
    async def erro():
        raise DomainError(409, "SOLICITACAO_DUPLICADA", "Já existe solicitação pendente")

    @app.post("/corpo")
    async def corpo(body: _Corpo):
        return body

    @app.get("/lista", response_model=Page[int])
    async def lista(page: PaginationParams = Depends()):
        return Page(items=[], total=0, limit=page.limit, offset=page.offset)

    @app.post("/protegida")
    @app.patch("/protegida")
    @app.delete("/protegida")
    @app.get("/protegida")
    async def protegida(usuario: Usuario = Depends(get_current_user)):
        return {"perfil": usuario.perfil}

    @app.get("/coordenacao", dependencies=[Depends(require_perfil("coordenacao"))])
    async def so_coordenacao():
        return {"ok": True}

    async with AsyncClient(transport=ASGITransport(app=app), base_url="https://test") as c:
        yield c


async def _criar_usuario(db, **campos) -> Usuario:
    usuario = Usuario(
        username=campos.pop("username", "fulano.teste"), nome=campos.pop("nome", "Fulano"), **campos
    )
    db.add(usuario)
    await db.commit()
    return usuario


def _bearer(usuario_id, perfil="aluno"):
    return {"Authorization": f"Bearer {create_access_token(usuario_id, perfil)}"}


# --- Modelo Usuario -------------------------------------------------------------------------


async def test_usuario_nasce_aluno_e_ativo(db):
    usuario = await _criar_usuario(db)
    await db.refresh(usuario)

    assert isinstance(usuario.id, uuid.UUID)
    assert usuario.perfil == "aluno"
    assert usuario.ativo is True
    assert usuario.criado_em is not None and usuario.criado_em.tzinfo is not None
    assert usuario.atualizado_em is not None
    assert usuario.ultimo_login_em is None


async def test_username_e_unico(db):
    await _criar_usuario(db, username="repetido")
    db.add(Usuario(username="repetido", nome="Outro"))

    with pytest.raises(IntegrityError):
        await db.commit()


async def test_perfil_fora_do_enum_e_rejeitado_pelo_banco(db):
    with pytest.raises(IntegrityError):
        await db.execute(
            text(
                "INSERT INTO usuario (id, username, nome, perfil) "
                "VALUES (gen_random_uuid(), 'x', 'X', 'superusuario')"
            )
        )


# --- Formato de erro e paginação ------------------------------------------------------------


async def test_erro_de_dominio_tem_detail_e_code(mini_client):
    r = await mini_client.get("/erro")

    assert r.status_code == 409
    assert r.json() == {"detail": "Já existe solicitação pendente", "code": "SOLICITACAO_DUPLICADA"}


async def test_erro_de_validacao_lista_os_campos(mini_client):
    r = await mini_client.post("/corpo", json={"titulo": "ab"})

    assert r.status_code == 422
    body = r.json()
    assert body["code"] == "VALIDATION_ERROR"
    assert body["detail"] == "Dados inválidos"
    assert body["errors"][0]["campo"] == "titulo"
    assert body["errors"][0]["mensagem"]


async def test_campo_ausente_e_erro_de_validacao(mini_client):
    r = await mini_client.post("/corpo", json={})

    assert r.status_code == 422
    assert r.json()["errors"][0]["campo"] == "titulo"


async def test_paginacao_padrao(mini_client):
    r = await mini_client.get("/lista")

    assert r.json() == {"items": [], "total": 0, "limit": 20, "offset": 0}


@pytest.mark.parametrize("query", ["limit=0", "limit=101", "offset=-1", "limit=abc"])
async def test_paginacao_fora_dos_limites_e_422(mini_client, query):
    r = await mini_client.get(f"/lista?{query}")

    assert r.status_code == 422
    assert r.json()["code"] == "VALIDATION_ERROR"


# --- get_current_user / require_perfil ------------------------------------------------------


async def test_sem_token_e_401(mini_client):
    r = await mini_client.get("/protegida")

    assert r.status_code == 401
    assert r.json()["code"] == "NAO_AUTENTICADO"


async def test_token_invalido_e_401(mini_client):
    r = await mini_client.get("/protegida", headers={"Authorization": "Bearer lixo"})

    assert r.status_code == 401
    assert r.json()["code"] == "NAO_AUTENTICADO"


async def test_token_de_usuario_inexistente_e_401(mini_client):
    r = await mini_client.get("/protegida", headers=_bearer(uuid.uuid4()))

    assert r.status_code == 401
    assert r.json()["code"] == "NAO_AUTENTICADO"


async def test_usuario_inativo_e_403(mini_client, db):
    usuario = await _criar_usuario(db, ativo=False)

    r = await mini_client.get("/protegida", headers=_bearer(usuario.id))

    assert r.status_code == 403
    assert r.json()["code"] == "USUARIO_INATIVO"


async def test_perfil_vem_do_banco_e_nao_do_token(mini_client, db):
    usuario = await _criar_usuario(db, perfil="coordenacao")

    r = await mini_client.get("/coordenacao", headers=_bearer(usuario.id, perfil="aluno"))

    assert r.status_code == 200


async def test_perfil_sem_permissao_e_403(mini_client, db):
    usuario = await _criar_usuario(db, perfil="aluno")

    r = await mini_client.get("/coordenacao", headers=_bearer(usuario.id, perfil="coordenacao"))

    assert r.status_code == 403
    assert r.json()["code"] == "SEM_PERMISSAO"


# --- Sessão por cookie (RF-32) e CSRF (RF-33) -----------------------------------------------


def _cookies(usuario_id, csrf="csrf-valido"):
    return {"conecta_sessao": create_access_token(usuario_id, "aluno"), "conecta_csrf": csrf}


async def test_leitura_so_com_cookie_de_sessao_funciona_sem_csrf(mini_client, db):
    usuario = await _criar_usuario(db)
    mini_client.cookies.update({"conecta_sessao": create_access_token(usuario.id, "aluno")})

    r = await mini_client.get("/protegida")

    assert r.status_code == 200


@pytest.mark.parametrize("metodo", ["POST", "PATCH", "DELETE"])
async def test_escrita_por_cookie_exige_csrf(mini_client, db, metodo):
    usuario = await _criar_usuario(db)
    mini_client.cookies.update(_cookies(usuario.id))

    sem = await mini_client.request(metodo, "/protegida")
    errado = await mini_client.request(metodo, "/protegida", headers={"X-CSRF-Token": "x"})
    certo = await mini_client.request(metodo, "/protegida", headers={"X-CSRF-Token": "csrf-valido"})

    assert (sem.status_code, sem.json()["code"]) == (403, "CSRF_INVALIDO")
    assert (errado.status_code, errado.json()["code"]) == (403, "CSRF_INVALIDO")
    assert certo.status_code == 200


async def test_escrita_por_cookie_sem_cookie_csrf_e_403(mini_client, db):
    usuario = await _criar_usuario(db)
    mini_client.cookies.update({"conecta_sessao": create_access_token(usuario.id, "aluno")})

    r = await mini_client.post("/protegida", headers={"X-CSRF-Token": ""})

    assert r.json()["code"] == "CSRF_INVALIDO"


async def test_bearer_tem_precedencia_sobre_o_cookie(mini_client, db):
    usuario = await _criar_usuario(db)
    mini_client.cookies.update(_cookies(usuario.id))

    r = await mini_client.get("/protegida", headers={"Authorization": "Bearer lixo"})

    assert r.status_code == 401


async def test_cookie_de_sessao_invalido_e_401(mini_client):
    mini_client.cookies.update({"conecta_sessao": "lixo"})

    r = await mini_client.get("/protegida")

    assert (r.status_code, r.json()["code"]) == (401, "NAO_AUTENTICADO")
