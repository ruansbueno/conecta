"""Dados fictícios de desenvolvimento: `python -m scripts.seed_dev_data`.

Cria (ou restaura) os usuários de teste do provedor simulado (MockAuthProvider) com seus
perfis, as turmas A, B, C (3º semestre) e D (5º), vínculos e solicitações de exemplo, avisos e,
na E3, eventos da agenda e a grade de horários. Na E1 o perfil só muda por aqui; na E2, pelo
administrador (RF-08). Pode ser executado várias vezes.
"""

import asyncio
import uuid
from datetime import UTC, datetime, time, timedelta

from sqlalchemy import exists, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.base import coluna
from src.db.session import get_sessionmaker
from src.models.aviso import Aviso, AvisoDestino
from src.models.aviso_evento import AvisoEvento
from src.models.aviso_versao import AvisoVersao
from src.models.evento import Evento
from src.models.horario import Horario
from src.models.solicitacao_inscricao import SolicitacaoInscricao
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.providers.auth.mock import USUARIOS_TESTE
from src.schemas.gestao.eventos import EventoCreate, EventoPatch
from src.services import eventos_gestao_service

PERFIS_TESTE: dict[str, str | None] = {
    "admin.conecta": "administrador",  # administrador de implantação
    "admin.teste": "administrador",
    "coord.teste": "coordenacao",
    "docente.teste": "docente",
    "aluno.teste": "aluno",
    "aluno2.teste": "aluno",
    "aluno3.teste": "aluno",
    "aluno.sem.turma": "aluno",
    "servidor.aguardando": None,  # pedido de acesso pendente (emenda v2.3), para a gestão ver
}


# codigo: (nome, semestre_curso, inscricoes_abertas)
TURMAS_TESTE: dict[str, tuple[str, int, bool]] = {
    "TADS-3A-2026-2": ("TADS 3º Sem A", 3, False),
    "TADS-3B-2026-2": ("TADS 3º Sem B", 3, True),
    "TADS-3C-2026-2": ("TADS 3º Sem C", 3, True),
    "TADS-5A-2026-2": ("TADS 5º Sem A", 5, True),
}

# (username, codigo da turma, papel)
VINCULOS_TESTE = [
    ("aluno.teste", "TADS-3A-2026-2", "aluno"),
    ("aluno2.teste", "TADS-3A-2026-2", "aluno"),
    ("aluno2.teste", "TADS-3B-2026-2", "aluno"),
    ("aluno3.teste", "TADS-3C-2026-2", "aluno"),
    ("docente.teste", "TADS-3A-2026-2", "docente"),
    ("docente.teste", "TADS-5A-2026-2", "docente"),
]

# (username, codigo da turma, status, motivo_recusa)
SOLICITACOES_TESTE = [
    ("aluno.teste", "TADS-3B-2026-2", "pendente", None),
    ("aluno3.teste", "TADS-3B-2026-2", "recusada", "Turma completa"),
]


AVISOS_TESTE_TITULOS: dict[str, str] = {
    "todos": "Boas-vindas ao semestre 2026/2",
    "tres_turmas": "Visita técnica das turmas do 3º semestre",
    "semestre": "Prazo de entrega do projeto integrador (3º semestre)",
    "docentes": "Reunião pedagógica dos docentes",
    "agendado": "Recesso acadêmico (agendado)",
    "arquivado": "Mudança de sala da turma A",
    "excluido": "Aviso publicado por engano",
}

# Eventos da agenda, com datas relativas à primeira execução do seed. Cada um é reconhecido
# pelo título: depois de criado, nada mais é reescrito (versões e histórico são imutáveis).
# título: (autor, tipo, início em horas a partir de agora, duração em horas ou None, local,
#          destinos, operação extra)
EVENTOS_TESTE: dict[str, tuple] = {
    "Semana acadêmica": ("coord.teste", "palestra", -24, 72, "Auditório", ["todos"], None),
    "Palestra: carreira em TI": (
        "coord.teste",
        "palestra",
        7 * 24,
        2,
        "Auditório",
        ["todos"],
        None,
    ),
    "Prova de Banco de Dados II": (
        "docente.teste",
        "prova",
        10 * 24,
        2,
        "Lab 4",
        ["turma:TADS-3A-2026-2"],
        None,
    ),
    "Defesas de TCC II": (
        "coord.teste",
        "banca",
        14 * 24,
        4,
        "Sala 203",
        ["semestre:5", "docentes"],
        "remarcar",
    ),
    "Reunião de colegiado": ("coord.teste", "reuniao", -3 * 24, 2, "Sala 101", ["docentes"], None),
    "Formatura 2026/1": ("coord.teste", "formatura", -60 * 24, 3, "Ginásio", ["todos"], "arquivar"),
    "Prazo de rematrícula": (
        "coord.teste",
        "data_importante",
        20 * 24,
        None,
        None,
        ["todos"],
        None,
    ),
}

# (codigo da turma, dia_semana, início, fim, disciplina, local, docente) — 3A e 3B dividem o
# Lab 4 na segunda às 19h10, de propósito, para a web mostrar um conflito de sala.
HORARIOS_TESTE = [
    ("TADS-3A-2026-2", 1, "19:10", "20:50", "Banco de Dados II", "Lab 4", "docente.teste"),
    ("TADS-3A-2026-2", 1, "21:00", "22:40", "Engenharia de Software", "Sala 203", None),
    ("TADS-3A-2026-2", 3, "19:10", "20:50", "Redes de Computadores", "Lab 5", None),
    ("TADS-3B-2026-2", 1, "19:10", "20:50", "Algoritmos", "lab 4", None),
    ("TADS-5A-2026-2", 4, "19:10", "22:40", "Projeto Integrador", "Sala 301", "docente.teste"),
]

# Ids fixos derivados da chave: o seed reconhece os avisos que já criou.
_NAMESPACE_AVISOS = uuid.UUID("5f0c8a52-3c1e-4a8e-9b1d-2e6f7a9c0d13")


def _aviso_id(chave: str) -> uuid.UUID:
    return uuid.uuid5(_NAMESPACE_AVISOS, chave)


async def seed(session: AsyncSession) -> None:
    await _usuarios(session)
    await _turmas(session)
    await session.flush()
    usuarios = dict((await session.execute(select(Usuario.username, Usuario.id))).all())
    turmas = dict((await session.execute(select(Turma.codigo, Turma.id))).all())
    await _vinculos(session, usuarios, turmas)
    await _solicitacoes(session, usuarios, turmas)
    await _avisos(session, usuarios, turmas)
    await _horarios(session, usuarios, turmas)
    await session.commit()
    # Por último: o serviço de gestão grava cada evento com versão e histórico e faz commit.
    await _eventos(session, turmas)


async def _usuarios(session: AsyncSession) -> None:
    for username, perfil in PERFIS_TESTE.items():
        nome, tipo = USUARIOS_TESTE[username]
        stmt = insert(Usuario).values(
            username=username,
            nome=nome,
            perfil=perfil,
            situacao_acesso="liberado" if perfil is not None else "pendente",
            tipo_institucional=tipo,
        )
        atualizar = {
            Usuario.nome: stmt.excluded[coluna(Usuario.nome)],
            Usuario.tipo_institucional: stmt.excluded[coluna(Usuario.tipo_institucional)],
            Usuario.ativo: True,
            Usuario.atualizado_em: func.now(),
        }
        if perfil is not None:
            # Restaura o perfil dos usuários liberados. Um pedido de acesso já decidido
            # (servidor.aguardando liberado ou recusado) não é reaberto pelo seed.
            atualizar[Usuario.perfil] = stmt.excluded[coluna(Usuario.perfil)]
            atualizar[Usuario.situacao_acesso] = stmt.excluded[coluna(Usuario.situacao_acesso)]
        stmt = stmt.on_conflict_do_update(index_elements=[Usuario.username], set_=atualizar)
        await session.execute(stmt)


async def _turmas(session: AsyncSession) -> None:
    for codigo, (nome, semestre, abertas) in TURMAS_TESTE.items():
        stmt = insert(Turma).values(
            codigo=codigo,
            nome=nome,
            semestre_curso=semestre,
            periodo_letivo="2026/2",
            inscricoes_abertas=abertas,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Turma.codigo],
            set_={
                Turma.nome: stmt.excluded[coluna(Turma.nome)],
                Turma.semestre_curso: stmt.excluded[coluna(Turma.semestre_curso)],
                Turma.inscricoes_abertas: stmt.excluded[coluna(Turma.inscricoes_abertas)],
                Turma.ativa: True,
            },
        )
        await session.execute(stmt)


async def _vinculos(session: AsyncSession, usuarios: dict, turmas: dict) -> None:
    for username, codigo, papel in VINCULOS_TESTE:
        stmt = insert(VinculoTurma).values(
            turma_id=turmas[codigo], usuario_id=usuarios[username], papel=papel, origem="seed"
        )
        await session.execute(stmt.on_conflict_do_nothing())


async def _solicitacoes(session: AsyncSession, usuarios: dict, turmas: dict) -> None:
    for username, codigo, status, motivo in SOLICITACOES_TESTE:
        aluno_id, turma_id = usuarios[username], turmas[codigo]
        ja_existe = await session.scalar(
            select(SolicitacaoInscricao.id)
            .where(
                SolicitacaoInscricao.aluno_id == aluno_id,
                SolicitacaoInscricao.turma_id == turma_id,
            )
            .limit(1)
        )
        if ja_existe is None:
            session.add(
                SolicitacaoInscricao(
                    turma_id=turma_id,
                    aluno_id=aluno_id,
                    status=status,
                    motivo_recusa=motivo,
                    decidida_em=None if status == "pendente" else datetime.now(UTC),
                )
            )


# O aviso "semestre" nasce editado (2 versões), para a web exibir versões e linha do tempo.
_CONTEUDO_ORIGINAL_SEMESTRE = "Conteúdo fictício de demonstração: prazo original do projeto."


async def _avisos(session: AsyncSession, usuarios: dict, turmas: dict) -> None:
    agora = datetime.now(UTC)
    criado_em = agora - timedelta(hours=2)
    autor = usuarios["coord.teste"]
    # chave: (destinos, campos extras)
    avisos = {
        "todos": ([("todos", None, None)], {}),
        "tres_turmas": (
            [("turma", turmas[f"TADS-{t}-2026-2"], None) for t in ("3A", "3B", "3C")],
            {},
        ),
        "semestre": (
            [("semestre", None, 3)],
            {"versao_atual": 2, "editado_em": agora - timedelta(hours=1)},
        ),
        "docentes": ([("docentes", None, None)], {}),
        "agendado": ([("todos", None, None)], {"publicar_em": agora + timedelta(days=7)}),
        "arquivado": (
            [("turma", turmas["TADS-3A-2026-2"], None)],
            {"situacao": "arquivado", "arquivado_em": agora - timedelta(minutes=30)},
        ),
        "excluido": (
            [("todos", None, None)],
            {"situacao": "excluido", "excluido_em": agora - timedelta(minutes=30)},
        ),
    }
    for chave, (destinos, extras) in avisos.items():
        aviso_id = _aviso_id(chave)
        conteudo = f"Conteúdo fictício de demonstração: {AVISOS_TESTE_TITULOS[chave]}."
        stmt = insert(Aviso).values(
            id=aviso_id,
            titulo=AVISOS_TESTE_TITULOS[chave],
            conteudo=conteudo,
            autor_id=autor,
            criado_em=criado_em,
            **extras,
        )
        # Aviso de um banco semeado antes da E2 (sem auditoria) ganha o estado coerente com as
        # versões que _auditoria vai gravar; depois disso, nada mais é reescrito.
        sem_auditoria = ~exists().where(AvisoVersao.aviso_id == aviso_id)
        await session.execute(
            stmt.on_conflict_do_update(
                index_elements=[Aviso.id],
                set_={
                    campo: stmt.excluded[coluna(campo)]
                    for campo in (
                        Aviso.criado_em,
                        Aviso.versao_atual,
                        Aviso.editado_em,
                        Aviso.situacao,
                        Aviso.publicar_em,
                        Aviso.arquivado_em,
                        Aviso.excluido_em,
                    )
                },
                where=sem_auditoria,
            )
        )
        for tipo, turma_id, semestre in destinos:
            await session.execute(
                insert(AvisoDestino)
                .values(aviso_id=aviso_id, tipo=tipo, turma_id=turma_id, semestre=semestre)
                .on_conflict_do_nothing()
            )
        await _auditoria(session, chave, aviso_id, autor, destinos, conteudo, extras, criado_em)


async def _auditoria(session, chave, aviso_id, autor, destinos, conteudo, extras, criado_em):
    """Versões e eventos coerentes com o aviso; só na primeira vez (auditoria é imutável)."""
    if await session.scalar(select(AvisoVersao.id).where(AvisoVersao.aviso_id == aviso_id)):
        return
    canonicos = sorted(
        (
            {"tipo": t, "turma_id": str(tid) if tid else None, "semestre": sem}
            for t, tid, sem in destinos
        ),
        key=lambda d: (d["tipo"], d["turma_id"] or "", d["semestre"] or 0),
    )
    titulo = AVISOS_TESTE_TITULOS[chave]
    publicar_em = extras.get("publicar_em")
    editado = chave == "semestre"

    def versao(numero, texto, quando):
        session.add(
            AvisoVersao(
                aviso_id=aviso_id,
                versao=numero,
                titulo=titulo,
                conteudo=texto,
                destinos=canonicos,
                publicar_em=publicar_em,
                criada_por=autor,
                criada_em=quando,
            )
        )

    def evento(tipo, quando, numero=None, alteracoes=None):
        session.add(
            AvisoEvento(
                aviso_id=aviso_id,
                tipo=tipo,
                usuario_id=autor,
                ocorrido_em=quando,
                versao=numero,
                alteracoes=alteracoes,
            )
        )

    versao(1, _CONTEUDO_ORIGINAL_SEMESTRE if editado else conteudo, criado_em)
    evento("criado", criado_em, 1)
    if editado:
        versao(2, conteudo, extras["editado_em"])
        evento(
            "editado",
            extras["editado_em"],
            2,
            {"conteudo": {"de": _CONTEUDO_ORIGINAL_SEMESTRE, "para": conteudo}},
        )
    if chave in ("arquivado", "excluido"):
        evento(chave, extras[f"{chave}_em"])
    await session.flush()


def _destino(texto: str, turmas: dict) -> dict:
    tipo, _, valor = texto.partition(":")
    if tipo == "turma":
        return {"tipo": "turma", "turma_id": turmas[valor]}
    if tipo == "semestre":
        return {"tipo": "semestre", "semestre": int(valor)}
    return {"tipo": tipo}


async def _eventos(session: AsyncSession, turmas: dict) -> None:
    existentes = set(await session.scalars(select(Evento.titulo)))
    agora = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)
    for titulo, (username, tipo, horas, duracao, local, destinos, extra) in EVENTOS_TESTE.items():
        if titulo in existentes:
            continue
        autor = await session.scalar(select(Usuario).where(Usuario.username == username))
        inicio = agora + timedelta(hours=horas)
        dados = EventoCreate(
            titulo=titulo,
            tipo=tipo,
            inicio=inicio,
            fim=inicio + timedelta(hours=duracao) if duracao else None,
            local=local,
            destinos=[_destino(d, turmas) for d in destinos],
        )
        evento = await eventos_gestao_service.criar(session, autor, dados)
        if extra == "remarcar":
            await eventos_gestao_service.editar(
                session, autor, evento.id, EventoPatch(local="Lab 4")
            )
        elif extra == "arquivar":
            await eventos_gestao_service.arquivar(session, autor, evento.id)


async def _horarios(session: AsyncSession, usuarios: dict, turmas: dict) -> None:
    """A grade de uma turma só é semeada enquanto ela não tem nenhuma aula."""
    com_grade = set(await session.scalars(select(Horario.turma_id).distinct()))
    for codigo, dia, inicio, fim, disciplina, local, docente in HORARIOS_TESTE:
        if turmas[codigo] in com_grade:
            continue
        session.add(
            Horario(
                turma_id=turmas[codigo],
                dia_semana=dia,
                inicio=time.fromisoformat(inicio),
                fim=time.fromisoformat(fim),
                disciplina=disciplina,
                local=local,
                docente_id=usuarios[docente] if docente else None,
            )
        )
    await session.flush()


async def main() -> None:
    async with get_sessionmaker()() as session:
        await seed(session)
    print(
        f"Seed concluído: {len(PERFIS_TESTE)} usuários de teste (senha: senha-teste), "
        f"{len(TURMAS_TESTE)} turmas, {len(VINCULOS_TESTE)} vínculos, "
        f"{len(AVISOS_TESTE_TITULOS)} avisos, {len(EVENTOS_TESTE)} eventos, "
        f"{len(HORARIOS_TESTE)} horários."
    )


if __name__ == "__main__":
    asyncio.run(main())
