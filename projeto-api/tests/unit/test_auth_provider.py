"""Contrato do AuthProvider (spec.md §9.2: RF-01, RF-02, RF-03, RF-08).

Mesma suíte para os dois provedores; o real só roda com acesso ao Moodle.
"""

import dataclasses
import os

import pytest

from src.providers.auth.base import AuthenticatedUser
from src.providers.auth.mock_moodle import MockMoodleAuthProvider
from src.providers.auth.moodle import MoodleAuthProvider


@pytest.fixture(
    params=[
        pytest.param("mock", marks=pytest.mark.mock_auth),
        pytest.param("moodle", marks=pytest.mark.moodle_real),
    ]
)
def provider_e_credenciais(request):
    if request.param == "mock":
        return MockMoodleAuthProvider(), ("aluno.teste", "senha-teste")
    return MoodleAuthProvider(), (
        os.environ["MOODLE_TEST_USERNAME"],
        os.environ["MOODLE_TEST_PASSWORD"],
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

    assert campos == {"username", "nome"}


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
    assert await MockMoodleAuthProvider().authenticate(username, "senha-teste") is not None


async def test_stub_do_moodle_explica_que_nao_esta_implementado():
    with pytest.raises(NotImplementedError, match="Moodle"):
        await MoodleAuthProvider().authenticate("alguem", "x")
