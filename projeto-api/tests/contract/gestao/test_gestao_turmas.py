"""Contrato de /gestao/turmas (contracts/api.md §11; RF-18)."""

import uuid

import pytest

from tests.helpers import bearer, criar_turma, criar_usuario, vincular

NOVA = {
    "codigo": "TADS-3A-2026-2",
    "nome": "TADS 3º Semestre A",
    "semestre_curso": 3,
    "periodo_letivo": "2026/2",
    "inscricoes_abertas": True,
}
CAMPOS = {
    "id",
    "codigo",
    "nome",
    "semestre_curso",
    "periodo_letivo",
    "inscricoes_abertas",
    "ativa",
    "criado_em",
    "atualizado_em",
    "total_alunos",
    "total_docentes",
}


@pytest.fixture
async def coord(db):
    return await criar_usuario(db, username="coord.t", perfil="coordenacao")


# --- POST ----------------------------------------------------------------------------------


async def test_cria_turma_completa(client, coord):
    r = await client.post("/gestao/turmas", headers=bearer(coord), json=NOVA)

    assert r.status_code == 201
    body = r.json()
    assert set(body) == CAMPOS
    assert {k: body[k] for k in NOVA} == NOVA
    assert (body["ativa"], body["total_alunos"], body["total_docentes"]) == (True, 0, 0)
    assert body["criado_em"].endswith("Z")


async def test_inscricoes_fechadas_por_padrao(client, coord):
    corpo = {k: v for k, v in NOVA.items() if k != "inscricoes_abertas"}

    r = await client.post("/gestao/turmas", headers=bearer(coord), json=corpo)

    assert r.json()["inscricoes_abertas"] is False


async def test_codigo_duplicado_e_409(client, db, coord):
    await criar_turma(db, codigo=NOVA["codigo"])

    r = await client.post("/gestao/turmas", headers=bearer(coord), json=NOVA)

    assert (r.status_code, r.json()["code"]) == (409, "CODIGO_TURMA_DUPLICADO")


@pytest.mark.parametrize(
    ("campo", "valor"),
    [
        ("codigo", ""),
        ("codigo", "X" * 41),
        ("nome", "AB"),
        ("nome", "N" * 121),
        ("semestre_curso", 0),
        ("semestre_curso", 13),
        ("periodo_letivo", "2026-2"),
        ("periodo_letivo", "2026/3"),
        ("periodo_letivo", "26/1"),
        ("inscricoes_abertas", "sim"),
    ],
)
async def test_campo_invalido_e_422(client, coord, campo, valor):
    r = await client.post("/gestao/turmas", headers=bearer(coord), json={**NOVA, campo: valor})

    assert (r.status_code, r.json()["code"]) == (422, "VALIDATION_ERROR")
    assert r.json()["errors"][0]["campo"] == campo


@pytest.mark.parametrize("ausente", ["codigo", "nome", "semestre_curso", "periodo_letivo"])
async def test_campo_obrigatorio_ausente_e_422(client, coord, ausente):
    corpo = {k: v for k, v in NOVA.items() if k != ausente}

    r = await client.post("/gestao/turmas", headers=bearer(coord), json=corpo)

    assert r.json()["errors"][0]["campo"] == ausente


# --- GET lista e detalhe -------------------------------------------------------------------


async def test_lista_com_totais_por_papel(client, db, coord):
    turma = await criar_turma(db, codigo="T-1")
    for i in range(2):
        aluno = await criar_usuario(db, username=f"a{i}")
        await vincular(db, turma, aluno.id)
    docente = await criar_usuario(db, username="d", perfil="docente")
    await vincular(db, turma, docente.id, papel="docente")

    r = await client.get("/gestao/turmas", headers=bearer(coord))

    item = r.json()["items"][0]
    assert set(item) == CAMPOS
    assert (item["total_alunos"], item["total_docentes"]) == (2, 1)


async def test_filtros_da_lista(client, db, coord):
    await criar_turma(db, codigo="TADS-3A", nome="Terceiro A", semestre_curso=3)
    await criar_turma(
        db, codigo="TADS-5A", nome="Quinto A", semestre_curso=5, periodo_letivo="2026/1"
    )
    await criar_turma(db, codigo="TADS-3X", nome="Antiga", ativa=False)

    async def codigos(query):
        r = await client.get(f"/gestao/turmas?{query}", headers=bearer(coord))
        return [t["codigo"] for t in r.json()["items"]]

    assert await codigos("ativa=true") == ["TADS-3A", "TADS-5A"]
    assert await codigos("ativa=false") == ["TADS-3X"]
    assert await codigos("semestre_curso=5") == ["TADS-5A"]
    assert await codigos("periodo_letivo=2026/1") == ["TADS-5A"]
    assert await codigos("q=quinto") == ["TADS-5A"]
    assert await codigos("q=tads-3") == ["TADS-3A", "TADS-3X"]


async def test_detalhe_e_404(client, db, coord):
    turma = await criar_turma(db)

    ok = await client.get(f"/gestao/turmas/{turma.id}", headers=bearer(coord))
    nao = await client.get(f"/gestao/turmas/{uuid.uuid4()}", headers=bearer(coord))

    assert ok.status_code == 200 and set(ok.json()) == CAMPOS
    assert (nao.status_code, nao.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


# --- PATCH e DELETE ------------------------------------------------------------------------


async def test_patch_parcial_inclusive_ativa(client, db, coord):
    turma = await criar_turma(db, inscricoes_abertas=False)

    r = await client.patch(
        f"/gestao/turmas/{turma.id}",
        headers=bearer(coord),
        json={"inscricoes_abertas": True, "nome": "Novo nome"},
    )
    r2 = await client.patch(
        f"/gestao/turmas/{turma.id}", headers=bearer(coord), json={"ativa": False}
    )

    assert r.status_code == 200
    assert (r.json()["inscricoes_abertas"], r.json()["nome"]) == (True, "Novo nome")
    assert r2.json()["ativa"] is False


async def test_patch_com_codigo_de_outra_turma_e_409(client, db, coord):
    await criar_turma(db, codigo="OCUPADO")
    turma = await criar_turma(db)

    r = await client.patch(
        f"/gestao/turmas/{turma.id}", headers=bearer(coord), json={"codigo": "OCUPADO"}
    )

    assert (r.status_code, r.json()["code"]) == (409, "CODIGO_TURMA_DUPLICADO")


@pytest.mark.parametrize("corpo", [{}, {"semestre_curso": 20}, {"nome": None}, {"x": 1}])
async def test_patch_invalido_e_422(client, db, coord, corpo):
    turma = await criar_turma(db)

    r = await client.patch(f"/gestao/turmas/{turma.id}", headers=bearer(coord), json=corpo)

    assert r.status_code == 422


async def test_patch_e_delete_de_inexistente_sao_404(client, coord):
    rid = uuid.uuid4()

    p = await client.patch(f"/gestao/turmas/{rid}", headers=bearer(coord), json={"nome": "Nome"})
    d = await client.delete(f"/gestao/turmas/{rid}", headers=bearer(coord))

    assert (p.status_code, p.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")
    assert (d.status_code, d.json()["code"]) == (404, "TURMA_NAO_ENCONTRADA")


async def test_delete_desativa_logicamente(client, db, coord):
    turma = await criar_turma(db)

    r = await client.delete(f"/gestao/turmas/{turma.id}", headers=bearer(coord))
    depois = await client.get(f"/gestao/turmas/{turma.id}", headers=bearer(coord))

    assert r.status_code == 204
    assert depois.json()["ativa"] is False


async def test_administrador_tambem_gere_turmas(client, db):
    admin = await criar_usuario(db, username="adm.t", perfil="administrador")

    r = await client.post("/gestao/turmas", headers=bearer(admin), json=NOVA)

    assert r.status_code == 201
