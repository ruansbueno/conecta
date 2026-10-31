"""Atores e turmas dos testes de ponta a ponta: logins reais pelo provedor simulado."""

import pytest

from src.models.usuario import Usuario
from src.providers.auth.factory import get_auth_provider
from src.providers.auth.mock_moodle import MockMoodleAuthProvider

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
