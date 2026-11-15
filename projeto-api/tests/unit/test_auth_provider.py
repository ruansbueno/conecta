"""Contrato do AuthProvider (spec.md §9.2: RF-01, RF-02, RF-03, RF-08).

Mesma suíte para os dois provedores; o real (API de autenticação do IFSul) só roda com
IFSUL_TEST_USERNAME e IFSUL_TEST_PASSWORD de uma conta institucional real.
"""

import dataclasses
import os

import pytest

from src.providers.auth.base import AuthenticatedUser
from src.providers.auth.ifsul import IfsulAuthProvider
from src.providers.auth.mock import MockAuthProvider


@pytest.fixture(
    params=[
        pytest.param("mock", marks=pytest.mark.mock_auth),
        pytest.param("ifsul", marks=pytest.mark.ifsul_real),
    ]
)
def provider_e_credenciais(request):
    if request.param == "mock":
        return MockAuthProvider(), ("aluno.teste", "senha-teste")
    if "IFSUL_TEST_USERNAME" not in os.environ:
        pytest.skip("sem IFSUL_TEST_USERNAME/IFSUL_TEST_PASSWORD de uma conta institucional real")
    return IfsulAuthProvider(os.environ["IFSUL_AUTH_URL"]), (
        os.environ["IFSUL_TEST_USERNAME"].strip().lower(),
        os.environ["IFSUL_TEST_PASSWORD"],
    )


async def test_credenciais_validas_identificam_o_usuario(provider_e_credenciais):
    provider, (username, password) = provider_e_credenciais

    user = await provider.authenticate(username, password)

    assert isinstance(user, AuthenticatedUser)
    assert user.username == username
    assert user.nome


async def test_senha_errada_nao_autentica(provider_e_credenciais):
    provider, (username, _) = provider_e_credenciais

    assert await provider.authenticate(username, "senha-errada") is None


async def test_usuario_inexistente_nao_autentica(provider_e_credenciais):
    provider, _ = provider_e_credenciais

    assert await provider.authenticate("usuario.que.nao.existe", "x") is None


def test_provedor_identifica_mas_nao_informa_perfil():
    campos = {f.name for f in dataclasses.fields(AuthenticatedUser)}

    assert campos == {"username", "nome", "email", "tipo_institucional"}
    assert "perfil" not in campos


@pytest.mark.mock_auth
@pytest.mark.parametrize(
    "username",
    [
        "admin.conecta",
        "admin.teste",
        "coord.teste",
        "docente.teste",
        "aluno.teste",
        "aluno2.teste",
        "aluno3.teste",
        "aluno.sem.turma",
    ],
)
async def test_mock_tem_os_usuarios_de_teste(username):
    assert await MockAuthProvider().authenticate(username, "senha-teste") is not None


@pytest.mark.mock_auth
@pytest.mark.parametrize(
    ("username", "tipo"),
    [
        ("aluno.teste", "aluno"),
        ("docente.teste", "administrativo"),
        ("servidor.novo", "administrativo"),
        ("aluno.novo2", "aluno"),
        ("servidor.novo2", "administrativo"),
    ],
)
async def test_mock_informa_o_tipo_institucional_como_a_api_do_ifsul(username, tipo):
    usuario = await MockAuthProvider().authenticate(username, "senha-teste")

    assert usuario.tipo_institucional == tipo
