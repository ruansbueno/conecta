"""Contrato do ciclo de vida do evento (contracts E3 §7, §8; RF-39, RF-40; plan D-E3-6, D-E3-8)."""

import uuid

import pytest
from sqlalchemy import delete

from src.models.vinculo_turma import VinculoTurma
from tests.helpers import bearer, criar_turma, criar_usuario, vincular

INICIO, FIM = "2030-04-10T19:00:00Z", "2030-04-10T21:00:00Z"


async def test_editar_cria_versao_e_marca_editado(client, coord, cadastrar):
    evento = await cadastrar(coord, inicio=INICIO, fim=FIM, local="Sala 203")

    r = await client.patch(
        f"/gestao/eventos/{evento['id']}",
        headers=bearer(coord),
        json={"inicio": "2030-04-11T19:00:00Z", "fim": "2030-04-11T21:00:00Z", "local": "Lab 4"},
    )

    assert r.status_code == 200
    body = r.json()
    assert (body["versao_atual"], body["local"]) == (2, "Lab 4")
    assert body["inicio"] == "2030-04-11T19:00:00Z"
    assert body["editado_em"] is not None


async def test_fim_e_conferido_com_o_inicio_resultante(client, coord, cadastrar):
    evento = await cadastrar(coord, inicio=INICIO, fim=FIM)

    r = await client.patch(
        f"/gestao/eventos/{evento['id']}",
        headers=bearer(coord),
        json={"inicio": "2030-04-10T22:00:00Z"},
    )

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == "fim"


async def test_fim_nulo_torna_o_evento_pontual(client, coord, cadastrar):
    evento = await cadastrar(coord, inicio=INICIO, fim=FIM)

    r = await client.patch(
        f"/gestao/eventos/{evento['id']}", headers=bearer(coord), json={"fim": None}
    )

    assert (r.status_code, r.json()["fim"]) == (200, None)


async def test_editar_sem_mudanca_e_422(client, coord, cadastrar):
    evento = await cadastrar(coord, titulo="Mesmo título", inicio=INICIO)

    r = await client.patch(
        f"/gestao/eventos/{evento['id']}",
        headers=bearer(coord),
        json={"titulo": "Mesmo título", "inicio": "2030-04-10T16:00:00-03:00"},
    )

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0] == {"campo": "body", "mensagem": "nenhuma alteração"}


@pytest.mark.parametrize(
    "corpo",
    [
        {},
        {"titulo": "ab"},
        {"titulo": None},
        {"inicio": None},
        {"tipo": "festa"},
        {"destinos": []},
        {"cor": 1},
        {"local": ""},
    ],
    ids=[
        "vazio",
        "titulo-curto",
        "titulo-nulo",
        "inicio-nulo",
        "tipo",
        "sem-destino",
        "desconhecido",
        "local-vazio",
    ],
)
async def test_patch_invalido_e_422(client, coord, cadastrar, corpo):
    evento = await cadastrar(coord)

    r = await client.patch(f"/gestao/eventos/{evento['id']}", headers=bearer(coord), json=corpo)

    assert r.status_code == 422


@pytest.mark.parametrize("acao", ["arquivar", "excluir"])
async def test_editar_arquivado_ou_excluido_e_409(client, coord, cadastrar, acao):
    evento = await cadastrar(coord)
    if acao == "arquivar":
        await client.post(f"/gestao/eventos/{evento['id']}/arquivar", headers=bearer(coord))
    else:
        await client.delete(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))

    r = await client.patch(
        f"/gestao/eventos/{evento['id']}", headers=bearer(coord), json={"titulo": "Novo título"}
    )

    assert (r.status_code, r.json()["code"]) == (409, "EVENTO_NAO_EDITAVEL")


async def test_arquivar_e_desarquivar(client, coord, cadastrar):
    evento = await cadastrar(coord)
    url = f"/gestao/eventos/{evento['id']}"

    arquivado = await client.post(f"{url}/arquivar", headers=bearer(coord))
    de_novo = await client.post(f"{url}/arquivar", headers=bearer(coord))
    ativo = await client.post(f"{url}/desarquivar", headers=bearer(coord))
    outra_vez = await client.post(f"{url}/desarquivar", headers=bearer(coord))

    assert (arquivado.status_code, arquivado.json()["situacao"]) == (200, "arquivado")
    assert arquivado.json()["arquivado_em"] is not None
    assert (de_novo.status_code, de_novo.json()["code"]) == (409, "EVENTO_SITUACAO_INVALIDA")
    assert (ativo.status_code, ativo.json()["situacao"], ativo.json()["arquivado_em"]) == (
        200,
        "ativo",
        None,
    )
    assert (outra_vez.status_code, outra_vez.json()["code"]) == (409, "EVENTO_SITUACAO_INVALIDA")


async def test_excluir_some_da_agenda_e_da_gestao(client, db, coord, cadastrar):
    aluno = await criar_usuario(db, username="aluno.exc")
    evento = await cadastrar(coord)

    r = await client.delete(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))
    de_novo = await client.delete(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))

    assert (r.status_code, r.content) == (204, b"")
    assert (de_novo.status_code, de_novo.json()["code"]) == (404, "EVENTO_NAO_ENCONTRADO")
    assert (await client.get("/eventos", headers=bearer(aluno))).json()["total"] == 0
    assert (await client.get("/gestao/eventos", headers=bearer(coord))).json()["total"] == 0


@pytest.mark.parametrize(
    ("metodo", "sufixo"),
    [("PATCH", ""), ("POST", "/arquivar"), ("POST", "/desarquivar"), ("DELETE", "")],
)
async def test_evento_inexistente_e_404(client, coord, metodo, sufixo):
    corpo = {"titulo": "Novo título"} if metodo == "PATCH" else None

    r = await client.request(
        metodo, f"/gestao/eventos/{uuid.uuid4()}{sufixo}", headers=bearer(coord), json=corpo
    )

    assert (r.status_code, r.json()["code"]) == (404, "EVENTO_NAO_ENCONTRADO")


@pytest.mark.parametrize(
    ("metodo", "sufixo"),
    [("PATCH", ""), ("POST", "/arquivar"), ("DELETE", "")],
)
async def test_docente_nao_mexe_em_evento_alheio(client, db, coord, cadastrar, metodo, sufixo):
    docente = await criar_usuario(db, username="docente.alheio", perfil="docente")
    evento = await cadastrar(coord)
    corpo = {"titulo": "Novo título"} if metodo == "PATCH" else None

    r = await client.request(
        metodo, f"/gestao/eventos/{evento['id']}{sufixo}", headers=bearer(docente), json=corpo
    )

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.fixture
async def docente_desvinculado(db, client, cadastrar):
    """Docente que criou um evento para a turma e depois deixou de lecionar nela."""
    docente = await criar_usuario(db, username="docente.saiu", perfil="docente")
    turma = await criar_turma(db)
    await vincular(db, turma, docente.id, papel="docente")
    evento = await cadastrar(docente, destinos=[{"tipo": "turma", "turma_id": str(turma.id)}])
    await db.execute(delete(VinculoTurma).where(VinculoTurma.usuario_id == docente.id))
    await db.commit()
    return docente, evento


async def test_docente_que_deixou_a_turma_nao_edita_sem_trocar_destinos(
    client, docente_desvinculado
):
    docente, evento = docente_desvinculado

    r = await client.patch(
        f"/gestao/eventos/{evento['id']}", headers=bearer(docente), json={"titulo": "Remarcado"}
    )

    assert (r.status_code, r.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")


async def test_docente_que_deixou_a_turma_nao_desarquiva(client, docente_desvinculado):
    docente, evento = docente_desvinculado
    url = f"/gestao/eventos/{evento['id']}"
    await client.post(f"{url}/arquivar", headers=bearer(docente))

    r = await client.post(f"{url}/desarquivar", headers=bearer(docente))

    assert (r.status_code, r.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")


async def test_excluir_evento_arquivado(client, coord, cadastrar):
    evento = await cadastrar(coord)
    await client.post(f"/gestao/eventos/{evento['id']}/arquivar", headers=bearer(coord))

    r = await client.delete(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))

    assert r.status_code == 204


async def test_docente_nao_desarquiva_evento_alheio(client, db, coord, cadastrar):
    docente = await criar_usuario(db, username="docente.desarq", perfil="docente")
    evento = await cadastrar(coord)
    await client.post(f"/gestao/eventos/{evento['id']}/arquivar", headers=bearer(coord))

    r = await client.post(f"/gestao/eventos/{evento['id']}/desarquivar", headers=bearer(docente))

    assert (r.status_code, r.json()["code"]) == (403, "SEM_PERMISSAO")


@pytest.mark.parametrize("acao", ["arquivar", "desarquivar"])
async def test_arquivar_ou_desarquivar_excluido_e_404(client, coord, cadastrar, acao):
    # Diferente do aviso (409): excluído não existe mais para a gestão (contracts E3 §8).
    evento = await cadastrar(coord)
    await client.delete(f"/gestao/eventos/{evento['id']}", headers=bearer(coord))

    r = await client.post(f"/gestao/eventos/{evento['id']}/{acao}", headers=bearer(coord))

    assert (r.status_code, r.json()["code"]) == (404, "EVENTO_NAO_ENCONTRADO")
