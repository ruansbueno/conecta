"""Docente publica e gere só os próprios avisos, para as suas turmas (US6 cenários 2 e 6)."""

import pytest

from tests.helpers import bearer, criar_turma, criar_usuario, vincular


@pytest.fixture
async def docente_e_turmas(db):
    docente = await criar_usuario(db, username="d.dest", perfil="docente")
    minha, alheia = await criar_turma(db), await criar_turma(db)
    await vincular(db, minha, docente.id, papel="docente")
    return docente, minha, alheia


@pytest.mark.parametrize(
    "destino",
    [{"tipo": "todos"}, {"tipo": "semestre", "semestre": 3}, {"tipo": "docentes"}, "alheia"],
)
async def test_docente_so_publica_para_turma_em_que_leciona(client, docente_e_turmas, destino):
    docente, minha, alheia = docente_e_turmas
    if destino == "alheia":
        destino = {"tipo": "turma", "turma_id": str(alheia.id)}
    corpo = {"titulo": "Do docente", "conteudo": "x"}

    nao = await client.post(
        "/gestao/avisos", headers=bearer(docente), json={**corpo, "destinos": [destino]}
    )
    ok = await client.post(
        "/gestao/avisos",
        headers=bearer(docente),
        json={**corpo, "destinos": [{"tipo": "turma", "turma_id": str(minha.id)}]},
    )

    assert (nao.status_code, nao.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")
    assert ok.status_code == 201


async def test_docente_nao_edita_nem_arquiva_aviso_alheio(client, db, docente_e_turmas):
    docente, minha, _ = docente_e_turmas
    coord = await criar_usuario(db, username="c.dest", perfil="coordenacao")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={
                "titulo": "Da coordenação",
                "conteudo": "x",
                "destinos": [{"tipo": "turma", "turma_id": str(minha.id)}],
            },
        )
    ).json()

    patch = await client.patch(
        f"/gestao/avisos/{aviso['id']}", headers=bearer(docente), json={"titulo": "Mudado"}
    )
    arquivar = await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(docente))
    excluir = await client.delete(f"/gestao/avisos/{aviso['id']}", headers=bearer(docente))

    assert all(r.status_code == 403 for r in (patch, arquivar, excluir))
    assert patch.json()["code"] == "SEM_PERMISSAO"


async def test_docente_nao_amplia_destinos_ao_editar(client, docente_e_turmas):
    docente, minha, _ = docente_e_turmas
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(docente),
            json={
                "titulo": "Do docente",
                "conteudo": "x",
                "destinos": [{"tipo": "turma", "turma_id": str(minha.id)}],
            },
        )
    ).json()

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(docente),
        json={"destinos": [{"tipo": "todos"}]},
    )

    assert (r.status_code, r.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")


async def test_coordenacao_edita_aviso_do_docente(client, db, docente_e_turmas):
    docente, minha, _ = docente_e_turmas
    coord = await criar_usuario(db, username="c.dest", perfil="coordenacao")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(docente),
            json={
                "titulo": "Do docente",
                "conteudo": "x",
                "destinos": [{"tipo": "turma", "turma_id": str(minha.id)}],
            },
        )
    ).json()

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={"destinos": [{"tipo": "todos"}]},
    )

    assert r.status_code == 200
