from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class AuthenticatedUser:
    """Quem o provedor reconheceu. O perfil não vem daqui: é decidido pelo CONECTA (RF-08)."""

    username: str
    nome: str


class AuthProvider(Protocol):
    """Valida credenciais num sistema externo (Moodle ou simulado).

    Devolve None para credenciais inválidas; pode levantar exceção se o provedor falhar.
    """

    async def authenticate(self, username: str, password: str) -> AuthenticatedUser | None: ...
