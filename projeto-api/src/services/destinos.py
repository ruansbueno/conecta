"""Regras de destino comuns a avisos e eventos (spec §3.3 da E1; plan da E3, D-E3-1)."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import DestinoNaoPermitido, ErroDeValidacao, TurmaNaoEncontrada
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.schemas.destino import DestinoIn
from src.services.permissoes import gere_tudo, leciona


async def validar_destinos(
    session: AsyncSession, usuario: Usuario, destinos: list[DestinoIn]
) -> None:
    """Turmas existem e estão ativas; docente só usa turmas em que leciona."""
    ids = {d.turma_id for d in destinos if d.turma_id is not None}
    turmas = {t.id: t for t in await session.scalars(select(Turma).where(Turma.id.in_(ids)))}
    for d in destinos:
        if d.turma_id is not None and d.turma_id not in turmas:
            raise TurmaNaoEncontrada()
    await exigir_destinos_do_docente(session, usuario, destinos)
    for i, d in enumerate(destinos):
        if d.turma_id is not None and not turmas[d.turma_id].ativa:
            raise ErroDeValidacao(f"destinos.{i}.turma_id", "turma inativa")


async def exigir_destinos_do_docente(
    session: AsyncSession, usuario: Usuario, destinos: list[DestinoIn]
) -> None:
    """Docente: todos os destinos são turmas em que leciona (spec §3.3)."""
    if gere_tudo(usuario):
        return
    for d in destinos:
        if d.tipo != "turma" or not await leciona(session, usuario, d.turma_id):
            raise DestinoNaoPermitido()


def destinos_atuais(destinos) -> list[DestinoIn]:
    """Destinos gravados (AvisoDestino, EventoDestino) no formato de entrada."""
    return [
        DestinoIn.model_construct(tipo=d.tipo, turma_id=d.turma_id, semestre=d.semestre)
        for d in destinos
    ]


def novos_destinos(modelo, destinos: list[DestinoIn]) -> list:
    """Linhas de `modelo` (AvisoDestino, EventoDestino) para os destinos recebidos."""
    return [modelo(tipo=d.tipo, turma_id=d.turma_id, semestre=d.semestre) for d in destinos]
