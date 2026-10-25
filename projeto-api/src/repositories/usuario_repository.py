import uuid

from sqlalchemy import case, func, select
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
