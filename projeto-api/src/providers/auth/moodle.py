from src.providers.auth.base import AuthenticatedUser


class MoodleAuthProvider:
    """Integração real com o Moodle do IFSul — pendente de acesso à API da instituição.

    Para ativar: implementar `authenticate`, configurar MOODLE_*, definir AUTH_PROVIDER=moodle
    e executar o checklist de spec.md §9.4. Nenhuma rota, serviço ou contrato muda.
    """

    async def authenticate(self, username: str, password: str) -> AuthenticatedUser | None:
        raise NotImplementedError(
            "MoodleAuthProvider ainda não implementado: aguardando acesso à API do Moodle. "
            "Use AUTH_PROVIDER=mock em desenvolvimento."
        )
