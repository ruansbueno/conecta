"""Achados da revisão final da E2, cada um reproduzido antes da correção."""

import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select, text, update

from scripts.seed_dev_data import _aviso_id, seed
from src.models.aviso import Aviso
from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from src.models.usuario import Usuario
from src.repositories.turma_repository import TurmaRepository
from src.repositories.usuario_repository import UsuarioRepository
from tests.contract.gestao.conftest import futuro
from tests.helpers import bearer, criar_solicitacao, criar_turma, criar_usuario, vincular


async def _aviso(client, autor, **campos):
    corpo = {"titulo": "Aviso revisão", "conteudo": "x", "destinos": [{"tipo": "todos"}], **campos}
    r = await client.post("/gestao/avisos", headers=bearer(autor), json=corpo)
    assert r.status_code == 201, r.text
    return r.json()


# --- Importante 1: seed sobre um banco semeado na E1 ----------------------------------------


async def test_seed_sobre_banco_da_e1_mantem_versao_atual_coerente(client, db):
    await seed(db)
    # Simula o banco da E1: avisos sem auditoria e o "semestre" ainda na versão 1.
    await db.execute(text("TRUNCATE tb_aviso_historico, tb_aviso_versao"))
    semestre = _aviso_id("semestre")
    await db.execute(
        update(Aviso).where(Aviso.id == semestre).values(versao_atual=1, editado_em=None)
    )
    await db.commit()

    await seed(db)

    aviso = await db.scalar(
        select(Aviso).where(Aviso.id == semestre).execution_options(populate_existing=True)
    )
    versoes = await db.scalar(
        select(func.count()).select_from(AvisoVersao).where(AvisoVersao.aviso_id == semestre)
    )
    assert aviso.versao_atual == versoes
    coord = await db.scalar(select(Usuario).where(Usuario.username == "coord.teste"))
    r = await client.patch(
        f"/gestao/avisos/{semestre}",
        headers=bearer(coord),
        json={"conteudo": "Edição depois do seed."},
    )
    assert r.status_code == 200, r.text


# --- Importante 2: publicar já um agendado -----------------------------------------------------


async def test_publicar_ja_um_agendado_usa_a_hora_da_publicacao(client, db):
    coord = await criar_usuario(db, username="c.rv", perfil="coordenacao")
    aviso = await _aviso(client, coord, publicar_em=futuro())
    await db.execute(
        update(Aviso)
        .where(Aviso.id == aviso["id"])
        .values(criado_em=datetime.now(UTC) - timedelta(days=3))
    )
    await db.commit()

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"publicar_em": None}
    )

    publicado = datetime.fromisoformat(r.json()["publicado_em"])
    assert abs(datetime.now(UTC) - publicado) < timedelta(minutes=1)


# --- Importante 3: docente sem a turma não edita nem desarquiva ------------------------------


async def test_docente_que_deixou_a_turma_nao_edita_nem_desarquiva(client, db):
    docente = await criar_usuario(db, username="d.rv", perfil="docente")
    coord = await criar_usuario(db, username="c.rv", perfil="coordenacao")
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="docente")
    aviso = await _aviso(client, docente, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}])
    arquivado = await _aviso(
        client, docente, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}]
    )
    await client.post(f"/gestao/avisos/{arquivado['id']}/arquivar", headers=bearer(docente))
    await client.delete(f"/gestao/turmas/{turma.id}/vinculos/{docente.id}", headers=bearer(coord))

    patch = await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(docente),
        json={"conteudo": "Mudado sem a turma."},
    )
    desarquivar = await client.post(
        f"/gestao/avisos/{arquivado['id']}/desarquivar", headers=bearer(docente)
    )

    assert (patch.status_code, patch.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")
    assert (desarquivar.status_code, desarquivar.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")


async def test_docente_nao_edita_aviso_seu_ampliado_pela_gestao_para_todos(client, db):
    docente = await criar_usuario(db, username="d.rv", perfil="docente")
    coord = await criar_usuario(db, username="c.rv", perfil="coordenacao")
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="docente")
    aviso = await _aviso(client, docente, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}])
    await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(coord),
        json={"destinos": [{"tipo": "todos"}]},
    )

    r = await client.patch(
        f"/gestao/avisos/{aviso['id']}",
        headers=bearer(docente),
        json={"conteudo": "Agora vai para todos?"},
    )

    assert (r.status_code, r.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")


# --- Importante (re-graduado) 4: corrida entre aprovar e vincular -----------------------------


async def test_vinculo_criado_entre_a_checagem_e_a_aprovacao_vira_auto_recusa(
    client, db, monkeypatch
):
    coord = await criar_usuario(db, username="c.rv", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.rv")
    turma = await criar_turma(db)
    solicitacao = await criar_solicitacao(db, turma, aluno.id)
    await vincular(db, turma, aluno.id, origem="gestao")

    async def nao_ve_o_vinculo(*_):  # a checagem rodou antes do vínculo concorrente
        return False

    monkeypatch.setattr(TurmaRepository, "is_vinculado", nao_ve_o_vinculo)
    r = await client.post(f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (409, "JA_VINCULADO")


# --- Importante (re-graduado) 5: ordem do histórico --------------------------------------------


async def test_evento_registra_a_mesma_hora_aplicada_ao_aviso(client, db):
    coord = await criar_usuario(db, username="c.rv", perfil="coordenacao")
    aviso = await _aviso(client, coord)

    editado = (
        await client.patch(
            f"/gestao/avisos/{aviso['id']}", headers=bearer(coord), json={"titulo": "Título novo"}
        )
    ).json()
    arquivado = (
        await client.post(f"/gestao/avisos/{aviso['id']}/arquivar", headers=bearer(coord))
    ).json()

    eventos = dict((await db.execute(select(AvisoEvento.tipo, AvisoEvento.ocorrido_em))).all())
    assert eventos["editado"] == datetime.fromisoformat(editado["editado_em"])
    assert eventos["arquivado"] == datetime.fromisoformat(arquivado["arquivado_em"])


async def test_escritas_concorrentes_geram_versoes_sem_lacunas_e_historico_em_ordem(client, db):
    coord = await criar_usuario(db, username="c.rv", perfil="coordenacao")
    aviso = await _aviso(client, coord)

    respostas = await asyncio.gather(
        *[
            client.patch(
                f"/gestao/avisos/{aviso['id']}",
                headers=bearer(coord),
                json={"titulo": f"Título concorrente {i}"},
            )
            for i in range(6)
        ]
    )

    assert all(r.status_code == 200 for r in respostas)
    versoes = (await db.scalars(select(AvisoVersao.versao).order_by(AvisoVersao.versao))).all()
    assert versoes == list(range(1, 8))
    eventos = (
        (
            await db.execute(
                select(AvisoEvento.versao)
                .where(AvisoEvento.tipo == "editado")
                .order_by(AvisoEvento.ocorrido_em)
            )
        )
        .scalars()
        .all()
    )
    assert eventos == list(range(2, 8))  # ordem do histórico = ordem em que foram aplicadas


# --- Importante (re-graduado) 6: dado desatualizado no PATCH de si próprio ----------------------


async def test_get_for_update_recarrega_o_usuario_ja_carregado(db, session_factory):
    alvo = await criar_usuario(db, username="adm.rv", perfil="administrador")
    async with session_factory() as outra:
        await outra.execute(update(Usuario).where(Usuario.id == alvo.id).values(nome="Nome novo"))
        await outra.commit()

    recarregado = await UsuarioRepository(db).get_for_update(alvo.id)

    assert recarregado.nome == "Nome novo"


async def test_dois_administradores_rebaixando_um_ao_outro_deixa_um_ativo(client, db):
    a = await criar_usuario(db, username="adm.a", perfil="administrador")
    b = await criar_usuario(db, username="adm.b", perfil="administrador")

    respostas = await asyncio.gather(
        client.patch(f"/gestao/usuarios/{b.id}", headers=bearer(a), json={"perfil": "coordenacao"}),
        client.patch(f"/gestao/usuarios/{a.id}", headers=bearer(b), json={"perfil": "coordenacao"}),
    )

    assert sorted(r.status_code for r in respostas) == [200, 422]
    admins = await db.scalar(
        select(func.count())
        .select_from(Usuario)
        .where(Usuario.perfil == "administrador", Usuario.ativo)
    )
    assert admins == 1
