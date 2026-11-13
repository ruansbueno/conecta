import uuid

from sqlalchemy import case, func, or_, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.base import coluna
from src.models.usuario import Usuario
from src.providers.auth.base import AuthenticatedUser
from src.repositories.busca import contem


class UsuarioRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, usuario_id: uuid.UUID) -> Usuario | None:
        return await self.session.get(Usuario, usuario_id)

    async def get_liberado(self, usuario_id: uuid.UUID) -> Usuario | None:
        """Só quem tem acesso liberado: quem aguarda não existe para a gestão de usuários."""
        usuario = await self.session.get(Usuario, usuario_id)
        return usuario if usuario is not None and usuario.situacao_acesso == "liberado" else None

    async def listar_acessos(
        self, situacao: str, limit: int, offset: int
    ) -> tuple[list[Usuario], int]:
        stmt = select(Usuario).where(Usuario.situacao_acesso == situacao)
        total = await self.session.scalar(select(func.count()).select_from(stmt.subquery()))
        usuarios = await self.session.scalars(
            stmt.order_by(Usuario.criado_em, Usuario.username).limit(limit).offset(offset)
        )
        return list(usuarios), total

    async def por_ids(self, ids: set[uuid.UUID]) -> dict[uuid.UUID, Usuario]:
        """Vários usuários numa consulta (os decisores de uma página de pedidos, por exemplo)."""
        if not ids:
            return {}
        return {
            u.id: u for u in await self.session.scalars(select(Usuario).where(Usuario.id.in_(ids)))
        }

    async def get_by_username(self, username: str) -> Usuario | None:
        return await self.session.scalar(select(Usuario).where(Usuario.username == username))

    async def upsert_from_provider(self, autenticado: AuthenticatedUser) -> Usuario:
        """1º login: aluno entra como `aluno`; outro tipo institucional fica pendente, sem perfil
        (RF-08, emenda v2.3). Depois, atualiza só nome, e-mail, tipo e último login — nunca o
        perfil nem a situação do acesso.

        Um único INSERT ... ON CONFLICT: dois primeiros logins simultâneos não colidem.
        """
        aluno = autenticado.tipo_institucional == "aluno"
        stmt = insert(Usuario).values(
            id=uuid.uuid4(),
            username=autenticado.username,
            nome=autenticado.nome,
            email=autenticado.email,
            tipo_institucional=autenticado.tipo_institucional,
            perfil="aluno" if aluno else None,
            situacao_acesso="liberado" if aluno else "pendente",
            ultimo_login_em=func.now(),
        )
        novo = stmt.excluded
        mudou = or_(
            Usuario.nome != novo[coluna(Usuario.nome)],
            Usuario.email.is_distinct_from(novo[coluna(Usuario.email)]),
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=[Usuario.username],
            set_={
                Usuario.nome: novo[coluna(Usuario.nome)],
                Usuario.email: novo[coluna(Usuario.email)],
                Usuario.tipo_institucional: novo[coluna(Usuario.tipo_institucional)],
                Usuario.ultimo_login_em: novo[coluna(Usuario.ultimo_login_em)],
                Usuario.atualizado_em: case((mudou, func.now()), else_=Usuario.atualizado_em),
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
        # Pedidos de acesso (pendentes e recusados) ficam em /gestao/acessos, sem perfil.
        stmt = select(Usuario).where(Usuario.situacao_acesso == "liberado")
        if q:
            stmt = stmt.where(contem(q, Usuario.nome, Usuario.username))
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
