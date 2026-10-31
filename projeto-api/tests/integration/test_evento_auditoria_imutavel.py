"""Versões e histórico de evento são imutáveis no banco, como os do aviso (spec E3 §2.2; D-E2-3).

Também confere as restrições das tabelas da E3 que só o banco garante.
"""

from datetime import UTC, datetime, time, timedelta

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, IntegrityError

from src.models.evento import Evento, EventoDestino
from src.models.evento_historico import EventoHistorico
from src.models.evento_versao import EventoVersao
from src.models.horario import Horario
from tests.helpers import criar_turma, criar_usuario

INICIO = datetime(2026, 11, 10, 19, 0, tzinfo=UTC)


async def _evento(db, autor, **campos) -> Evento:
    evento = Evento(
        titulo=campos.pop("titulo", "Defesas de TCC II"),
        tipo=campos.pop("tipo", "banca"),
        inicio=campos.pop("inicio", INICIO),
        autor_id=autor.id,
        destinos=[EventoDestino(tipo="todos")],
        **campos,
    )
    db.add(evento)
    await db.commit()
    return evento


@pytest.fixture
async def auditoria(db):
    autor = await criar_usuario(db, username="coord.agenda", perfil="coordenacao")
    evento = await _evento(db, autor)
    db.add(
        EventoVersao(
            evento_id=evento.id,
            versao=1,
            titulo=evento.titulo,
            tipo=evento.tipo,
            inicio=evento.inicio,
            destinos=[{"tipo": "todos", "turma_id": None, "semestre": None}],
            criada_por=autor.id,
        )
    )
    db.add(EventoHistorico(evento_id=evento.id, tipo="criado", usuario_id=autor.id, versao=1))
    await db.commit()
    return evento


@pytest.mark.parametrize(
    "sql",
    [
        "UPDATE tb_evento_versao SET nm_evento = 'adulterado'",
        "DELETE FROM tb_evento_versao",
        "UPDATE tb_evento_historico SET tp_operacao = 'excluido'",
        "DELETE FROM tb_evento_historico",
    ],
)
async def test_banco_recusa_alterar_ou_apagar_auditoria_de_evento(db, auditoria, sql):
    with pytest.raises(DBAPIError, match="imutável"):
        await db.execute(text(sql))
    await db.rollback()


async def test_evento_continua_editavel(db, auditoria):
    await db.execute(text("UPDATE tb_evento SET nm_evento = 'Defesas remarcadas'"))
    await db.commit()


@pytest.mark.parametrize(
    "campos",
    [
        {"fim": INICIO},
        {"fim": INICIO - timedelta(minutes=1)},
        {"tipo": "festa"},
        {"titulo": "ab"},
    ],
    ids=["fim-igual-ao-inicio", "fim-antes-do-inicio", "tipo-fora-da-lista", "titulo-curto"],
)
async def test_banco_recusa_evento_incoerente(db, campos):
    autor = await criar_usuario(db, username="coord.agenda2", perfil="coordenacao")

    with pytest.raises(IntegrityError):
        await _evento(db, autor, **campos)
    await db.rollback()


@pytest.mark.parametrize(
    "campos",
    [
        {"dia_semana": 0},
        {"dia_semana": 8},
        {"inicio": time(20, 50), "fim": time(19, 10)},
        {"inicio": time(19, 10), "fim": time(19, 10)},
        {"disciplina": "B"},
    ],
    ids=["dia-0", "dia-8", "fim-antes", "fim-igual", "disciplina-curta"],
)
async def test_banco_recusa_horario_incoerente(db, campos):
    turma = await criar_turma(db)
    dados = {
        "dia_semana": 1,
        "inicio": time(19, 10),
        "fim": time(20, 50),
        "disciplina": "Banco de Dados II",
    } | campos
    db.add(Horario(turma_id=turma.id, **dados))

    with pytest.raises(IntegrityError):
        await db.commit()
    await db.rollback()


async def test_horario_sai_junto_com_a_turma(db):
    turma = await criar_turma(db)
    db.add(
        Horario(
            turma_id=turma.id,
            dia_semana=1,
            inicio=time(19, 10),
            fim=time(20, 50),
            disciplina="Banco de Dados II",
        )
    )
    await db.commit()

    await db.execute(text(f"DELETE FROM tb_turma WHERE id_turma = '{turma.id}'"))
    await db.commit()

    assert await db.scalar(text("SELECT count(*) FROM tb_horario")) == 0
