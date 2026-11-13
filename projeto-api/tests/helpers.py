import uuid
from datetime import UTC, datetime, time, timedelta
from http.cookies import SimpleCookie

from sqlalchemy import select, update

from src.api.deps.csrf import gerar_csrf
from src.core.security import create_access_token
from src.models.aviso import Aviso, AvisoDestino
from src.models.evento import Evento, EventoDestino
from src.models.horario import Horario
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


def cookies_web(sessao: str) -> dict:
    """Cookies de uma sessão web fabricada no teste, com o CSRF assinado para ela (RF-33)."""
    return {"__Host-conecta_sessao": sessao, "__Host-conecta_csrf": gerar_csrf(sessao)}


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
    """Decidida sem `decidida_por`: cancelada pelo próprio aluno; aprovada ou recusada por uma
    coordenação criada aqui, `decisor.padrao` (o banco exige o decisor fora de pendente). Quem
    contar usuários de coordenação precisa lembrar dela."""
    if status != "pendente":
        campos.setdefault("decidida_em", datetime.now(UTC))
        if "decidida_por" not in campos:
            campos["decidida_por"] = (
                aluno_id if status == "cancelada" else (await _decisor_padrao(db)).id
            )
    solicitacao = SolicitacaoInscricao(
        turma_id=turma.id, aluno_id=aluno_id, status=status, **campos
    )
    db.add(solicitacao)
    await db.commit()
    return solicitacao


async def _decisor_padrao(db) -> Usuario:
    existente = await db.scalar(select(Usuario).where(Usuario.username == "decisor.padrao"))
    return existente or await criar_usuario(
        db, username="decisor.padrao", nome="Coordenação", perfil="coordenacao"
    )


async def entrar(client, db, username="aluno.teste", perfil=None):
    """Login pelo mock; com `perfil`, a pessoa já existe liberada com ele (como faria a gestão).

    Sem isso, o 1º login de um servidor do mock viraria pedido de acesso, sem sessão
    (emenda v2.3). Devolve (headers Bearer, id).
    """
    if perfil is not None:
        from src.providers.auth.mock import USUARIOS_TESTE

        existente = await db.scalar(select(Usuario).where(Usuario.username == username))
        if existente is None:
            nome = USUARIOS_TESTE.get(username, (username,))[0]
            db.add(Usuario(username=username, nome=nome, perfil=perfil))
        else:
            await db.execute(
                update(Usuario)
                .where(Usuario.id == existente.id)
                .values(perfil=perfil, situacao_acesso="liberado")
            )
        await db.commit()
    body = (await login(client, username)).json()
    usuario_id = uuid.UUID(body["usuario"]["id"])
    return {"Authorization": f"Bearer {body['access_token']}"}, usuario_id


def bearer(usuario) -> dict:
    return {"Authorization": f"Bearer {create_access_token(usuario.id, usuario.perfil)}"}


async def criar_aviso(db, autor, destinos, **campos):
    """`destinos`: lista de dicts como {"tipo": "turma", "turma_id": ...}."""
    campos.setdefault("titulo", "Aviso de teste")
    campos.setdefault("conteudo", "Conteúdo do aviso de teste.")
    aviso = Aviso(autor_id=autor.id, **campos)
    aviso.destinos = [AvisoDestino(**d) for d in destinos]
    db.add(aviso)
    await db.commit()
    return aviso


async def criar_evento(db, autor, destinos, **campos):
    """Evento direto no banco. `destinos`: dicts como {"tipo": "turma", "turma_id": ...}."""
    campos.setdefault("titulo", "Evento de teste")
    campos.setdefault("tipo", "palestra")
    campos.setdefault("inicio", datetime.now(UTC) + timedelta(days=1))
    evento = Evento(autor_id=autor.id, **campos)
    evento.destinos = [EventoDestino(**d) for d in destinos]
    db.add(evento)
    await db.commit()
    return evento


async def criar_horario(db, turma, **campos):
    """Aula da grade direto no banco; horas como "HH:MM"."""
    campos.setdefault("dia_semana", 1)
    campos.setdefault("disciplina", "Banco de Dados II")
    for campo, padrao in (("inicio", "19:10"), ("fim", "20:50")):
        valor = campos.get(campo, padrao)
        campos[campo] = time.fromisoformat(valor) if isinstance(valor, str) else valor
    horario = Horario(turma_id=turma.id, **campos)
    db.add(horario)
    await db.commit()
    return horario


TODOS = {"tipo": "todos"}
DOCENTES = {"tipo": "docentes"}


def turma_destino(turma) -> dict:
    return {"tipo": "turma", "turma_id": turma.id}


def semestre_destino(semestre: int) -> dict:
    return {"tipo": "semestre", "semestre": semestre}
