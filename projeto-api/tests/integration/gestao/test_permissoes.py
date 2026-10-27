"""Regra base da gestão: o docente age só nas turmas em que leciona (spec §2.3)."""

from src.services.permissoes import leciona, turmas_que_leciona
from tests.helpers import criar_turma, criar_usuario, vincular


async def test_docente_leciona_nas_turmas_em_que_tem_vinculo_de_docente(db):
    docente = await criar_usuario(db, username="d.perm", perfil="docente")
    aluno = await criar_usuario(db, username="a.perm")
    turma_a = await criar_turma(db)
    turma_b = await criar_turma(db)
    await vincular(db, turma_a, docente.id, papel="docente")
    await vincular(db, turma_b, aluno.id)

    assert await leciona(db, docente, turma_a.id)
    assert not await leciona(db, docente, turma_b.id)
    assert not await leciona(db, aluno, turma_b.id)  # vínculo de aluno não é lecionar
    assert await turmas_que_leciona(db, docente) == {turma_a.id}


async def test_coordenacao_nao_leciona_mesmo_sem_vinculo(db):
    coord = await criar_usuario(db, username="c.perm", perfil="coordenacao")

    assert await turmas_que_leciona(db, coord) == set()
