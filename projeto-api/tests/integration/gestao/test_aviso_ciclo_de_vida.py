"""Efeito do ciclo de vida para quem recebe (spec §3.4; US6 cenários 1, 3, 4, 5; D-E2-6)."""

from datetime import UTC, datetime, timedelta

from tests.contract.gestao.conftest import futuro
from tests.helpers import bearer, criar_turma, criar_usuario, vincular


async def _titulos(client, usuario, situacao="ativo"):
    r = await client.get(f"/avisos?situacao={situacao}", headers=bearer(usuario))
    return [a["titulo"] for a in r.json()["items"]]


async def test_publicado_para_tres_turmas_chega_so_a_elas(client, db):
    coord = await criar_usuario(db, username="c.cv", perfil="coordenacao")
    turmas = [await criar_turma(db) for _ in range(4)]
    alunos = []
    for i, t in enumerate(turmas):
        aluno = await criar_usuario(db, username=f"a{i}.cv")
        await vincular(db, t, aluno.id)
        alunos.append(aluno)

    await client.post(
        "/gestao/avisos",
        headers=bearer(coord),
        json={
            "titulo": "Para A, B e C",
            "conteudo": "x",
            "destinos": [{"tipo": "turma", "turma_id": str(t.id)} for t in turmas[:3]],
        },
    )

    for aluno in alunos[:3]:
        assert await _titulos(client, aluno) == ["Para A, B e C"]
    assert await _titulos(client, alunos[3]) == []


async def test_edicao_que_remove_destino_tira_o_aviso_de_quem_saiu(client, db):
    coord = await criar_usuario(db, username="c.cv", perfil="coordenacao")
    a, b = await criar_turma(db), await criar_turma(db)
    aluno_a, aluno_b = (
        await criar_usuario(db, username="aa"),
        await criar_usuario(db, username="ab"),
    )
    await vincular(db, a, aluno_a.id)
    await vincular(db, b, aluno_b.id)
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={
                "titulo": "Aviso",
                "conteudo": "x",
                "destinos": [{"tipo": "turma", "turma_id": str(t.id)} for t in (a, b)],
            },
        )
    ).json()

    await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={"destinos": [{"tipo": "turma", "turma_id": str(a.id)}]},
    )

    item = (await client.get("/avisos", headers=bearer(aluno_a))).json()["items"][0]
    assert item["editado_em"] is not None
    assert await _titulos(client, aluno_b) == []


async def test_arquivar_e_desarquivar_tiram_e_devolvem_a_lista_ativa(client, db):
    coord = await criar_usuario(db, username="c.cv", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.cv")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={"titulo": "Ciclo", "conteudo": "x", "destinos": [{"tipo": "todos"}]},
        )
    ).json()

    await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(coord))
    arquivado = (await _titulos(client, aluno), await _titulos(client, aluno, "arquivado"))
    await client.post(f"/gestao/avisos/{aviso['id']}/desarquivar", headers=bearer(coord))

    assert arquivado == ([], ["Ciclo"])
    assert await _titulos(client, aluno) == ["Ciclo"]


async def test_agendado_aparece_em_agendados_e_nao_chega_antes_da_hora(client, db):
    coord = await criar_usuario(db, username="c.cv", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.cv")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={
                "titulo": "Futuro",
                "conteudo": "x",
                "publicar_em": futuro(),
                "destinos": [{"tipo": "todos"}],
            },
        )
    ).json()

    agendados = await client.get("/gestao/avisos?situacao=agendado", headers=bearer(coord))
    ativos = await client.get("/gestao/avisos?situacao=ativo", headers=bearer(coord))

    assert [i["id"] for i in agendados.json()["items"]] == [aviso["id"]]
    assert ativos.json()["total"] == 0
    assert await _titulos(client, aluno) == []


async def test_reagendar_e_publicar_ja_um_agendado(client, db):
    coord = await criar_usuario(db, username="c.cv", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.cv")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={
                "titulo": "Futuro",
                "conteudo": "x",
                "publicar_em": futuro(),
                "destinos": [{"tipo": "todos"}],
            },
        )
    ).json()

    reagendado = await client.patch(
        f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"publicar_em": futuro(48)}
    )
    agora = await client.patch(
        f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"publicar_em": None}
    )

    assert reagendado.status_code == 200
    assert agora.status_code == 200 and agora.json()["publicar_em"] is None
    assert await _titulos(client, aluno) == ["Futuro"]


async def test_aviso_ja_publicado_nao_volta_a_ser_agendado(client, db):
    coord = await criar_usuario(db, username="c.cv", perfil="coordenacao")
    aviso = (
        await client.post(
            "/gestao/avisos",
            headers=bearer(coord),
            json={"titulo": "Publicado", "conteudo": "x", "destinos": [{"tipo": "todos"}]},
        )
    ).json()

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"publicar_em": futuro()}
    )
    passado = await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={"publicar_em": (datetime.now(UTC) - timedelta(hours=1)).isoformat()},
    )

    assert (r.status_code, r.json()["errors"][0]["campo"]) == (422, "publicar_em")
    assert passado.status_code == 422
