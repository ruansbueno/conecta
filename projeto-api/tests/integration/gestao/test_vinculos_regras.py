"""Regras de vínculo (RF-19; US5 cenários 3–4)."""

from sqlalchemy import select

from src.models.vinculo_turma import VinculoTurma
from tests.helpers import bearer, criar_aviso, criar_turma, criar_usuario, turma_destino, vincular


async def test_docente_vinculado_pela_coordenacao_passa_a_receber_avisos(client, db):
    coord = await criar_usuario(db, username="c.vr", perfil="coordenacao")
    docente = await criar_usuario(db, username="d.vr", perfil="docente")
    turma = await criar_turma(db)
    await criar_aviso(db, coord, [turma_destino(turma)], titulo="Aviso da turma")
    antes = await client.get("/avisos", headers=bearer(docente))

    await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(docente.id), "papel": "docente"},
    )
    depois = await client.get("/avisos", headers=bearer(docente))
    gestao = await client.get("/gestao/turmas", headers=bearer(docente))

    assert antes.json()["total"] == 0
    assert [a["titulo"] for a in depois.json()["items"]] == ["Aviso da turma"]
    assert [t["id"] for t in gestao.json()["items"]] == [str(turma.id)]


async def test_vinculo_por_gestao_registra_origem_e_autor(client, db):
    coord = await criar_usuario(db, username="c.vr", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.vr")
    turma = await criar_turma(db)

    await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(coord),
        json={"usuario_id": str(aluno.id), "papel": "aluno"},
    )

    vinculo = await db.scalar(select(VinculoTurma).where(VinculoTurma.usuario_id == aluno.id))
    assert (vinculo.origem, vinculo.criado_por) == ("gestao", coord.id)


async def test_docente_nao_vincula_nem_remove(client, db):
    docente = await criar_usuario(db, username="d.vr", perfil="docente")
    aluno = await criar_usuario(db, username="a.vr")
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="docente")
    await vincular(db, turma, aluno.id)

    post = await client.post(
        f"/gestao/turmas/{turma.id}/vinculos",
        headers=bearer(docente),
        json={"usuario_id": str(aluno.id), "papel": "aluno"},
    )
    delete = await client.delete(
        f"/gestao/turmas/{turma.id}/vinculos/{aluno.id}", headers=bearer(docente)
    )

    assert (post.status_code, post.json()["code"]) == (403, "SEM_PERMISSAO")
    assert delete.status_code == 403


async def test_remover_vinculo_corta_o_acesso_aos_avisos_na_hora(client, db):
    coord = await criar_usuario(db, username="c.vr", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.vr")
    turma = await criar_turma(db)
    await vincular(db, turma, aluno.id)
    await criar_aviso(db, coord, [turma_destino(turma)])

    await client.delete(f"/gestao/turmas/{turma.id}/vinculos/{aluno.id}", headers=bearer(coord))

    assert (await client.get("/avisos", headers=bearer(aluno))).json()["total"] == 0


async def test_vincular_aluno_libera_patch_de_perfil_so_apos_remover(client, db):
    admin = await criar_usuario(db, username="adm.vr", perfil="administrador")
    aluno = await criar_usuario(db, username="a.vr")
    turma = await criar_turma(db)
    await vincular(db, turma, aluno.id)

    bloqueado = await client.patch(
        f"/gestao/usuarios/{aluno.id}", headers=bearer(admin), json={"perfil": "docente"}
    )
    await client.delete(f"/gestao/turmas/{turma.id}/vinculos/{aluno.id}", headers=bearer(admin))
    liberado = await client.patch(
        f"/gestao/usuarios/{aluno.id}", headers=bearer(admin), json={"perfil": "docente"}
    )

    assert bloqueado.json()["code"] == "PERFIL_INCOMPATIVEL"
    assert liberado.status_code == 200
