"""Restrições da validação do DER (12/11/2026): decisor da solicitação e tipo institucional.

- tb_solicitacao_inscricao: tem decisor se, e somente se, não está pendente (na cancelada, o
  próprio aluno);
- tb_usuario: tp_institucional só 'aluno', 'administrativo' ou NULL.
"""

import asyncio
import os
import uuid

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from tests.helpers import criar_turma, criar_usuario

# Última migração antes destas restrições.
ANTES_DAS_RESTRICOES = "a7c4e1f0b923"


def _inserir_solicitacao(turma_id, aluno_id, status, decisor_id):
    decidida = "NULL" if status == "pendente" else "now()"
    decisor = "NULL" if decisor_id is None else f"'{decisor_id}'"
    return text(
        "INSERT INTO tb_solicitacao_inscricao "
        "(id_solicitacao, id_turma, id_usuario, st_solicitacao, dt_decisao, id_usuario_decisor) "
        f"VALUES (gen_random_uuid(), '{turma_id}', '{aluno_id}', '{status}', {decidida}, {decisor})"
    )


@pytest.mark.parametrize("status", ["aprovada", "recusada", "cancelada"])
async def test_solicitacao_decidida_sem_decisor_e_rejeitada_pelo_banco(db, status):
    aluno = await criar_usuario(db, username="aluno.x", perfil="aluno")
    turma = await criar_turma(db)

    with pytest.raises(IntegrityError, match="ck_tb_solicitacao_inscricao_decisor_coerente"):
        await db.execute(_inserir_solicitacao(turma.id, aluno.id, status, None))


async def test_solicitacao_pendente_com_decisor_e_rejeitada_pelo_banco(db):
    aluno = await criar_usuario(db, username="aluno.x", perfil="aluno")
    coord = await criar_usuario(db, username="coord.x", perfil="coordenacao")
    turma = await criar_turma(db)

    with pytest.raises(IntegrityError, match="ck_tb_solicitacao_inscricao_decisor_coerente"):
        await db.execute(_inserir_solicitacao(turma.id, aluno.id, "pendente", coord.id))


async def test_tipo_institucional_fora_da_lista_e_rejeitado_pelo_banco(db):
    with pytest.raises(IntegrityError, match="ck_tb_usuario_institucional_valido"):
        await criar_usuario(
            db, username="servidor.x", perfil="docente", tipo_institucional="servidor"
        )


@pytest.mark.parametrize("tipo", ["aluno", "administrativo", None])
async def test_tipo_institucional_aceita_aluno_administrativo_e_nulo(db, tipo):
    usuario = await criar_usuario(db, username="pessoa.x", perfil="aluno", tipo_institucional=tipo)

    assert usuario.tipo_institucional == tipo


# --- Migração com dados antigos -------------------------------------------------------------


def _cfg():
    return Config(os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini"))


def _executar(url, *sqls):
    async def rodar():
        engine = create_async_engine(url, poolclass=NullPool)
        async with engine.begin() as conn:
            resultados = []
            for sql in sqls:
                r = await conn.execute(text(sql))
                resultados.append(r.all() if r.returns_rows else [])
        await engine.dispose()
        return resultados

    return asyncio.run(rodar())


def _semear_antes(url, solicitacoes):
    """Usuário aluno, coordenação e turma, mais as solicitações [(id, status, decisor?)]."""
    aluno, coord, turma = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    sqls = [
        "TRUNCATE tb_usuario, tb_turma CASCADE",
        f"INSERT INTO tb_usuario (id_usuario, cod_usuario, nm_usuario, tp_perfil) "
        f"VALUES ('{aluno}', 'aluno.mig', 'Aluno', 'aluno'), "
        f"('{coord}', 'coord.mig', 'Coord', 'coordenacao')",
        f"INSERT INTO tb_turma (id_turma, cod_turma, nm_turma, nr_semestre, cod_periodo_letivo) "
        f"VALUES ('{turma}', 'TADS-M-2026-2', 'Turma M', 3, '2026/2')",
    ]
    for sid, status, com_decisor in solicitacoes:
        decisor = f"'{coord}'" if com_decisor else "NULL"
        sqls.append(
            "INSERT INTO tb_solicitacao_inscricao (id_solicitacao, id_turma, id_usuario, "
            "st_solicitacao, dt_decisao, id_usuario_decisor) "
            f"VALUES ('{sid}', '{turma}', '{aluno}', '{status}', now(), {decisor})"
        )
    _executar(url, *sqls)
    return aluno, coord


def test_migracao_preenche_a_cancelada_sem_decisor_com_o_proprio_aluno(migrated_db):
    cfg = _cfg()
    cancelada, recusada = uuid.uuid4(), uuid.uuid4()
    command.downgrade(cfg, ANTES_DAS_RESTRICOES)
    try:
        aluno, coord = _semear_antes(
            migrated_db, [(cancelada, "cancelada", False), (recusada, "recusada", True)]
        )
        command.upgrade(cfg, "head")

        (linhas,) = _executar(
            migrated_db,
            "SELECT id_solicitacao, id_usuario_decisor FROM tb_solicitacao_inscricao",
        )
        assert dict(linhas) == {cancelada: aluno, recusada: coord}
    finally:
        command.upgrade(cfg, "head")
        _executar(migrated_db, "TRUNCATE tb_usuario, tb_turma CASCADE")


def test_migracao_para_e_lista_a_decidida_sem_decisor_que_nao_e_cancelada(migrated_db):
    cfg = _cfg()
    recusada = uuid.uuid4()
    command.downgrade(cfg, ANTES_DAS_RESTRICOES)
    try:
        _semear_antes(migrated_db, [(recusada, "recusada", False)])

        with pytest.raises(Exception, match=str(recusada)):
            command.upgrade(cfg, "head")

        (linhas,) = _executar(
            migrated_db, "SELECT id_usuario_decisor FROM tb_solicitacao_inscricao"
        )
        assert linhas == [(None,)]  # nada inventado
    finally:
        _executar(migrated_db, "TRUNCATE tb_usuario, tb_turma CASCADE")
        command.upgrade(cfg, "head")


def test_migracao_para_e_lista_o_tipo_institucional_fora_da_lista(migrated_db):
    cfg = _cfg()
    command.downgrade(cfg, ANTES_DAS_RESTRICOES)
    try:
        _semear_antes(migrated_db, [])
        _executar(
            migrated_db,
            "UPDATE tb_usuario SET tp_institucional = 'servidor' WHERE cod_usuario = 'coord.mig'",
        )

        with pytest.raises(Exception, match="coord.mig"):
            command.upgrade(cfg, "head")
    finally:
        _executar(migrated_db, "TRUNCATE tb_usuario, tb_turma CASCADE")
        command.upgrade(cfg, "head")
