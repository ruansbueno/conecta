"""Grade semanal das turmas: consulta por vínculo, CRUD da gestão e conflitos (RF-43..47)."""

import uuid

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import (
    ErroDeValidacao,
    HorarioNaoEncontrado,
    PerfilIncompativel,
    SemPermissao,
    TurmaNaoEncontrada,
    UsuarioNaoEncontrado,
)
from src.models.horario import Horario
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma
from src.repositories.horario_repository import HorarioRepository
from src.schemas.gestao.horarios import HorarioCreate, HorarioPatch
from src.services.conflitos import mesma_sala
from src.services.permissoes import gere_tudo

_CAMPOS = ("dia_semana", "inicio", "fim", "disciplina", "local", "docente_id")


async def _turma(session: AsyncSession, turma_id: uuid.UUID) -> Turma:
    turma = await session.get(Turma, turma_id)
    if turma is None:
        raise TurmaNaoEncontrada()
    return turma


async def _exigir_docente(session: AsyncSession, docente_id: uuid.UUID | None) -> None:
    """O docente informado existe e tem perfil docente; desativado continua valendo (D-E3-11)."""
    if docente_id is None:
        return
    docente = await session.get(Usuario, docente_id)
    if docente is None:
        raise UsuarioNaoEncontrado()
    if docente.perfil != "docente":
        raise PerfilIncompativel("O docente informado não tem perfil docente")


async def _gravar(
    session: AsyncSession, horario: Horario, turma: Turma
) -> tuple[Horario, list[dict]]:
    """Grava e devolve os conflitos encontrados: informam, nunca impedem (RF-44)."""
    await session.flush()
    repo = HorarioRepository(session)
    conflitos = []
    for outro, turma_outro in await repo.candidatos_a_conflito(horario, turma.periodo_letivo):
        base = {
            "local": outro.local,
            "horario_id": outro.id,
            "turma": turma_outro,
            "inicio": outro.inicio,
            "fim": outro.fim,
        }
        if mesma_sala(horario.local, outro.local):
            conflitos.append({"tipo": "sala", **base})
        if horario.docente_id is not None and horario.docente_id == outro.docente_id:
            conflitos.append({"tipo": "docente", **base})
    await session.commit()
    return await repo.obter_da_turma(turma.id, horario.id), conflitos


async def consultar(
    session: AsyncSession, usuario: Usuario, turma_id: uuid.UUID, limit: int, offset: int
) -> tuple[list[Horario], int]:
    """Grade para os clientes (RF-45): vínculo de qualquer papel, ou administração e coordenação.

    Turma inexistente ou inativa é 404 para todos, antes da permissão (plan D-E3-10).
    """
    turma = await session.get(Turma, turma_id)
    if turma is None or not turma.ativa:
        raise TurmaNaoEncontrada()
    if not gere_tudo(usuario):
        vinculado = await session.scalar(
            select(
                exists().where(
                    VinculoTurma.turma_id == turma_id, VinculoTurma.usuario_id == usuario.id
                )
            )
        )
        if not vinculado:
            raise SemPermissao()
    return await HorarioRepository(session).listar_da_turma(turma_id, None, limit, offset)


async def criar(
    session: AsyncSession, turma_id: uuid.UUID, dados: HorarioCreate
) -> tuple[Horario, list[dict]]:
    turma = await _turma(session, turma_id)
    await _exigir_docente(session, dados.docente_id)
    # Atributos, não model_dump(): o dump serializa as horas como texto "HH:MM".
    horario = Horario(turma_id=turma.id, **{c: getattr(dados, c) for c in _CAMPOS})
    session.add(horario)
    return await _gravar(session, horario, turma)


async def listar_gestao(
    session: AsyncSession, turma_id: uuid.UUID, dia_semana: int | None, limit: int, offset: int
) -> tuple[list[Horario], int]:
    """A gestão vê a grade de qualquer turma, inclusive inativa (contracts E3 §11)."""
    await _turma(session, turma_id)
    return await HorarioRepository(session).listar_da_turma(turma_id, dia_semana, limit, offset)


async def _horario(session: AsyncSession, turma_id: uuid.UUID, horario_id: uuid.UUID) -> Horario:
    horario = await HorarioRepository(session).obter_da_turma(turma_id, horario_id)
    if horario is None:
        raise HorarioNaoEncontrado()
    return horario


async def editar(
    session: AsyncSession, turma_id: uuid.UUID, horario_id: uuid.UUID, dados: HorarioPatch
) -> tuple[Horario, list[dict]]:
    turma = await _turma(session, turma_id)
    horario = await _horario(session, turma_id, horario_id)
    enviados = dados.model_fields_set
    novo = {c: getattr(dados, c) if c in enviados else getattr(horario, c) for c in _CAMPOS}
    if novo["fim"] <= novo["inicio"]:
        raise ErroDeValidacao("fim", "deve ser maior que inicio")
    if all(novo[c] == getattr(horario, c) for c in _CAMPOS):
        raise ErroDeValidacao("body", "nenhuma alteração")
    if "docente_id" in enviados:
        await _exigir_docente(session, dados.docente_id)
    for campo, valor in novo.items():
        setattr(horario, campo, valor)
    return await _gravar(session, horario, turma)


async def remover(session: AsyncSession, turma_id: uuid.UUID, horario_id: uuid.UUID) -> None:
    """Remoção física: a grade é configuração, sem histórico (D-E3-12)."""
    await _turma(session, turma_id)
    await session.delete(await _horario(session, turma_id, horario_id))
    await session.commit()
