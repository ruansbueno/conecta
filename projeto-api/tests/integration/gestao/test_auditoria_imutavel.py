"""Versões e eventos de aviso são imutáveis, também no banco (spec §3.5; plan-e2 D-E2-3)."""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from tests.helpers import TODOS, criar_aviso, criar_usuario


@pytest.fixture
async def auditoria(db):
    autor = await criar_usuario(db, username="coord.auditoria", perfil="coordenacao")
    aviso = await criar_aviso(db, autor, [TODOS])
    db.add(
        AvisoVersao(
            aviso_id=aviso.id,
            versao=1,
            titulo=aviso.titulo,
            conteudo=aviso.conteudo,
            destinos=[{"tipo": "todos", "turma_id": None, "semestre": None}],
            criada_por=autor.id,
        )
    )
    db.add(AvisoEvento(aviso_id=aviso.id, tipo="criado", usuario_id=autor.id, versao=1))
    await db.commit()
    return aviso


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE tb_aviso_versao SET nm_aviso = 'adulterado'",
        "DELETE FROM tb_aviso_versao",
        "UPDATE tb_aviso_historico SET tp_operacao = 'excluido'",
        "DELETE FROM tb_aviso_historico",
    ],
)
async def test_banco_recusa_alterar_ou_apagar_auditoria(db, auditoria, sql):
    with pytest.raises(DBAPIError, match="imutável"):
        await db.execute(text(sql))
    await db.rollback()


async def test_versao_unica_por_aviso(db, auditoria):
    db.add(
        AvisoVersao(
            aviso_id=auditoria.id,
            versao=1,
            titulo="x",
            conteudo="y",
            destinos=[],
            criada_por=auditoria.autor_id,
        )
    )

    with pytest.raises(DBAPIError):
        await db.commit()


async def test_tipo_de_evento_fora_do_enum_e_recusado(db, auditoria):
    db.add(AvisoEvento(aviso_id=auditoria.id, tipo="restaurado", usuario_id=auditoria.autor_id))

    with pytest.raises(DBAPIError):
        await db.commit()


async def test_versao_e_evento_guardam_jsonb_e_datas(db, auditoria):
    versao = await db.scalar(text("SELECT txt_destinos FROM tb_aviso_versao"))
    evento = (
        await db.execute(text("SELECT dt_operacao, txt_alteracoes FROM tb_aviso_historico"))
    ).one()

    assert versao == [{"tipo": "todos", "turma_id": None, "semestre": None}]
    assert evento.dt_operacao is not None
    assert evento.txt_alteracoes is None
