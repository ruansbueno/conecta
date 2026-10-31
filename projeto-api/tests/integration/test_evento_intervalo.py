"""O tempo na consulta da agenda (contracts E3 §1; plan D-E3-3, D-E3-4; RF-38; SC-E3-002).

A janela [de, ate) pega todo evento que a toca, não só os que começam nela (D-E3-3, emenda).
"""

from datetime import UTC, datetime, timedelta

import pytest

from tests.helpers import TODOS, bearer, criar_evento, criar_usuario

AGORA = datetime.now(UTC)


@pytest.fixture
async def pessoas(db):
    coord = await criar_usuario(db, username="coord.tempo", perfil="coordenacao")
    aluno = await criar_usuario(db, username="aluno.tempo")
    return coord, aluno


async def _ids(client, aluno, query="") -> list[str]:
    r = await client.get(f"/eventos?limit=100&{query}", headers=bearer(aluno))
    assert r.status_code == 200, r.text
    return [e["id"] for e in r.json()["items"]]


def _q(**datas) -> str:
    return "&".join(f"{k}={v.isoformat().replace('+00:00', 'Z')}" for k, v in datas.items())


async def test_sem_filtro_traz_os_proximos_e_os_em_andamento(client, db, pessoas):
    coord, aluno = pessoas
    passado = await criar_evento(db, coord, [TODOS], inicio=AGORA - timedelta(days=2))
    andamento = await criar_evento(
        db, coord, [TODOS], inicio=AGORA - timedelta(hours=1), fim=AGORA + timedelta(hours=1)
    )
    proximo = await criar_evento(db, coord, [TODOS], inicio=AGORA + timedelta(days=1))

    ids = await _ids(client, aluno)

    assert ids == [str(andamento.id), str(proximo.id)]
    assert str(passado.id) not in ids


async def test_evento_sem_fim_encerra_no_inicio(client, db, pessoas):
    coord, aluno = pessoas
    pontual = await criar_evento(db, coord, [TODOS], inicio=AGORA - timedelta(minutes=1))

    assert str(pontual.id) not in await _ids(client, aluno)
    assert str(pontual.id) in await _ids(client, aluno, "incluir_encerrados=true")


async def test_janela_semiaberta_pega_o_que_a_toca(client, db, pessoas):
    coord, aluno = pessoas
    de, ate = datetime(2030, 3, 1, 3, tzinfo=UTC), datetime(2030, 4, 1, 3, tzinfo=UTC)
    no_comeco = await criar_evento(db, coord, [TODOS], inicio=de)
    antes = await criar_evento(db, coord, [TODOS], inicio=de - timedelta(seconds=1))
    no_fim = await criar_evento(db, coord, [TODOS], inicio=ate)
    dentro = await criar_evento(db, coord, [TODOS], inicio=ate - timedelta(seconds=1))
    # Começa antes e termina dentro: toca a janela.
    cruza = await criar_evento(
        db, coord, [TODOS], inicio=de - timedelta(hours=1), fim=de + timedelta(hours=1)
    )
    # Termina exatamente quando a janela começa: não a toca.
    encosta = await criar_evento(db, coord, [TODOS], inicio=de - timedelta(hours=1), fim=de)

    ids = await _ids(client, aluno, _q(de=de, ate=ate))

    assert ids == [str(cruza.id), str(no_comeco.id), str(dentro.id)]
    assert {str(antes.id), str(no_fim.id), str(encosta.id)}.isdisjoint(ids)


async def test_evento_de_varios_dias_aparece_em_cada_dia_que_cobre(client, db, pessoas):
    coord, aluno = pessoas
    segunda = datetime(2030, 9, 2, 11, tzinfo=UTC)
    semana = await criar_evento(
        db, coord, [TODOS], inicio=segunda, fim=segunda + timedelta(days=2, hours=10)
    )

    for dia in range(3):
        de = datetime(2030, 9, 2 + dia, 3, tzinfo=UTC)
        assert await _ids(client, aluno, _q(de=de, ate=de + timedelta(days=1))) == [str(semana.id)]
    quinta = datetime(2030, 9, 5, 3, tzinfo=UTC)
    assert await _ids(client, aluno, _q(de=quinta, ate=quinta + timedelta(days=1))) == []


async def test_evento_que_cruza_a_virada_do_mes_aparece_nos_dois(client, db, pessoas):
    coord, aluno = pessoas
    inicio = datetime(2030, 10, 30, 12, tzinfo=UTC)
    evento = await criar_evento(db, coord, [TODOS], inicio=inicio, fim=inicio + timedelta(days=3))
    outubro, novembro, dezembro = (datetime(2030, m, 1, 3, tzinfo=UTC) for m in (10, 11, 12))

    assert await _ids(client, aluno, _q(de=outubro, ate=novembro)) == [str(evento.id)]
    assert await _ids(client, aluno, _q(de=novembro, ate=dezembro)) == [str(evento.id)]


async def test_so_de_ou_so_ate(client, db, pessoas):
    coord, aluno = pessoas
    corte = datetime(2030, 6, 1, tzinfo=UTC)
    cedo = await criar_evento(db, coord, [TODOS], inicio=corte - timedelta(days=1))
    tarde = await criar_evento(db, coord, [TODOS], inicio=corte + timedelta(days=1))

    assert await _ids(client, aluno, _q(de=corte)) == [str(tarde.id)]
    assert await _ids(client, aluno, _q(ate=corte)) == [str(cedo.id)]


async def test_janela_com_encerrados_numa_chamada(client, db, pessoas):
    # A visão de mês do app marca também os dias que já passaram (SC-E3-002).
    coord, aluno = pessoas
    agora = datetime.now(UTC)
    de, ate = agora - timedelta(days=15), agora + timedelta(days=15)
    passado = await criar_evento(db, coord, [TODOS], inicio=agora - timedelta(days=1))
    futuro = await criar_evento(db, coord, [TODOS], inicio=agora + timedelta(days=1))

    sem = await _ids(client, aluno, _q(de=de, ate=ate))
    com = await _ids(client, aluno, _q(de=de, ate=ate) + "&incluir_encerrados=true")

    assert sem == [str(futuro.id)]
    assert com == [str(passado.id), str(futuro.id)]


async def test_evento_que_cruza_a_meia_noite(client, db, pessoas):
    coord, aluno = pessoas
    inicio = datetime(2030, 7, 10, 22, tzinfo=UTC)
    evento = await criar_evento(db, coord, [TODOS], inicio=inicio, fim=inicio + timedelta(hours=4))

    ids = await _ids(
        client,
        aluno,
        _q(de=datetime(2030, 7, 10, tzinfo=UTC), ate=datetime(2030, 7, 11, tzinfo=UTC)),
    )

    assert ids == [str(evento.id)]


async def test_arquivados_trazem_os_encerrados_sem_pedir(client, db, pessoas):
    coord, aluno = pessoas
    velho = await criar_evento(
        db, coord, [TODOS], inicio=AGORA - timedelta(days=30), situacao="arquivado"
    )

    assert await _ids(client, aluno, "situacao=arquivado") == [str(velho.id)]
