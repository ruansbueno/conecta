"""Ponta a ponta da spec §9.3 (RF-30, SC-007): publicar pela gestão → receber no app.

Só pelos endpoints, com logins pelo provedor simulado. Atalho no banco: apenas o administrador
inicial (é a massa de implantação, como o admin.conecta do seed).
"""

import pytest

from src.models.usuario import Usuario
from src.providers.auth.factory import get_auth_provider
from src.providers.auth.mock_moodle import MockMoodleAuthProvider

pytestmark = pytest.mark.mock_auth

MASSA = {
    "adm": "Administração",
    "c1": "Coordenação Um",
    "d1": "Docente Um",
    "a1": "Aluno Um",
    "a2": "Aluno Dois",
    "a3": "Aluno Três",
    "a4": "Aluno Quatro",
    "a5": "Aluno Cinco",
}


class Ator:
    def __init__(self, client, token, usuario_id):
        self.client, self.token, self.id = client, token, usuario_id

    def _h(self):
        return {"Authorization": f"Bearer {self.token}"}

    async def get(self, rota):
        return await self.client.get(rota, headers=self._h())

    async def post(self, rota, json=None):
        return await self.client.post(rota, headers=self._h(), json=json)

    async def patch(self, rota, json):
        return await self.client.patch(rota, headers=self._h(), json=json)

    async def delete(self, rota):
        return await self.client.delete(rota, headers=self._h())

    async def titulos(self, situacao="ativo"):
        r = await self.get(f"/avisos?situacao={situacao}")
        return [a["titulo"] for a in r.json()["items"]]


@pytest.fixture
async def atores(app, client, db):
    app.dependency_overrides[get_auth_provider] = lambda: MockMoodleAuthProvider(MASSA)
    db.add(Usuario(username="adm", nome=MASSA["adm"], perfil="administrador"))
    await db.commit()

    atores = {}
    for username in MASSA:
        r = await client.post("/auth/login", json={"username": username, "password": "senha-teste"})
        assert r.status_code == 200, r.text
        atores[username] = Ator(client, r.json()["access_token"], r.json()["usuario"]["id"])
    adm = atores["adm"]
    for username, perfil in [("c1", "coordenacao"), ("d1", "docente")]:
        r = await adm.patch(f"/gestao/usuarios/{atores[username].id}", {"perfil": perfil})
        assert r.status_code == 200, r.text
    return atores


@pytest.fixture
async def turmas(atores):
    c1 = atores["c1"]
    turmas = {}
    for nome, semestre in [("A", 3), ("B", 3), ("C", 3), ("D", 5)]:
        r = await c1.post(
            "/gestao/turmas",
            {
                "codigo": f"TADS-{nome}",
                "nome": f"Turma {nome}",
                "semestre_curso": semestre,
                "periodo_letivo": "2026/2",
                "inscricoes_abertas": True,
            },
        )
        assert r.status_code == 201, r.text
        turmas[nome] = r.json()["id"]
    for usuario, turma, papel in [
        ("a1", "A", "aluno"),
        ("a2", "B", "aluno"),
        ("a3", "C", "aluno"),
        ("a4", "D", "aluno"),
        ("d1", "A", "docente"),
    ]:
        r = await c1.post(
            f"/gestao/turmas/{turmas[turma]}/vinculos",
            {"usuario_id": atores[usuario].id, "papel": papel},
        )
        assert r.status_code == 201, r.text
    return turmas


async def test_fluxo_completo_da_spec_9_3(atores, turmas):
    a = atores
    c1, d1 = a["c1"], a["d1"]

    # 1. c1 publica para as turmas A, B e C.
    r = await c1.post(
        "/gestao/avisos",
        {
            "titulo": "Visita técnica",
            "conteudo": "Saída às 8h.",
            "destinos": [{"tipo": "turma", "turma_id": turmas[t]} for t in "ABC"],
        },
    )
    assert r.status_code == 201
    aviso = r.json()["id"]

    # 2. a1, a2, a3 e d1 recebem (uma vez); a4 e a5 não.
    for quem in ("a1", "a2", "a3", "d1"):
        assert await a[quem].titulos() == ["Visita técnica"], quem
    for quem in ("a4", "a5"):
        assert await a[quem].titulos() == [], quem

    # 3. c1 edita o conteúdo e remove C: a1 e a2 veem editado_em; a3 deixa de ver.
    r = await c1.patch(
        f"/gestao/avisos/{aviso}",
        {
            "conteudo": "Saída às 9h.",
            "destinos": [{"tipo": "turma", "turma_id": turmas[t]} for t in "AB"],
        },
    )
    assert r.status_code == 200
    for quem in ("a1", "a2"):
        item = (await a[quem].get("/avisos")).json()["items"][0]
        assert item["editado_em"] is not None and item["conteudo"] == "Saída às 9h."
    assert await a["a3"].titulos() == []

    # 4. c1 arquiva: sai da lista ativa de a1 e aparece nos arquivados.
    assert (await c1.post(f"/gestao/avisos/{aviso}/arquivar")).status_code == 200
    assert await a["a1"].titulos() == []
    assert await a["a1"].titulos("arquivado") == ["Visita técnica"]

    # 5. c1 consulta 2 versões e o histórico criado → editado → arquivado, com usuário e data.
    versoes = (await c1.get(f"/gestao/avisos/{aviso}/versoes")).json()
    historico = (await c1.get(f"/gestao/avisos/{aviso}/historico")).json()
    assert versoes["total"] == 2
    assert [e["tipo"] for e in historico["items"]] == ["arquivado", "editado", "criado"]
    assert all(e["usuario"]["id"] == c1.id and e["ocorrido_em"] for e in historico["items"])

    # 6. c1 exclui: some de todas as listas; por id, o aluno recebe 404.
    assert (await c1.delete(f"/gestao/avisos/{aviso}")).status_code == 204
    assert await a["a1"].titulos("arquivado") == []
    assert (await a["a1"].get(f"/avisos/{aviso}")).status_code == 404

    # 7. d1 não publica para todos (403); para a turma A, sim (201).
    todos = await d1.post(
        "/gestao/avisos", {"titulo": "Para todos", "conteudo": "x", "destinos": [{"tipo": "todos"}]}
    )
    assert (todos.status_code, todos.json()["code"]) == (403, "DESTINO_NAO_PERMITIDO")
    turma_a = await d1.post(
        "/gestao/avisos",
        {
            "titulo": "Prova de Redes",
            "conteudo": "Sexta.",
            "destinos": [{"tipo": "turma", "turma_id": turmas["A"]}],
        },
    )
    assert turma_a.status_code == 201

    # 8. a5 pede a turma A; d1 aprova; a5 passa a ver os avisos da turma A.
    pedido = await a["a5"].post(f"/turmas/{turmas['A']}/solicitacoes")
    assert (pedido.status_code, pedido.json()["status"]) == (201, "pendente")
    assert await a["a5"].titulos() == []
    aprovada = await d1.post(f"/gestao/solicitacoes/{pedido.json()['id']}/aprovar")
    assert (aprovada.status_code, aprovada.json()["status"]) == (200, "aprovada")
    assert await a["a5"].titulos() == ["Prova de Redes"]
