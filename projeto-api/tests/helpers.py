import uuid
from datetime import UTC, datetime
from http.cookies import SimpleCookie

from sqlalchemy import update

from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma


async def criar_usuario(db, **campos) -> Usuario:
    usuario = Usuario(
        username=campos.pop("username", "fulano.teste"),
        nome=campos.pop("nome", "Fulano"),
        **campos,
    )
    db.add(usuario)
    await db.commit()
    return usuario


def set_cookies(response) -> dict:
    """Cookies do cabeçalho Set-Cookie, com atributos (morsels) por nome."""
    cookies = {}
    for header in response.headers.get_list("set-cookie"):
        jar = SimpleCookie()
        jar.load(header)
        cookies.update(jar)
    return cookies


async def login(client, username="aluno.teste", password="senha-teste"):
    return await client.post("/auth/login", json={"username": username, "password": password})


_contador_turma = 0


async def criar_turma(db, **campos):
    global _contador_turma
    _contador_turma += 1
    campos.setdefault("codigo", f"TADS-T{_contador_turma:03d}-2026-2")
    campos.setdefault("nome", f"Turma {_contador_turma}")
    campos.setdefault("semestre_curso", 3)
    campos.setdefault("periodo_letivo", "2026/2")
    campos.setdefault("inscricoes_abertas", True)
    turma = Turma(**campos)
    db.add(turma)
    await db.commit()
    return turma


async def vincular(db, turma, usuario_id, papel="aluno", origem="seed"):
    vinculo = VinculoTurma(turma_id=turma.id, usuario_id=usuario_id, papel=papel, origem=origem)
    db.add(vinculo)
    await db.commit()
    return vinculo


async def criar_solicitacao(db, turma, aluno_id, status="pendente", **campos):
    if status != "pendente":
        campos.setdefault("decidida_em", datetime.now(UTC))
    solicitacao = SolicitacaoInscricao(
        turma_id=turma.id, aluno_id=aluno_id, status=status, **campos
    )
    db.add(solicitacao)
    await db.commit()
    return solicitacao


async def entrar(client, db, username="aluno.teste", perfil=None):
    """Login pelo mock; opcionalmente fixa o perfil no banco. Devolve (headers Bearer, id)."""
    body = (await login(client, username)).json()
    usuario_id = uuid.UUID(body["usuario"]["id"])
    if perfil is not None:
        await db.execute(update(Usuario).where(Usuario.id == usuario_id).values(perfil=perfil))
        await db.commit()
    return {"Authorization": f"Bearer {body['access_token']}"}, usuario_id
