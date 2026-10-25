"""Regras de visibilidade dos avisos (data-model.md; RF-21, RF-22, RF-23)."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import delete, update

from src.models.turma import Turma
from src.models.vinculo_turma import VinculoTurma
from tests.helpers import (
    DOCENTES,
    TODOS,
    bearer,
    criar_aviso,
    criar_turma,
    criar_usuario,
    semestre_destino,
    turma_destino,
    vincular,
)

AGORA = datetime.now(UTC)


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
        ("admin", "administrador"),
    ]:
        c[username] = await criar_usuario(db, username=username, nome=username, perfil=perfil)
    for username, turmas in [
        ("aluno.1", "A"),
        ("aluno.2", "AB"),
        ("aluno.3", "ABC"),
        ("aluno.d", "D"),
    ]:
        for t in turmas:
            await vincular(db, c[t], c[username].id)
    await vincular(db, c["D"], c["docente"].id, papel="docente")
    return c


async def _ids(client, usuario, situacao="ativo") -> list[str]:
    r = await client.get(f"/avisos?situacao={situacao}&limit=100", headers=bearer(usuario))
    assert r.status_code == 200
    return [a["id"] for a in r.json()["items"]]


async def _ve(client, usuario, aviso) -> bool:
    return str(aviso.id) in await _ids(client, usuario)


async def test_aviso_para_todos_alcanca_qualquer_usuario(client, db, cenario):
    aviso = await criar_aviso(db, cenario["coord"], [TODOS])

    for username in ["aluno.1", "aluno.sem.turma", "docente", "coord", "admin"]:
        assert await _ve(client, cenario[username], aviso), username


@pytest.mark.parametrize("username", ["aluno.1", "aluno.2", "aluno.3"])
async def test_aviso_para_tres_turmas_aparece_uma_unica_vez(client, db, cenario, username):
    aviso = await criar_aviso(db, cenario["coord"], [turma_destino(cenario[t]) for t in "ABC"])

    ids = await _ids(client, cenario[username])

    assert ids.count(str(aviso.id)) == 1


async def test_aviso_para_tres_turmas_nao_alcanca_quem_esta_so_na_d(client, db, cenario):
    aviso = await criar_aviso(db, cenario["coord"], [turma_destino(cenario[t]) for t in "ABC"])

    assert not await _ve(client, cenario["aluno.d"], aviso)
    assert not await _ve(client, cenario["aluno.sem.turma"], aviso)


async def test_aviso_que_alcanca_por_varios_destinos_nao_duplica(client, db, cenario):
    aviso = await criar_aviso(
        db, cenario["coord"], [TODOS, turma_destino(cenario["A"]), semestre_destino(3)]
    )

    r = await client.get("/avisos", headers=bearer(cenario["aluno.3"]))

    assert [a["id"] for a in r.json()["items"]] == [str(aviso.id)]
    assert r.json()["total"] == 1


async def test_docente_da_turma_recebe_aviso_da_turma(client, db, cenario):
    aviso = await criar_aviso(db, cenario["coord"], [turma_destino(cenario["D"])])

    assert await _ve(client, cenario["docente"], aviso)


async def test_aviso_por_semestre_alcanca_vinculados_em_turma_daquele_semestre(client, db, cenario):
    aviso = await criar_aviso(db, cenario["coord"], [semestre_destino(3)])

    assert await _ve(client, cenario["aluno.1"], aviso)
    assert not await _ve(client, cenario["aluno.d"], aviso)
    assert not await _ve(client, cenario["docente"], aviso)


async def test_aviso_para_docentes_alcanca_so_perfil_docente(client, db, cenario):
    aviso = await criar_aviso(db, cenario["coord"], [DOCENTES])

    assert await _ve(client, cenario["docente"], aviso)
    for username in ["aluno.1", "coord", "admin"]:
        assert not await _ve(client, cenario[username], aviso), username


async def test_coordenacao_e_administracao_veem_so_avisos_para_todos(client, db, cenario):
    todos = await criar_aviso(db, cenario["coord"], [TODOS])
    await criar_aviso(db, cenario["coord"], [turma_destino(cenario["A"])])
    await criar_aviso(db, cenario["coord"], [semestre_destino(3)])
    await criar_aviso(db, cenario["coord"], [DOCENTES])

    for username in ["coord", "admin"]:
        assert await _ids(client, cenario[username]) == [str(todos.id)]


async def test_aviso_agendado_fica_oculto_ate_a_data(client, db, cenario):
    futuro = await criar_aviso(
        db, cenario["coord"], [TODOS], publicar_em=AGORA + timedelta(hours=1)
    )
    chegou = await criar_aviso(
        db, cenario["coord"], [TODOS], publicar_em=AGORA - timedelta(minutes=1)
    )

    ids = await _ids(client, cenario["aluno.1"])
    por_id = await client.get(f"/avisos/{futuro.id}", headers=bearer(cenario["aluno.1"]))

    assert str(futuro.id) not in ids
    assert str(chegou.id) in ids
    assert por_id.status_code == 404


async def test_aviso_arquivado_so_aparece_na_lista_de_arquivados(client, db, cenario):
    aviso = await criar_aviso(
        db,
        cenario["coord"],
        [turma_destino(cenario["A"])],
        situacao="arquivado",
        arquivado_em=AGORA,
    )
    usuario = cenario["aluno.1"]

    assert str(aviso.id) not in await _ids(client, usuario)
    assert await _ids(client, usuario, "arquivado") == [str(aviso.id)]
    assert await _ids(client, cenario["aluno.d"], "arquivado") == []
    por_id = await client.get(f"/avisos/{aviso.id}", headers=bearer(usuario))
    assert (por_id.status_code, por_id.json()["situacao"]) == (200, "arquivado")


async def test_aviso_excluido_nunca_aparece(client, db, cenario):
    aviso = await criar_aviso(db, cenario["coord"], [TODOS], situacao="excluido", excluido_em=AGORA)
    usuario = cenario["aluno.1"]

    assert str(aviso.id) not in await _ids(client, usuario)
    assert str(aviso.id) not in await _ids(client, usuario, "arquivado")
    assert (await client.get(f"/avisos/{aviso.id}", headers=bearer(usuario))).status_code == 404


async def test_turma_desativada_suspende_avisos_por_turma_e_semestre(client, db, cenario):
    por_turma = await criar_aviso(db, cenario["coord"], [turma_destino(cenario["D"])])
    por_semestre = await criar_aviso(db, cenario["coord"], [semestre_destino(5)])
    assert await _ve(client, cenario["aluno.d"], por_turma)
    assert await _ve(client, cenario["aluno.d"], por_semestre)

    await db.execute(update(Turma).where(Turma.id == cenario["D"].id).values(ativa=False))
    await db.commit()

    assert await _ids(client, cenario["aluno.d"]) == []
    por_id = await client.get(f"/avisos/{por_turma.id}", headers=bearer(cenario["aluno.d"]))
    assert por_id.status_code == 404


async def test_vinculo_removido_corta_o_acesso(client, db, cenario):
    aviso = await criar_aviso(db, cenario["coord"], [turma_destino(cenario["A"])])
    assert await _ve(client, cenario["aluno.1"], aviso)

    await db.execute(delete(VinculoTurma).where(VinculoTurma.usuario_id == cenario["aluno.1"].id))
    await db.commit()

    assert not await _ve(client, cenario["aluno.1"], aviso)
