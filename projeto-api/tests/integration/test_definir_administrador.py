"""Primeiro administrador com o provedor real: `python -m scripts.definir_administrador <login>`
(o admin.conecta do seed não existe no AD do IFSul). Também a restrição do banco: só quem está
liberado tem perfil.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from scripts.definir_administrador import definir_administrador
from src.models.usuario import Usuario
from tests.helpers import criar_usuario


async def _buscar(db, username):
    return await db.scalar(
        select(Usuario)
        .where(Usuario.username == username)
        .execution_options(populate_existing=True)
    )


async def test_cria_o_administrador_que_ainda_nao_entrou(db):
    await definir_administrador(db, "  Fulano.Admin ")

    usuario = await _buscar(db, "fulano.admin")
    assert (usuario.perfil, usuario.situacao_acesso, usuario.ativo) == (
        "administrador",
        "liberado",
        True,
    )
    assert usuario.nome == "fulano.admin"  # o nome real chega no 1º login


async def test_promove_quem_aguarda_acesso(db):
    await criar_usuario(
        db, username="fulano.admin", nome="Fulano", perfil=None, situacao_acesso="pendente"
    )

    await definir_administrador(db, "fulano.admin")

    usuario = await _buscar(db, "fulano.admin")
    assert (usuario.perfil, usuario.situacao_acesso, usuario.nome) == (
        "administrador",
        "liberado",
        "Fulano",
    )


async def test_reativa_e_promove_quem_ja_existe(db):
    await criar_usuario(db, username="fulano.admin", perfil="docente", ativo=False)

    await definir_administrador(db, "fulano.admin")

    usuario = await _buscar(db, "fulano.admin")
    assert (usuario.perfil, usuario.ativo) == ("administrador", True)


async def test_login_vazio_e_recusado(db):
    with pytest.raises(ValueError, match="login"):
        await definir_administrador(db, "  ")


@pytest.mark.parametrize(
    ("perfil", "situacao"),
    [(None, "liberado"), ("docente", "pendente"), ("docente", "recusado"), (None, "outra")],
)
async def test_banco_so_aceita_perfil_quando_liberado(db, perfil, situacao):
    db.add(Usuario(username="x", nome="X", perfil=perfil, situacao_acesso=situacao))

    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()
