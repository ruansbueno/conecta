"""Nomenclatura do banco (data-model.md, "Nomes físicos"): tb_ nas tabelas, prefixo em toda coluna.

Confere o esquema criado pelas migrações reais, não o dos models: é o que fica no banco.
"""

import asyncio
import os
import uuid

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.pool import NullPool

from src.db.base import Base

PREFIXOS = ("id_", "nm_", "cod_", "txt_", "fl_", "dt_", "hr_", "nr_", "st_", "tp_")
# Última migração com os nomes antigos: a de renomear parte dela.
ANTES_DA_NOMENCLATURA = "9e05f46bf9bf"


def _esquema(url: str) -> dict[str, list[str]]:
    async def ler():
        engine = create_async_engine(url, poolclass=NullPool)
        async with engine.connect() as conn:
            esquema = await conn.run_sync(
                lambda c: {
                    t: [col["name"] for col in inspect(c).get_columns(t)]
                    for t in inspect(c).get_table_names()
                    if t != "alembic_version"
                }
            )
        await engine.dispose()
        return esquema

    return asyncio.run(ler())


def test_toda_tabela_comeca_com_tb(migrated_db):
    fora = [t for t in _esquema(migrated_db) if not t.startswith("tb_")]

    assert fora == []


def test_toda_coluna_tem_um_prefixo_do_padrao(migrated_db):
    fora = [
        f"{tabela}.{coluna}"
        for tabela, colunas in _esquema(migrated_db).items()
        for coluna in colunas
        if not coluna.startswith(PREFIXOS)
    ]

    assert fora == []


def test_models_e_migracoes_descrevem_o_mesmo_esquema(migrated_db):
    # Nomes de tabela, coluna, índice e restrição: nenhuma diferença que o autogenerate veria.
    async def comparar():
        engine = create_async_engine(migrated_db, poolclass=NullPool)
        async with engine.connect() as conn:
            diferencas = await conn.run_sync(
                lambda c: compare_metadata(MigrationContext.configure(c), Base.metadata)
            )
        await engine.dispose()
        return diferencas

    assert asyncio.run(comparar()) == []


def test_renomear_preserva_os_dados_e_volta_atras(migrated_db):
    cfg = Config(os.path.join(os.path.dirname(__file__), "..", "..", "alembic.ini"))
    usuario, turma = uuid.uuid4(), uuid.uuid4()

    async def executar(*sqls):
        engine = create_async_engine(migrated_db, poolclass=NullPool)
        async with engine.begin() as conn:
            resultados = []
            for sql in sqls:
                r = await conn.execute(text(sql))
                resultados.append(r.all() if r.returns_rows else [])
        await engine.dispose()
        return resultados

    command.downgrade(cfg, ANTES_DA_NOMENCLATURA)
    try:
        asyncio.run(
            executar(
                "TRUNCATE usuario, turma CASCADE",
                f"INSERT INTO usuario (id, username, nome, perfil) "
                f"VALUES ('{usuario}', 'nomenclatura.teste', 'Pessoa', 'docente') RETURNING id",
                f"INSERT INTO turma (id, codigo, nome, semestre_curso, periodo_letivo) "
                f"VALUES ('{turma}', 'TADS-N-2026-2', 'Turma N', 3, '2026/2') RETURNING id",
                f"INSERT INTO vinculo_turma (id, turma_id, usuario_id, papel, origem) "
                f"VALUES ('{uuid.uuid4()}', '{turma}', '{usuario}', 'docente', 'seed') "
                "RETURNING id",
            )
        )
        command.upgrade(cfg, "head")

        pessoa, grupo, vinculo = asyncio.run(
            executar(
                "SELECT id_usuario, cod_usuario, nm_usuario, tp_perfil, fl_ativo FROM tb_usuario",
                "SELECT cod_turma, nr_semestre, cod_periodo_letivo, fl_ativa FROM tb_turma",
                "SELECT id_usuario, id_turma, tp_papel FROM tb_usuario_turma",
            )
        )
        assert pessoa == [(usuario, "nomenclatura.teste", "Pessoa", "docente", True)]
        assert grupo == [("TADS-N-2026-2", 3, "2026/2", True)]
        assert vinculo == [(usuario, turma, "docente")]

        command.downgrade(cfg, ANTES_DA_NOMENCLATURA)
        (de_volta,) = asyncio.run(executar("SELECT id, username FROM usuario"))
        assert de_volta == [(usuario, "nomenclatura.teste")]
    finally:
        command.upgrade(cfg, "head")
        asyncio.run(executar("TRUNCATE tb_usuario, tb_turma CASCADE"))
