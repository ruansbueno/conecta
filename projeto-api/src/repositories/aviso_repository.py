import uuid

from sqlalchemy import Select, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.aviso import Aviso, AvisoDestino
from src.models.usuario import Usuario
from src.repositories.alcance import alcanca

PUBLICADO_EM = func.coalesce(Aviso.publicar_em, Aviso.criado_em)


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
        return select(Aviso).where(
            func.now() >= PUBLICADO_EM,
            alcanca(AvisoDestino, AvisoDestino.aviso_id == Aviso.id, usuario),
        )

    @staticmethod
    def _com_detalhes(stmt: Select) -> Select:
        return stmt.options(
            selectinload(Aviso.autor),
            selectinload(Aviso.destinos).selectinload(AvisoDestino.turma),
        )
