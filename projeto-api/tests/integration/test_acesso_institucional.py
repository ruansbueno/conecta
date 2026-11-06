"""Primeiro login pela API do IFSul: o tipo institucional decide se a pessoa entra ou pede acesso
(RF-08, emenda v2.3). Aluno entra como aluno; administrativo (ou tipo desconhecido) fica
aguardando a administração ou a coordenação, sem sessão. O perfil nunca vem do provedor.
"""

import pytest
from sqlalchemy import select

from src.models.usuario import Usuario
from src.providers.auth.base import AuthenticatedUser
from src.providers.auth.factory import get_auth_provider
from src.providers.auth.mock import MockAuthProvider
from tests.helpers import criar_usuario, login

PENDENTE = {
    "detail": "Acesso aguardando liberação",
    "code": "ACESSO_PENDENTE",
}
RECUSADO = {"detail": "Acesso não liberado", "code": "ACESSO_RECUSADO"}


class _Provedor:
    """Responde sempre a mesma pessoa, com e-mail (o simulado não informa e-mail)."""

    def __init__(self, usuario: AuthenticatedUser):
        self.usuario = usuario

    async def authenticate(self, username, password):
        return self.usuario


def _servidor(**campos):
    campos = {
        "username": "fulano.servidor",
        "nome": "Fulano Servidor",
        "email": "fulano@ifsul.edu.br",
        "tipo_institucional": "administrativo",
        **campos,
    }
    return AuthenticatedUser(**campos)


@pytest.fixture
def provedor(app):
    def _usar(usuario: AuthenticatedUser):
        app.dependency_overrides[get_auth_provider] = lambda: _Provedor(usuario)

    return _usar


async def _buscar(db, username):
    return await db.scalar(
        select(Usuario)
        .where(Usuario.username == username)
        .execution_options(populate_existing=True)
    )


async def test_aluno_novo_entra_como_aluno(client, db, provedor):
    provedor(_servidor(username="ana.aluna", tipo_institucional="aluno"))

    r = await login(client, "ana.aluna")

    assert r.status_code == 200
    assert r.json()["usuario"]["perfil"] == "aluno"
    usuario = await _buscar(db, "ana.aluna")
    assert (usuario.situacao_acesso, usuario.tipo_institucional) == ("liberado", "aluno")
    assert usuario.email == "fulano@ifsul.edu.br"


async def test_administrativo_novo_fica_aguardando_sem_sessao(client, db, provedor):
    provedor(_servidor())

    r = await login(client, "fulano.servidor")

    assert r.status_code == 403
    assert r.json() == PENDENTE
    assert "access_token" not in r.text
    assert not r.headers.get_list("set-cookie")
    usuario = await _buscar(db, "fulano.servidor")
    assert usuario.situacao_acesso == "pendente"
    assert usuario.perfil is None
    assert (usuario.nome, usuario.email) == ("Fulano Servidor", "fulano@ifsul.edu.br")
    assert usuario.tipo_institucional == "administrativo"


async def test_tipo_desconhecido_tambem_fica_aguardando(client, db, provedor):
    provedor(_servidor(username="terceiro.x", tipo_institucional=None))

    r = await login(client, "terceiro.x")

    assert r.json()["code"] == "ACESSO_PENDENTE"
    assert (await _buscar(db, "terceiro.x")).situacao_acesso == "pendente"


async def test_quem_aguarda_e_tenta_de_novo_continua_aguardando_com_dados_atualizados(
    client, db, provedor
):
    provedor(_servidor())
    await login(client, "fulano.servidor")
    provedor(_servidor(nome="Fulano de Tal Servidor", email="tal@ifsul.edu.br"))

    r = await login(client, "fulano.servidor")

    assert r.json() == PENDENTE
    usuario = await _buscar(db, "fulano.servidor")
    assert (usuario.nome, usuario.email) == ("Fulano de Tal Servidor", "tal@ifsul.edu.br")
    assert usuario.ultimo_login_em is not None


async def test_recusado_nao_entra(client, db, provedor):
    await criar_usuario(
        db,
        username="fulano.servidor",
        perfil=None,
        situacao_acesso="recusado",
        tipo_institucional="administrativo",
    )
    provedor(_servidor())

    r = await login(client, "fulano.servidor")

    assert r.status_code == 403
    assert r.json() == RECUSADO


async def test_depois_de_liberado_entra_com_o_perfil_concedido(client, db, provedor):
    await criar_usuario(
        db,
        username="fulano.servidor",
        perfil="docente",
        situacao_acesso="liberado",
        tipo_institucional="administrativo",
    )
    provedor(_servidor())

    r = await login(client, "fulano.servidor")

    assert r.status_code == 200
    assert r.json()["usuario"]["perfil"] == "docente"


async def test_usuario_que_ja_existe_nao_passa_pela_regra_do_tipo(client, db, app):
    # Contas criadas antes da integração (seed, E1/E2) seguem com o perfil que têm.
    await criar_usuario(db, username="docente.teste", nome="Docente de Teste", perfil="docente")
    app.dependency_overrides[get_auth_provider] = lambda: MockAuthProvider()

    r = await login(client, "docente.teste")

    assert r.status_code == 200
    assert r.json()["usuario"]["perfil"] == "docente"


async def test_desativado_aguardando_e_tratado_como_desativado(client, db, provedor):
    await criar_usuario(
        db, username="fulano.servidor", perfil=None, situacao_acesso="pendente", ativo=False
    )
    provedor(_servidor())

    r = await login(client, "fulano.servidor")

    assert r.json()["code"] == "USUARIO_INATIVO"


async def test_token_de_quem_nao_esta_liberado_nao_vale(client, db):
    # Defesa em profundidade: o login nunca emite, mas um token antigo não pode furar a regra.
    from tests.helpers import bearer

    usuario = await criar_usuario(
        db, username="fulano.servidor", perfil=None, situacao_acesso="pendente"
    )

    r = await client.get("/me", headers=bearer(usuario))

    assert r.status_code == 403
    assert r.json()["code"] == "ACESSO_PENDENTE"
