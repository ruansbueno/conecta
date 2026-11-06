import hmac

from src.providers.auth.base import AuthenticatedUser, TipoInstitucional

SENHA_TESTE = "senha-teste"

# Usuários fictícios de desenvolvimento: login → (nome, tipo institucional, como a API do IFSul
# informa). Os perfis dos que já existem são aplicados pelo seed no banco (RF-03);
# `servidor.aguardando` entra no seed como pedido de acesso pendente; os que o seed não cria
# (`servidor.novo`, `aluno.novo`) mostram o primeiro login de cada tipo.
USUARIOS_TESTE: dict[str, tuple[str, TipoInstitucional]] = {
    "admin.conecta": ("Administrador de Implantação", "administrativo"),
    "admin.teste": ("Administrador de Teste", "administrativo"),
    "coord.teste": ("Coordenação de Teste", "administrativo"),
    "docente.teste": ("Docente de Teste", "administrativo"),
    "aluno.teste": ("Aluno de Teste", "aluno"),
    "aluno2.teste": ("Aluno Dois de Teste", "aluno"),
    "aluno3.teste": ("Aluno Três de Teste", "aluno"),
    "aluno.sem.turma": ("Aluno Sem Turma", "aluno"),
    "servidor.aguardando": ("Servidor Aguardando de Teste", "administrativo"),
    "servidor.novo": ("Servidor Novo de Teste", "administrativo"),
    "aluno.novo": ("Aluno Novo de Teste", "aluno"),
}

# Criados pelo seed; os demais de USUARIOS_TESTE só existem no banco depois do 1º login.
USUARIOS_DO_SEED = tuple(u for u in USUARIOS_TESTE if not u.endswith(".novo"))


class MockAuthProvider:
    """Provedor simulado, com a mesma resposta da API de autenticação do IFSul (sem e-mail)."""

    def __init__(
        self,
        usuarios: dict[str, str | tuple[str, TipoInstitucional | None]] | None = None,
        senha: str = SENHA_TESTE,
    ):
        # Só o nome: um aluno (o 1º login de aluno entra direto, como nos testes da E1/E2).
        self._usuarios = {
            login: (dados, "aluno") if isinstance(dados, str) else dados
            for login, dados in (USUARIOS_TESTE if usuarios is None else usuarios).items()
        }
        self._senha = senha

    async def authenticate(self, username: str, password: str) -> AuthenticatedUser | None:
        conhecido = self._usuarios.get(username)
        if conhecido is None or not hmac.compare_digest(password.encode(), self._senha.encode()):
            return None
        nome, tipo = conhecido
        return AuthenticatedUser(username=username, nome=nome, tipo_institucional=tipo)
