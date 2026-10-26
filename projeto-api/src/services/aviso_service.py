import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.api.errors import AvisoNaoEncontrado
from src.models.aviso import Aviso
from src.models.usuario import Usuario
from src.repositories.aviso_repository import AvisoRepository


async def listar(
    session: AsyncSession,
    usuario: Usuario,
    situacao: str,
    turma_id: uuid.UUID | None,
    limit: int,
    offset: int,
) -> tuple[list[Aviso], int]:
    return await AvisoRepository(session).listar_para_usuario(
        usuario, situacao, turma_id, limit, offset
    )


async def obter(session: AsyncSession, usuario: Usuario, aviso_id: uuid.UUID) -> Aviso:
    # Inexistente, excluído, agendado ou fora do alcance: a API não distingue (RF-23).
    aviso = await AvisoRepository(session).get_para_usuario(usuario, aviso_id)
    if aviso is None:
        raise AvisoNaoEncontrado()
    return aviso
