import uuid

from sqlalchemy import case, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.usuario import Usuario


class UsuarioRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, usuario_id: uuid.UUID) -> Usuario | None:
        return await self.session.get(Usuario, usuario_id)

    async def get_by_username(self, username: str) -> Usuario | None:
        return await self.session.scalar(select(Usuario).where(Usuario.username == username))

    async def upsert_from_provider(self, username: str, nome: str) -> Usuario:
        """Cria como `aluno` no 1º login; depois atualiza só nome e último login (RF-08).

        Um único INSERT ... ON CONFLICT: dois primeiros logins simultâneos não colidem.
        """
        stmt = insert(Usuario).values(
            id=uuid.uuid4(), username=username, nome=nome, ultimo_login_em=func.now()
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Usuario.username],
            set_={
                "nome": stmt.excluded.nome,
                "ultimo_login_em": stmt.excluded.ultimo_login_em,
                "atualizado_em": case(
                    (Usuario.nome != stmt.excluded.nome, func.now()),
                    else_=Usuario.atualizado_em,
                ),
            },
        ).returning(Usuario)
        return await self.session.scalar(stmt, execution_options={"populate_existing": True})

    async def get_for_update(self, usuario_id: uuid.UUID) -> Usuario | None:
        # populate_existing: o objeto pode já estar na sessão (o próprio requisitante).
        return await self.session.get(
            Usuario, usuario_id, with_for_update=True, populate_existing=True
        )

    async def listar(
        self,
        q: str | None,
        perfil: str | None,
        ativo: bool | None,
        limit: int,
        offset: int,
    ) -> tuple[list[Usuario], int]:
        stmt = select(Usuario)
        if q:
            termo = f"%{q.strip()}%"
            stmt = stmt.where(or_(Usuario.nome.ilike(termo), Usuario.username.ilike(termo)))
        if perfil is not None:
            stmt = stmt.where(Usuario.perfil == perfil)
        if ativo is not None:
            stmt = stmt.where(Usuario.ativo == ativo)
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        usuarios = await self.session.scalars(
            stmt.order_by(Usuario.nome, Usuario.username).limit(limit).offset(offset)
        )
        return list(usuarios), total

    async def administradores_ativos_para_update(self) -> list[uuid.UUID]:
        """Trava os administradores ativos: mudanças simultâneas não zeram a lista."""
        ids = await self.session.scalars(
            select(Usuario.id)
            .where(Usuario.perfil == "administrador", Usuario.ativo)
            .order_by(Usuario.id)  # ordem fixa de travamento: sem deadlock entre PATCHes
            .with_for_update()
        )
        return list(ids)
