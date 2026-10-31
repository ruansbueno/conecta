"""Quem cada evento alcança: a mesma regra dos avisos (spec E3 §2.1; RF-37; SC-E3-001)."""

import pytest
from sqlalchemy import update

from src.models.turma import Turma
from tests.helpers import (
    DOCENTES,
    TODOS,
    bearer,
    criar_evento,
    criar_turma,
    criar_usuario,
    semestre_destino,
    turma_destino,
    vincular,
)


@pytest.fixture
async def cenario(db):
    """Turmas A, B, C (3º semestre) e D (5º), com alunos em 1, 2 e 3 delas."""
    c = {}
    for codigo, semestre in [("A", 3), ("B", 3), ("C", 3), ("D", 5)]:
        c[codigo] = await criar_turma(db, codigo=codigo, semestre_curso=semestre)
    for username, perfil in [
        ("aluno.1", "aluno"),
        ("aluno.2", "aluno"),
        ("aluno.3", "aluno"),
        ("aluno.d", "aluno"),
        ("aluno.sem.turma", "aluno"),
        ("docente", "docente"),
        ("coord", "coordenacao"),
    ]:
        c[username] = await criar_usuario(db, username=username, nome=username, perfil=perfil)
    for username, turmas in [("aluno.1", "A"), ("aluno.2", "AB"), ("aluno.3", "ABC")]:
        for t in turmas:
            await vincular(db, c[t], c[username].id)
    await vincular(db, c["D"], c["aluno.d"].id)
    await vincular(db, c["D"], c["docente"].id, papel="docente")
    return c


async def _ids(client, usuario, situacao="ativo") -> list[str]:
    r = await client.get(f"/eventos?situacao={situacao}&limit=100", headers=bearer(usuario))
    assert r.status_code == 200
    return [e["id"] for e in r.json()["items"]]


async def test_evento_para_todos_alcanca_qualquer_usuario(client, db, cenario):
    evento = await criar_evento(db, cenario["coord"], [TODOS])

    for username in ("aluno.1", "aluno.sem.turma", "docente", "coord"):
        assert str(evento.id) in await _ids(client, cenario[username])


async def test_evento_em_tres_turmas_aparece_uma_vez_e_so_para_elas(client, db, cenario):
    evento = await criar_evento(db, cenario["coord"], [turma_destino(cenario[t]) for t in "ABC"])

    assert (await _ids(client, cenario["aluno.3"])).count(str(evento.id)) == 1
    assert (await _ids(client, cenario["aluno.2"])).count(str(evento.id)) == 1
    assert str(evento.id) not in await _ids(client, cenario["aluno.d"])
    assert str(evento.id) not in await _ids(client, cenario["aluno.sem.turma"])


async def test_destinos_que_coincidem_nao_duplicam(client, db, cenario):
    evento = await criar_evento(
        db, cenario["coord"], [TODOS, turma_destino(cenario["A"]), semestre_destino(3)]
    )

    assert (await _ids(client, cenario["aluno.1"])).count(str(evento.id)) == 1


async def test_semestre_alcanca_vinculados_em_turma_daquele_semestre(client, db, cenario):
    evento = await criar_evento(db, cenario["coord"], [semestre_destino(5)])

    assert str(evento.id) in await _ids(client, cenario["aluno.d"])
    assert str(evento.id) in await _ids(client, cenario["docente"])
    assert str(evento.id) not in await _ids(client, cenario["aluno.1"])


async def test_docentes_alcanca_so_perfil_docente(client, db, cenario):
    evento = await criar_evento(db, cenario["coord"], [DOCENTES])

    assert str(evento.id) in await _ids(client, cenario["docente"])
    assert str(evento.id) not in await _ids(client, cenario["aluno.1"])
    assert str(evento.id) not in await _ids(client, cenario["coord"])


async def test_arquivado_so_na_lista_de_arquivados(client, db, cenario):
    evento = await criar_evento(db, cenario["coord"], [TODOS], situacao="arquivado")

    assert str(evento.id) not in await _ids(client, cenario["aluno.1"])
    assert str(evento.id) in await _ids(client, cenario["aluno.1"], "arquivado")


async def test_arquivado_fora_do_alcance_nao_aparece_entre_os_arquivados(client, db, cenario):
    evento = await criar_evento(
        db, cenario["coord"], [turma_destino(cenario["D"])], situacao="arquivado"
    )

    assert str(evento.id) not in await _ids(client, cenario["aluno.1"], "arquivado")


async def test_excluido_nunca_aparece(client, db, cenario):
    evento = await criar_evento(db, cenario["coord"], [TODOS], situacao="excluido")

    assert str(evento.id) not in await _ids(client, cenario["aluno.1"])
    assert str(evento.id) not in await _ids(client, cenario["aluno.1"], "arquivado")


async def test_turma_desativada_suspende_eventos_por_turma_e_semestre(client, db, cenario):
    por_turma = await criar_evento(db, cenario["coord"], [turma_destino(cenario["D"])])
    por_semestre = await criar_evento(db, cenario["coord"], [semestre_destino(5)])
    await db.execute(update(Turma).where(Turma.id == cenario["D"].id).values(ativa=False))
    await db.commit()

    vistos = await _ids(client, cenario["aluno.d"])

    assert str(por_turma.id) not in vistos
    assert str(por_semestre.id) not in vistos
