import hmac

from src.providers.auth.base import AuthenticatedUser

SENHA_TESTE = "senha-teste"

# Usuários fictícios de desenvolvimento. Os perfis são aplicados pelo seed no banco (RF-03).
USUARIOS_TESTE: dict[str, str] = {
    "admin.conecta": "Administrador de Implantação",
    "admin.teste": "Administrador de Teste",
    "coord.teste": "Coordenação de Teste",
    "docente.teste": "Docente de Teste",
    "aluno.teste": "Aluno de Teste",
    "aluno2.teste": "Aluno Dois de Teste",
    "aluno3.teste": "Aluno Três de Teste",
    "aluno.sem.turma": "Aluno Sem Turma",
}


class MockMoodleAuthProvider:
    """Simula o Moodle enquanto não há acesso à API real da instituição."""

    def __init__(self, usuarios: dict[str, str] | None = None, senha: str = SENHA_TESTE):
        self._usuarios = USUARIOS_TESTE if usuarios is None else usuarios
        self._senha = senha

    async def authenticate(self, username: str, password: str) -> AuthenticatedUser | None:
        nome = self._usuarios.get(username)
        if nome is None or not hmac.compare_digest(password.encode(), self._senha.encode()):
            return None
        return AuthenticatedUser(username=username, nome=nome)
