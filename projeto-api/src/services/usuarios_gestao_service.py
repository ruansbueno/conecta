import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import ErroDeValidacao, PerfilIncompativel, UsuarioNaoEncontrado
from src.models.turma import Turma
from src.models.usuario import Usuario
from src.repositories.turma_repository import TurmaRepository
from src.repositories.usuario_repository import UsuarioRepository
from src.services.permissoes import papeis_de_vinculo, papel_do_perfil


async def listar(
    session: AsyncSession, q, perfil, ativo, limit: int, offset: int
) -> tuple[list[Usuario], int]:
    return await UsuarioRepository(session).listar(q, perfil, ativo, limit, offset)


async def obter(
    session: AsyncSession, usuario_id: uuid.UUID
) -> tuple[Usuario, list[tuple[Turma, str]]]:
    usuario = await UsuarioRepository(session).get_by_id(usuario_id)
    if usuario is None:
        raise UsuarioNaoEncontrado()
    return usuario, await TurmaRepository(session).list_todas_do_usuario(usuario_id)


async def alterar(
    session: AsyncSession,
    administrador: Usuario,
    usuario_id: uuid.UUID,
    perfil: str | None,
    ativo: bool | None,
) -> Usuario:
    """Só o administrador muda perfil e situação (RF-09); vale na próxima requisição do alvo."""
    repo = UsuarioRepository(session)
    admins_ativos = await repo.administradores_ativos_para_update()
    alvo = await repo.get_for_update(usuario_id)
    if alvo is None:
        raise UsuarioNaoEncontrado()

    novo_perfil = perfil if perfil is not None else alvo.perfil
    novo_ativo = ativo if ativo is not None else alvo.ativo

    if alvo.id == administrador.id and not novo_ativo:
        raise ErroDeValidacao("ativo", "você não pode desativar a sua própria conta")
    deixa_de_ser_admin_ativo = alvo.id in admins_ativos and (
        novo_perfil != "administrador" or not novo_ativo
    )
    if deixa_de_ser_admin_ativo and len(admins_ativos) == 1:
        campo = "perfil" if novo_perfil != "administrador" else "ativo"
        raise ErroDeValidacao(campo, "é preciso manter ao menos um administrador ativo")

    if novo_perfil != alvo.perfil:
        papeis = await papeis_de_vinculo(session, alvo.id)
        if papeis and papeis != {papel_do_perfil(novo_perfil)}:
            raise PerfilIncompativel(
                "O usuário tem vínculos incompatíveis com o novo perfil; remova-os antes"
            )

    if (novo_perfil, novo_ativo) != (alvo.perfil, alvo.ativo):
        alvo.perfil = novo_perfil
        alvo.ativo = novo_ativo
        alvo.atualizado_em = datetime.now(UTC)
    await session.commit()
    return alvo
