from dataclasses import dataclass
from typing import Protocol

from src.models.usuario import TipoInstitucional


@dataclass(frozen=True)
class AuthenticatedUser:
    """Quem o provedor reconheceu. O perfil não vem daqui: é decidido pelo CONECTA (RF-08).

    `tipo_institucional` é a classificação do IFSul (aluno ou administrativo); `None` quando o
    provedor não a informa ou devolve um valor desconhecido — tratado como não aluno.
    """

    username: str
    nome: str
    email: str | None = None
    tipo_institucional: TipoInstitucional | None = None


class AuthProvider(Protocol):
    """Valida credenciais num sistema externo (API de autenticação do IFSul ou simulado).

    Devolve None para credenciais inválidas; levanta exceção se o provedor falhar.
    """

    async def authenticate(self, username: str, password: str) -> AuthenticatedUser | None: ...
