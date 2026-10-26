"""Formato de erro {detail, code} nas rotas reais, e 401 × 403 (RF-05, RF-29; T066, T067)."""

import uuid
from datetime import UTC, datetime, timedelta

import jwt
import pytest

from src.core.config import get_settings
from tests.helpers import bearer, criar_usuario


def _token(sub, exp_delta=timedelta(hours=1), segredo=None):
    claims = {"sub": str(sub), "perfil": "aluno", "exp": datetime.now(UTC) + exp_delta}
    return jwt.encode(claims, segredo or get_settings().JWT_SECRET, algorithm="HS256")


@pytest.fixture
async def aluno(db):
    return await criar_usuario(db, username="aluno.erros")


async def _assert_erro(r, status, code):
    assert r.status_code == status
    body = r.json()
    assert body["code"] == code
    assert isinstance(body["detail"], str) and body["detail"]
    assert set(body) == ({"detail", "code", "errors"} if status == 422 else {"detail", "code"})


# --- 401: sem credencial válida --------------------------------------------------------------


@pytest.mark.parametrize(
    "authorization",
    ["", "Bearer", "Bearer lixo", "Basic YWx1bm86c2VuaGE="],
    ids=["vazio", "bearer-sem-token", "token-malformado", "outro-esquema"],
)
async def test_credencial_ausente_ou_malformada_e_401(client, authorization):
    headers = {"Authorization": authorization} if authorization else {}

    await _assert_erro(await client.get("/me", headers=headers), 401, "NAO_AUTENTICADO")


async def test_token_expirado_e_401(client, aluno):
    token = _token(aluno.id, exp_delta=timedelta(seconds=-1))

    r = await client.get("/me", headers={"Authorization": f"Bearer {token}"})

    await _assert_erro(r, 401, "NAO_AUTENTICADO")


async def test_token_com_assinatura_de_outro_segredo_e_401(client, aluno):
    token = _token(aluno.id, segredo="segredo-forjado-com-tamanho-suficiente-para-hs256")

    r = await client.get("/me", headers={"Authorization": f"Bearer {token}"})

    await _assert_erro(r, 401, "NAO_AUTENTICADO")


async def test_token_de_usuario_que_nao_existe_mais_e_401(client):
    r = await client.get("/me", headers={"Authorization": f"Bearer {_token(uuid.uuid4())}"})

    await _assert_erro(r, 401, "NAO_AUTENTICADO")


# --- 403: autenticado, mas sem permissão -----------------------------------------------------


async def test_inativo_e_403_e_nao_401(client, db):
    usuario = await criar_usuario(db, username="inativo.erros", ativo=False)

    await _assert_erro(await client.get("/me", headers=bearer(usuario)), 403, "USUARIO_INATIVO")


async def test_perfil_sem_permissao_e_403_e_nao_401(client, db):
    docente = await criar_usuario(db, username="docente.erros", perfil="docente")

    r = await client.get("/turmas/disponiveis", headers=bearer(docente))

    await _assert_erro(r, 403, "SEM_PERMISSAO")


# --- Demais formatos -------------------------------------------------------------------------


async def test_404_de_dominio(client, aluno):
    r = await client.get(f"/avisos/{uuid.uuid4()}", headers=bearer(aluno))

    await _assert_erro(r, 404, "AVISO_NAO_ENCONTRADO")


async def test_422_lista_campo_e_mensagem(client, aluno):
    r = await client.get("/avisos?limit=500&offset=-1", headers=bearer(aluno))

    await _assert_erro(r, 422, "VALIDATION_ERROR")
    erros = {e["campo"]: e["mensagem"] for e in r.json()["errors"]}
    assert erros == {
        "limit": "deve ser menor ou igual a 100",
        "offset": "deve ser maior ou igual a 0",
    }


async def test_404_de_rota_e_405(client):
    await _assert_erro(await client.get("/inexistente"), 404, "NAO_ENCONTRADO")
    await _assert_erro(await client.put("/me"), 405, "METODO_NAO_PERMITIDO")
