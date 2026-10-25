import uuid

from sqlalchemy import ColumnElement, Select, and_, exists, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.aviso import Aviso, AvisoDestino
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.models.vinculo_turma import VinculoTurma

PUBLICADO_EM = func.coalesce(Aviso.publicar_em, Aviso.criado_em)


def _alcanca(usuario: Usuario) -> ColumnElement[bool]:
    """Algum destino do aviso alcança o usuário (regra de visibilidade, data-model.md).

    EXISTS sobre os destinos: o aviso aparece uma vez só, por quantos destinos o alcancem.
    """
    vinculo_ativo = (
        select(VinculoTurma.id)
        .join(Turma, Turma.id == VinculoTurma.turma_id)
        .where(VinculoTurma.usuario_id == usuario.id, Turma.ativa)
    )
    por_turma = exists(vinculo_ativo.where(Turma.id == AvisoDestino.turma_id))
    por_semestre = exists(vinculo_ativo.where(Turma.semestre_curso == AvisoDestino.semestre))
    alcances = [
        AvisoDestino.tipo == "todos",
        and_(AvisoDestino.tipo == "turma", por_turma),
        and_(AvisoDestino.tipo == "semestre", por_semestre),
    ]
    if usuario.perfil == "docente":
        alcances.append(AvisoDestino.tipo == "docentes")
    return exists().where(AvisoDestino.aviso_id == Aviso.id, or_(*alcances))


class AvisoRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def listar_para_usuario(
        self,
        usuario: Usuario,
        situacao: str,
        turma_id: uuid.UUID | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Aviso], int]:
        stmt = self._visiveis(usuario).where(Aviso.situacao == situacao)
        if turma_id is not None:
            stmt = stmt.where(
                exists().where(
                    AvisoDestino.aviso_id == Aviso.id,
                    AvisoDestino.tipo == "turma",
                    AvisoDestino.turma_id == turma_id,
                )
            )
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        avisos = await self.session.scalars(
            self._com_detalhes(stmt)
            .order_by(PUBLICADO_EM.desc(), Aviso.id)
            .limit(limit)
            .offset(offset)
        )
        return list(avisos), total

    async def get_para_usuario(self, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso | None:
        stmt = self._visiveis(usuario).where(
            Aviso.id == aviso_id, Aviso.situacao.in_(("ativo", "arquivado"))
        )
        return await self.session.scalar(self._com_detalhes(stmt))

    @staticmethod
    def _visiveis(usuario: Usuario) -> Select:
        # Já publicado (agendados ficam ocultos até a data, RF-22) e alcançado por um destino.
        return select(Aviso).where(func.now() >= PUBLICADO_EM, _alcanca(usuario))

    @staticmethod
    def _com_detalhes(stmt: Select) -> Select:
        return stmt.options(
            selectinload(Aviso.autor),
            selectinload(Aviso.destinos).selectinload(AvisoDestino.turma),
        )
