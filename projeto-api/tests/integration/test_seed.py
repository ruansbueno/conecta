"""Seed de desenvolvimento: usuários do mock com os quatro perfis (RF-03)."""

from datetime import UTC, datetime

import pytest
from sqlalchemy import func, select

from scripts.seed_dev_data import AVISOS_TESTE_TITULOS, PERFIS_TESTE, seed
from src.models.aviso import Aviso, AvisoDestino
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.providers.auth.mock import USUARIOS_DO_SEED
from tests.helpers import entrar, login

pytestmark = pytest.mark.mock_auth


async def _perfis(db) -> dict[str, str]:
    return dict((await db.execute(select(Usuario.username, Usuario.perfil))).all())


async def test_seed_cria_todos_os_usuarios_do_mock_com_seus_perfis(db):
    await seed(db)

    perfis = await _perfis(db)
    assert set(perfis) == set(USUARIOS_DO_SEED)
    # Os de primeiro login só existem depois de entrar (o aluno.novo2 é o do vídeo de demonstração).
    assert {"aluno.novo", "aluno.novo2", "servidor.novo"}.isdisjoint(perfis)
    assert perfis["admin.conecta"] == "administrador"
    assert perfis["admin.teste"] == "administrador"
    assert perfis["coord.teste"] == "coordenacao"
    assert perfis["docente.teste"] == "docente"
    assert perfis["servidor.aguardando"] is None  # pedido de acesso pendente
    assert perfis["aluno.teste"] == "aluno"
    assert set(perfis.values()) == {"administrador", "coordenacao", "docente", "aluno", None}


async def test_seed_e_idempotente_e_restaura_os_perfis(db):
    await seed(db)
    docente = await db.scalar(select(Usuario).where(Usuario.username == "docente.teste"))
    docente.perfil = "aluno"
    await db.commit()

    await seed(db)

    assert await _perfis(db) == PERFIS_TESTE


@pytest.mark.parametrize("decisao", ["liberado", "recusado"])
async def test_seed_de_novo_nao_reabre_o_pedido_de_acesso_ja_decidido(db, decisao):
    await seed(db)
    servidor = await db.scalar(select(Usuario).where(Usuario.username == "servidor.aguardando"))
    admin_id = await db.scalar(select(Usuario.id).where(Usuario.username == "admin.conecta"))
    servidor.situacao_acesso = decisao
    servidor.perfil = "docente" if decisao == "liberado" else None
    servidor.acesso_decidido_em = datetime.now(UTC)
    servidor.acesso_decidido_por_id = admin_id
    await db.commit()

    await seed(db)

    db.expire_all()
    servidor = await db.scalar(select(Usuario).where(Usuario.username == "servidor.aguardando"))
    assert servidor.situacao_acesso == decisao
    assert servidor.perfil == ("docente" if decisao == "liberado" else None)
    assert servidor.acesso_decidido_por_id == admin_id


async def test_login_apos_o_seed_usa_o_perfil_semeado(client, db):
    await seed(db)

    r = await login(client, "coord.teste")

    assert r.json()["usuario"]["perfil"] == "coordenacao"


async def _contar(db, modelo) -> int:
    return await db.scalar(select(func.count()).select_from(modelo))


async def test_seed_cria_turmas_vinculos_e_solicitacoes(db):
    await seed(db)

    turmas = {t.codigo: t for t in (await db.scalars(select(Turma))).all()}
    assert {t.semestre_curso for c, t in turmas.items() if c != "TADS-5A-2026-2"} == {3}
    assert turmas["TADS-5A-2026-2"].semestre_curso == 5
    assert len(turmas) == 4
    vinculos = (
        await db.execute(
            select(Usuario.username, Turma.codigo, VinculoTurma.papel)
            .join(Usuario, Usuario.id == VinculoTurma.usuario_id)
            .join(Turma, Turma.id == VinculoTurma.turma_id)
        )
    ).all()
    assert ("aluno.teste", "TADS-3A-2026-2", "aluno") in vinculos
    assert ("aluno3.teste", "TADS-3C-2026-2", "aluno") in vinculos
    assert ("docente.teste", "TADS-3A-2026-2", "docente") in vinculos
    assert not [v for v in vinculos if v[0] == "aluno.sem.turma"]
    pendentes = await db.scalar(
        select(func.count())
        .select_from(SolicitacaoInscricao)
        .where(SolicitacaoInscricao.status == "pendente")
    )
    assert pendentes == 1


async def test_seed_registra_quem_recusou_a_solicitacao(db):
    await seed(db)

    decisores = (
        await db.execute(
            select(SolicitacaoInscricao.status, Usuario.username)
            .join(Usuario, Usuario.id == SolicitacaoInscricao.decidida_por)
            .where(SolicitacaoInscricao.status != "pendente")
        )
    ).all()
    assert decisores == [("recusada", "coord.teste")]


async def test_seed_de_turmas_e_idempotente(db):
    await seed(db)
    contagens = [await _contar(db, m) for m in (Turma, VinculoTurma, SolicitacaoInscricao)]

    await seed(db)

    assert [await _contar(db, m) for m in (Turma, VinculoTurma, SolicitacaoInscricao)] == contagens


async def test_aluno_sem_turma_tem_turmas_disponiveis_apos_o_seed(client, db):
    await seed(db)
    headers, _ = await entrar(client, db, "aluno.sem.turma")

    r = await client.get("/turmas/disponiveis", headers=headers)

    assert r.json()["total"] >= 1


async def _titulos(client, db, username, situacao="ativo") -> set[str]:
    headers, _ = await entrar(client, db, username)
    r = await client.get(f"/avisos?situacao={situacao}&limit=100", headers=headers)
    return {a["titulo"] for a in r.json()["items"]}


async def test_seed_de_avisos_cobre_os_casos_de_visibilidade(client, db):
    await seed(db)
    t = AVISOS_TESTE_TITULOS

    assert await _titulos(client, db, "aluno.teste") == {
        t["todos"],
        t["tres_turmas"],
        t["semestre"],
    }
    assert await _titulos(client, db, "aluno.teste", "arquivado") == {t["arquivado"]}
    assert await _titulos(client, db, "aluno.sem.turma") == {t["todos"]}
    assert await _titulos(client, db, "docente.teste") == {
        t["todos"],
        t["tres_turmas"],
        t["semestre"],
        t["docentes"],
    }
    assert await _titulos(client, db, "coord.teste") == {t["todos"]}


async def test_seed_de_avisos_e_idempotente(db):
    await seed(db)
    contagens = [await _contar(db, m) for m in (Aviso, AvisoDestino)]

    await seed(db)

    assert [await _contar(db, m) for m in (Aviso, AvisoDestino)] == contagens
    assert contagens[0] == len(AVISOS_TESTE_TITULOS)


async def test_seed_de_avisos_tem_versoes_e_historico_coerentes(client, db):
    from src.models.aviso_evento import AvisoEvento
    from src.models.aviso_versao import AvisoVersao
    from tests.helpers import bearer

    await seed(db)
    await seed(db)  # idempotente também para a auditoria

    avisos = (await db.scalars(select(Aviso))).all()
    for aviso in avisos:
        versoes = await db.scalar(
            select(func.count()).select_from(AvisoVersao).where(AvisoVersao.aviso_id == aviso.id)
        )
        tipos = (
            await db.scalars(
                select(AvisoEvento.tipo)
                .where(AvisoEvento.aviso_id == aviso.id)
                .order_by(AvisoEvento.ocorrido_em)
            )
        ).all()
        assert versoes == aviso.versao_atual, aviso.titulo
        assert tipos[0] == "criado", aviso.titulo
    editado = next(a for a in avisos if a.versao_atual == 2)
    assert editado.editado_em is not None

    coord = await db.scalar(select(Usuario).where(Usuario.username == "coord.teste"))
    arquivado = next(a for a in avisos if a.situacao == "arquivado")
    historico = await client.get(f"/gestao/avisos/{arquivado.id}/historico", headers=bearer(coord))
    assert [e["tipo"] for e in historico.json()["items"]] == ["arquivado", "criado"]
