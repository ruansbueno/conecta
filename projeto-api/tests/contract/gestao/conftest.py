from datetime import UTC, datetime, timedelta

import pytest

from tests.helpers import bearer, criar_turma, criar_usuario


@pytest.fixture
async def coord(db):
    return await criar_usuario(
        db, username="coord.av", nome="Maria Coordenadora", perfil="coordenacao"
    )


@pytest.fixture
async def turmas(db):
    return [await criar_turma(db, codigo=f"TADS-3{c}", nome=f"TADS 3º Sem {c}") for c in "ABC"]


def futuro(horas=24) -> str:
    return (datetime.now(UTC) + timedelta(hours=horas)).isoformat()


@pytest.fixture
def publicar(client):
    async def _publicar(autor, **campos):
        corpo = {
            "titulo": "Aviso de gestão",
            "conteudo": "Conteúdo do aviso.",
            "destinos": [{"tipo": "todos"}],
            **campos,
        }
        r = await client.post("/gestao/avisos", headers=bearer(autor), json=corpo)
        assert r.status_code == 201, r.text
        return r.json()

    return _publicar


@pytest.fixture
def cadastrar(client):
    """Cria um evento pela API (POST /gestao/eventos) e devolve o corpo da resposta."""

    async def _cadastrar(autor, **campos):
        corpo = {
            "titulo": "Evento de gestão",
            "tipo": "palestra",
            "inicio": futuro(),
            "destinos": [{"tipo": "todos"}],
            **campos,
        }
        r = await client.post("/gestao/eventos", headers=bearer(autor), json=corpo)
        assert r.status_code == 201, r.text
        return r.json()

    return _cadastrar
