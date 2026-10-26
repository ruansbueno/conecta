# CONECTA — API

API REST do CONECTA em FastAPI. Atende o aplicativo mobile (token `Bearer`) e a plataforma web
(cookie de sessão com CSRF). Implementa a **Entrega 1**: login, perfil, turmas e solicitações de
inscrição, e consulta de avisos. Especificação, contrato e tarefas em
[`specs/001-auth-perfil-turmas-avisos/`](specs/001-auth-perfil-turmas-avisos/).

## Rodando localmente

Pré-requisitos: Docker e [`uv`](https://docs.astral.sh/uv/) (instala o Python 3.12 sozinho).

```bash
docker compose up -d --wait db        # Postgres local na porta 5433 (CONECTA_DB_PORT muda)
cp .env.example .env                  # e troque JWT_SECRET (instruções no arquivo)
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed_dev_data
uv run uvicorn src.main:app --reload  # http://localhost:8000/docs
```

O seed cria usuários fictícios para os quatro perfis, todos com a senha `senha-teste`:
`admin.conecta`, `admin.teste`, `coord.teste`, `docente.teste`, `aluno.teste`, `aluno2.teste`,
`aluno3.teste` e `aluno.sem.turma`. Também cria as turmas A, B, C (3º semestre) e D (5º),
vínculos, solicitações e avisos de exemplo. Pode ser executado de novo sem duplicar nada.

Para validar os fluxos de ponta a ponta com `curl`, siga o
[`quickstart.md`](specs/001-auth-perfil-turmas-avisos/quickstart.md). Enquanto o endpoint de
gestão (E2) não existe, uma solicitação é aprovada com
`uv run python -m scripts.aprovar_solicitacao <id>`.

## Testes

```bash
uv run pytest                      # suíte completa (exige o Postgres do compose de pé)
uv run pytest -m "not moodle_real" # explicitamente sem a integração real
uv run ruff check . && uv run ruff format --check .
```

Os testes de integração usam o banco `conecta_test`, recriado pelas migrações a cada execução.

**Mock × real.** Testes que dependem do provedor simulado levam `@pytest.mark.mock_auth`; os da
integração real com o Moodle, `@pytest.mark.moodle_real`, e só rodam com `MOODLE_URL`
configurado. Ao final de cada execução o relatório lista os grupos separadamente — aprovação com
o mock **não** é validação da integração real (`spec.md` §9.1). Evidências arquivadas em
[`evidencias/`](evidencias/).

## Configuração

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL (`postgresql+asyncpg://…`); única diferença entre ambientes |
| `AUTH_PROVIDER` | `mock` (usuários de teste) ou `moodle` (integração real) |
| `JWT_SECRET` | Segredo de assinatura do token; longo e aleatório por ambiente |
| `JWT_EXPIRES_SECONDS` | Validade do token e dos cookies (padrão 86400 = 24 h) |

Os cookies são sempre `Secure`: a web precisa ser servida por HTTPS (ou `localhost`), no mesmo
domínio da API sob `/api`, como previsto na `spec.md`.

## Estrutura

`src/api` (rotas, erros, CSRF) → `src/services` (regras) → `src/repositories` (persistência) →
`src/models` (SQLAlchemy). A integração externa fica isolada em `src/providers/auth`: trocar o
mock pelo Moodle é implementar `MoodleAuthProvider` e definir `AUTH_PROVIDER=moodle`, sem tocar
em rotas, serviços ou contratos. Migrações em `alembic/`, scripts de desenvolvimento em
`scripts/`.

## Pendente

- **Integração real com o Moodle** (T072): implementar `MoodleAuthProvider` e preencher o
  checklist da `spec.md` §9.4 quando houver acesso à API da instituição (data-limite 13/11/2026).
- **Entrega 2**: endpoints `/gestao/*` da plataforma web, já contratados em `contracts/api.md`.
