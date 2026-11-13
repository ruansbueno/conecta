"""Achados da revisão de código de 13/11/2026 (specs/003-revisao-de-codigo), cada um reproduzido
antes da correção."""

import asyncio
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta, timezone

import pytest
from sqlalchemy import event, select, text, update

from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.services.destinos import exigir_destinos_do_docente
from tests.contract.gestao.conftest import futuro
from tests.helpers import (
    bearer,
    criar_aviso,
    criar_evento,
    criar_solicitacao,
    criar_turma,
    criar_usuario,
    turma_destino,
    vincular,
)


@contextmanager
def contar_consultas(engine):
    """Comandos SQL enviados ao banco dentro do bloco."""
    comandos: list[str] = []

    def _ouvir(_conn, _cursor, comando, *_):
        comandos.append(comando)

    event.listen(engine.sync_engine, "before_cursor_execute", _ouvir)
    try:
        yield comandos
    finally:
        event.remove(engine.sync_engine, "before_cursor_execute", _ouvir)


async def _vira_docente_durante(session_factory, usuario_id, requisicao):
    """Outra transação muda o perfil para docente (como `PATCH /gestao/usuarios`, que trava a
    linha) e só confirma depois que `requisicao` está esperando por ela ou já terminou.

    Não depende de tempo: com a trava, a requisição aparece esperando um lock e o commit vem
    depois; sem ela, a requisição termina antes do commit com o perfil antigo, e o teste falha.
    """
    async with session_factory() as outra:
        await outra.execute(select(Usuario).where(Usuario.id == usuario_id).with_for_update())
        await outra.execute(
            update(Usuario).where(Usuario.id == usuario_id).values(perfil="docente")
        )
        tarefa = asyncio.create_task(requisicao())
        async with session_factory() as observador:
            while not tarefa.done() and not await _alguem_espera_lock(observador):
                await asyncio.sleep(0.02)
        await outra.commit()
    return await tarefa


async def _alguem_espera_lock(session) -> bool:
    esperando = await session.scalar(
        text(
            "SELECT count(*) FROM pg_stat_activity "
            "WHERE datname = current_database() AND wait_event_type = 'Lock'"
        )
    )
    await session.rollback()  # cada consulta vê o estado atual
    return esperando > 0


# --- 1. Corrida entre perfil e vínculo ----------------------------------------------------------


async def test_vincular_espera_a_mudanca_de_perfil_em_andamento(client, db, session_factory):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.rc")
    turma = await criar_turma(db)

    r = await _vira_docente_durante(
        session_factory,
        aluno.id,
        lambda: client.post(
            f"/gestao/turmas/{turma.id}/vinculos",
            headers=bearer(coord),
            json={"usuario_id": str(aluno.id), "papel": "aluno"},
        ),
    )

    assert (r.status_code, r.json()["code"]) == (409, "PERFIL_INCOMPATIVEL")
    assert await db.scalar(select(VinculoTurma).where(VinculoTurma.usuario_id == aluno.id)) is None


async def test_aprovar_solicitacao_espera_a_mudanca_de_perfil_em_andamento(
    client, db, session_factory
):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    aluno = await criar_usuario(db, username="a.rc")
    turma = await criar_turma(db)
    solicitacao = await criar_solicitacao(db, turma, aluno.id)

    r = await _vira_docente_durante(
        session_factory,
        aluno.id,
        lambda: client.post(
            f"/gestao/solicitacoes/{solicitacao.id}/aprovar", headers=bearer(coord)
        ),
    )

    assert (r.status_code, r.json()["code"]) == (409, "PERFIL_INCOMPATIVEL")
    assert await db.scalar(select(VinculoTurma).where(VinculoTurma.usuario_id == aluno.id)) is None


# --- 2. Aviso excluído: 404 também em arquivar e desarquivar (como nos eventos) ---------------


@pytest.mark.parametrize("acao", ["arquivar", "desarquivar"])
async def test_arquivar_ou_desarquivar_aviso_excluido_e_404(client, db, acao):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    aviso = await criar_aviso(db, coord, [{"tipo": "todos"}], situacao="excluido")

    r = await client.post(f"/gestao/avisos/{aviso.id}/{acao}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "AVISO_NAO_ENCONTRADO")


@pytest.mark.parametrize("acao", ["arquivar", "desarquivar"])
async def test_arquivar_ou_desarquivar_evento_excluido_e_404(client, db, acao):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    evento = await criar_evento(db, coord, [{"tipo": "todos"}], situacao="excluido")

    r = await client.post(f"/gestao/eventos/{evento.id}/{acao}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "EVENTO_NAO_ENCONTRADO")


# --- 3. Histórico do aviso com as datas em UTC, como no dos eventos -------------------------


async def test_historico_do_aviso_registra_o_reagendamento_em_utc(client, db):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    criado = await client.post(
        "/gestao/avisos",
        headers=bearer(coord),
        json={
            "titulo": "Agendado",
            "conteudo": "x",
            "destinos": [{"tipo": "todos"}],
            "publicar_em": futuro(24),
        },
    )
    quando = (datetime.now(UTC) + timedelta(days=2)).replace(microsecond=0)
    em_brasilia = quando.astimezone(timezone(timedelta(hours=-3))).isoformat()

    r = await client.patch(
        f"/gestao/avisos/{criado.json()['id']}",
        headers=bearer(coord),
        json={"publicar_em": em_brasilia},
    )
    assert r.status_code == 200, r.text
    historico = await client.get(
        f"/gestao/avisos/{criado.json()['id']}/historico", headers=bearer(coord)
    )

    editado = next(e for e in historico.json()["items"] if e["tipo"] == "editado")
    de, para = (
        editado["alteracoes"]["publicar_em"]["de"],
        editado["alteracoes"]["publicar_em"]["para"],
    )
    assert para == quando.isoformat()
    assert datetime.fromisoformat(de).utcoffset() == timedelta(0)


# --- 4. Reagendar aviso já publicado: o mesmo erro, como quer que tenha sido criado ---------


@pytest.mark.parametrize("valor", [None, "futuro"])
@pytest.mark.parametrize("agendado_antes", [False, True])
async def test_publicar_em_em_aviso_ja_publicado_e_sempre_o_mesmo_erro(
    client, db, valor, agendado_antes
):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    publicado = {"publicar_em": datetime.now(UTC) - timedelta(hours=1)} if agendado_antes else {}
    aviso = await criar_aviso(db, coord, [{"tipo": "todos"}], **publicado)

    r = await client.patch(
        f"/gestao/avisos/{aviso.id}",
        headers=bearer(coord),
        json={"publicar_em": futuro(24) if valor else None},
    )

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"] == [
        {"campo": "publicar_em", "mensagem": "aviso já publicado não pode ser reagendado"}
    ]


# --- 5. Busca: % e _ são texto, não curinga ---------------------------------------------------


async def test_busca_de_usuarios_trata_porcento_e_sublinhado_como_texto(client, db):
    admin = await criar_usuario(db, username="adm.rc", nome="Admin", perfil="administrador")
    await criar_usuario(db, username="ana_b", nome="Ana B")
    await criar_usuario(db, username="anaxb", nome="Ana X")

    r = await client.get("/gestao/usuarios?q=ana_b", headers=bearer(admin))

    assert [u["username"] for u in r.json()["items"]] == ["ana_b"]


async def test_busca_de_avisos_trata_porcento_como_texto(client, db):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    await criar_aviso(db, coord, [{"tipo": "todos"}], titulo="Desconto de 100% na taxa")
    await criar_aviso(db, coord, [{"tipo": "todos"}], titulo="1000 vagas no edital")

    r = await client.get("/gestao/avisos?q=100%25", headers=bearer(coord))

    assert [a["titulo"] for a in r.json()["items"]] == ["Desconto de 100% na taxa"]


async def test_busca_de_eventos_trata_porcento_como_texto(client, db):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    await criar_evento(db, coord, [{"tipo": "todos"}], titulo="Prova 100% online")
    await criar_evento(db, coord, [{"tipo": "todos"}], titulo="Prova 1000 questões")

    r = await client.get("/gestao/eventos?q=100%25", headers=bearer(coord))

    assert [e["titulo"] for e in r.json()["items"]] == ["Prova 100% online"]


async def test_busca_de_turmas_trata_sublinhado_como_texto(client, db):
    coord = await criar_usuario(db, username="c.rc", perfil="coordenacao")
    await criar_turma(db, nome="Turma_A")
    await criar_turma(db, nome="TurmaXA")

    r = await client.get("/gestao/turmas?q=turma_a", headers=bearer(coord))

    assert [t["nome"] for t in r.json()["items"]] == ["Turma_A"]


# --- Desempenho: destinos do docente numa consulta só -----------------------------------------


async def test_destinos_do_docente_sao_conferidos_numa_consulta_so(db, engine):
    docente = await criar_usuario(db, username="d.rc", perfil="docente")
    turmas = [await criar_turma(db) for _ in range(4)]
    for turma in turmas:
        await vincular(db, turma, docente.id, papel="docente")
    destinos = [_destino(t) for t in turmas]

    with contar_consultas(engine) as comandos:
        await exigir_destinos_do_docente(db, docente, destinos)

    assert len(comandos) == 1


def _destino(turma):
    from src.schemas.destino import DestinoIn

    return DestinoIn(**turma_destino(turma))


# --- Desempenho: pedidos de acesso sem uma consulta por decisor -------------------------------


async def _recusados(db, numeros):
    """Um pedido recusado por número, cada um decidido por um gestor diferente."""
    for i in numeros:
        gestor = await criar_usuario(
            db, username=f"g.rc{i}", nome=f"Gestor {i}", perfil="coordenacao"
        )
        await criar_usuario(
            db,
            username=f"s.rc{i}",
            nome=f"Servidor {i}",
            perfil=None,
            situacao_acesso="recusado",
            tipo_institucional="administrativo",
            acesso_decidido_em=datetime.now(UTC),
            acesso_decidido_por_id=gestor.id,
        )


async def test_lista_de_pedidos_nao_consulta_cada_decisor(client, db, engine):
    admin = await criar_usuario(db, username="adm.rc", perfil="administrador")
    await _recusados(db, [0])
    with contar_consultas(engine) as com_um:
        r = await client.get("/gestao/acessos?situacao=recusado", headers=bearer(admin))
    assert len(r.json()["items"]) == 1

    await _recusados(db, [1, 2, 3])
    with contar_consultas(engine) as com_quatro:
        r = await client.get("/gestao/acessos?situacao=recusado", headers=bearer(admin))
    assert len(r.json()["items"]) == 4

    assert len(com_quatro) == len(com_um)
    assert {i["decidido_por"]["nome"] for i in r.json()["items"]} == {
        "Gestor 0",
        "Gestor 1",
        "Gestor 2",
        "Gestor 3",
    }
