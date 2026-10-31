"""Quem um aviso ou evento alcança: a única definição do sistema (data-model.md, plan E3 D-E3-1)."""

from sqlalchemy import ColumnElement, and_, exists, or_, select

from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma


def alcanca(destino, do_dono: ColumnElement[bool], usuario: Usuario) -> ColumnElement[bool]:
    """Algum destino do dono alcança o usuário.

    `destino` é a tabela de destinos (AvisoDestino, EventoDestino) e `do_dono` liga um destino ao
    dono da consulta (`AvisoDestino.aviso_id == Aviso.id`). EXISTS sobre os destinos: o dono
    aparece uma vez só, por quantos destinos o alcancem. Turma inativa suspende o alcance por
    turma e por semestre.
    """
    vinculo_ativo = (
        select(VinculoTurma.id)
        .join(Turma, Turma.id == VinculoTurma.turma_id)
        .where(VinculoTurma.usuario_id == usuario.id, Turma.ativa)
    )
    por_turma = exists(vinculo_ativo.where(Turma.id == destino.turma_id))
    por_semestre = exists(vinculo_ativo.where(Turma.semestre_curso == destino.semestre))
    alcances = [
        destino.tipo == "todos",
        and_(destino.tipo == "turma", por_turma),
        and_(destino.tipo == "semestre", por_semestre),
    ]
    if usuario.perfil == "docente":
        alcances.append(destino.tipo == "docentes")
    return exists().where(do_dono, or_(*alcances))
