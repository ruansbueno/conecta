"""Pedidos de acesso de servidores (RF-09a, emenda v2.3).

O 1º login de quem a API do IFSul classifica como administrativo cria um pedido sem perfil. A
administração aprova com qualquer perfil; a coordenação, só com docente ou coordenação, e só
pedidos pendentes. Recusado, só a administração libera depois.
"""

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import AcessoJaDecidido, SemPermissao, UsuarioNaoEncontrado
from src.models.usuario import Usuario
from src.repositories.usuario_repository import UsuarioRepository

PERFIS_QUE_A_COORDENACAO_CONCEDE = ("docente", "coordenacao")


async def listar(
    session: AsyncSession, situacao: str, limit: int, offset: int
) -> tuple[list[Usuario], int]:
    return await UsuarioRepository(session).listar_acessos(situacao, limit, offset)


async def _alvo(session: AsyncSession, usuario_id: uuid.UUID) -> Usuario:
    # Travado: duas decisões simultâneas sobre o mesmo pedido não se sobrepõem.
    alvo = await UsuarioRepository(session).get_for_update(usuario_id)
    if alvo is None:
        raise UsuarioNaoEncontrado()
    return alvo


def _decidir(alvo: Usuario, gestor: Usuario, situacao: str, perfil: str | None) -> None:
    agora = datetime.now(UTC)
    alvo.situacao_acesso = situacao
    alvo.perfil = perfil
    alvo.acesso_decidido_em = agora
    alvo.acesso_decidido_por_id = gestor.id
    alvo.atualizado_em = agora


async def aprovar(
    session: AsyncSession, gestor: Usuario, usuario_id: uuid.UUID, perfil: str
) -> Usuario:
    alvo = await _alvo(session, usuario_id)
    if alvo.situacao_acesso == "liberado":
        raise AcessoJaDecidido()
    if gestor.perfil != "administrador":
        if alvo.situacao_acesso == "recusado":
            raise SemPermissao("Só a administração libera um acesso recusado")
        if perfil not in PERFIS_QUE_A_COORDENACAO_CONCEDE:
            raise SemPermissao("A coordenação concede só os perfis docente e coordenação")
    _decidir(alvo, gestor, "liberado", perfil)
    await session.commit()
    return alvo


async def recusar(session: AsyncSession, gestor: Usuario, usuario_id: uuid.UUID) -> Usuario:
    alvo = await _alvo(session, usuario_id)
    if alvo.situacao_acesso != "pendente":
        raise AcessoJaDecidido()
    _decidir(alvo, gestor, "recusado", None)
    await session.commit()
    return alvo


async def decisor(session: AsyncSession, alvo: Usuario) -> Usuario | None:
    if alvo.acesso_decidido_por_id is None:
        return None
    return await session.get(Usuario, alvo.acesso_decidido_por_id)
