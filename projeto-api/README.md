# CONECTA — API

API REST do CONECTA em FastAPI. Atende o aplicativo mobile (token `Bearer`) e a plataforma web
(cookie de sessão com CSRF assinado). Implementa:

- **Entrega 1** (aplicativo): login, perfil, turmas e solicitações de inscrição, consulta de
  avisos.
- **Entrega 2** (gestão, `/gestao/*`): usuários e perfis, turmas, vínculos, decisão de
  solicitações, publicação e ciclo de vida de avisos, com versões e histórico imutáveis.
- **Entrega 3** (agenda e horários): eventos com os mesmos destinos, versões e histórico dos
  avisos (`/eventos`, `/gestao/eventos`) e a grade semanal das turmas, com conflitos de sala e de
  docente informados sem bloquear (`/turmas/{id}/horarios`, `/gestao/turmas/{id}/horarios`).

Especificação, contrato e tarefas em
[`specs/001-auth-perfil-turmas-avisos/`](specs/001-auth-perfil-turmas-avisos/) (`tasks.md` para a
E1; `plan-e2.md` e `tasks-e2.md` para a E2) e
[`specs/002-agenda-horarios/`](specs/002-agenda-horarios/) para a E3 (com o próprio
`quickstart.md`).

## Rodando localmente

Pré-requisitos: Docker e [`uv`](https://docs.astral.sh/uv/) (instala o Python 3.12 sozinho).

```bash
docker compose up -d --wait db        # Postgres local na porta 5433 (CONECTA_DB_PORT muda)
cp .env.example .env                  # e troque JWT_SECRET e CSRF_SECRET (instruções no arquivo)
uv sync
uv run alembic upgrade head
uv run python -m scripts.seed_dev_data
uv run uvicorn src.main:app --reload  # http://localhost:8000/docs
```

O seed cria usuários fictícios para os quatro perfis, todos com a senha `senha-teste`:
`admin.conecta`, `admin.teste`, `coord.teste`, `docente.teste`, `aluno.teste`, `aluno2.teste`,
`aluno3.teste` e `aluno.sem.turma`. Também cria as turmas A, B, C (3º semestre) e D (5º),
vínculos, solicitações e avisos de exemplo, eventos da agenda e a grade das turmas 3A, 3B e 5A
(com um conflito de sala de propósito). Pode ser executado de novo sem duplicar nada.

Para validar os fluxos de ponta a ponta com `curl`, siga o
[`quickstart.md`](specs/001-auth-perfil-turmas-avisos/quickstart.md). Os avisos do seed já vêm com
versões e histórico (um editado, um arquivado e um excluído), para a plataforma web exibir a linha
do tempo. Solicitações são decididas em `POST /gestao/solicitacoes/{id}/aprovar|recusar`; o
script `scripts.aprovar_solicitacao` segue disponível e usa as mesmas regras. Os fluxos da agenda
e da grade estão no [`quickstart.md` da E3](specs/002-agenda-horarios/quickstart.md).

## Testes

```bash
uv run pytest                      # suíte completa (exige o Postgres do compose de pé)
uv run pytest -m "not ifsul_real"  # explicitamente sem a integração real
uv run ruff check . && uv run ruff format --check .
```

Os testes de integração usam o banco `conecta_test`, recriado pelas migrações a cada execução
(a suíte recusa qualquer banco cujo nome não termine em `_test`). `tests/e2e/` executa o roteiro
de ponta a ponta da `spec.md` §9.3 (publicar pela gestão e receber no aplicativo) e o da E3
(agenda e grade montadas pela gestão e consultadas pelos clientes).

**Mock × real.** Testes que dependem do provedor simulado levam `@pytest.mark.mock_auth`; os da
integração real com a API de autenticação do IFSul, `@pytest.mark.ifsul_real`, e só rodam com uma
conta institucional configurada (`IFSUL_TEST_USERNAME`, `IFSUL_TEST_PASSWORD`, `IFSUL_AUTH_URL`). Ao final de cada execução o relatório lista os grupos separadamente — aprovação com
o mock **não** é validação da integração real (`spec.md` §9.1). Evidências arquivadas em
[`evidencias/`](evidencias/).

## Configuração

| Variável | Uso |
|---|---|
| `DATABASE_URL` | Conexão PostgreSQL (`postgresql+asyncpg://…`); única diferença entre ambientes |
| `AUTH_PROVIDER` | `mock` (usuários de teste) ou `ifsul` (API de autenticação do IFSul) |
| `IFSUL_AUTH_URL` | Endereço da API de autenticação do IFSul (obrigatório com `AUTH_PROVIDER=ifsul`) |
| `IFSUL_AUTH_PERMITIR_HTTP` | `true` só para teste: aceita `IFSUL_AUTH_URL` com `http://` (a senha iria em claro) |
| `JWT_SECRET` | Segredo de assinatura do token; longo e aleatório por ambiente |
| `CSRF_SECRET` | Chave do HMAC que prende o token CSRF à sessão web; outra, diferente da `JWT_SECRET` |
| `JWT_EXPIRES_SECONDS` | Validade do token e dos cookies (padrão 86400 = 24 h) |

Trocar a `CSRF_SECRET` (ou implantar a emenda v2.2 sobre sessões antigas) invalida o CSRF das
sessões abertas: as escritas delas recebem 403 `CSRF_INVALIDO` até um novo login.

Os cookies são sempre `Secure`: a web precisa ser servida por HTTPS (ou `localhost`), no mesmo
domínio da API sob `/api`, como previsto na `spec.md`.

## Estrutura

`src/api` (rotas, erros, CSRF) → `src/services` (regras) → `src/repositories` (persistência) →
`src/models` (SQLAlchemy). A integração externa fica isolada em `src/providers/auth`: o
`IfsulAuthProvider` fala com a API de autenticação do IFSul, e trocar o mock por ele é só definir
`AUTH_PROVIDER=ifsul` e `IFSUL_AUTH_URL`, sem tocar em rotas, serviços ou contratos. Migrações em `alembic/`, scripts de desenvolvimento em
`scripts/`.

## Auditoria dos avisos

Toda criação, edição, arquivamento, desarquivamento e exclusão grava, na mesma transação, a
versão completa (quando há conteúdo novo) e um evento com usuário, data e o que mudou. As tabelas
`tb_aviso_versao` e `tb_aviso_historico` são imutáveis: o próprio banco recusa `UPDATE` e `DELETE`.

## Implantar uma migração que renomeia

A migração `5b7d2e9a4c13` (nomenclatura do banco, 31/10/2026) só renomeia, mas o código anterior
não roda no banco migrado, nem o contrário. Para implantar: parar a API, rodar
`alembic upgrade head` e subir o código novo. Para voltar o código, rode antes
`alembic downgrade 9e05f46bf9bf`.

## Login pela API de autenticação do IFSul (emenda v2.3)

A API de autenticação do IFSul consulta o Active Directory e devolve login, nome, e-mail e o tipo
institucional (`aluno` ou `administrativo`). Ela só autentica: a sessão e as permissões são do
CONECTA.

- **Aluno** entra como `aluno` no 1º login.
- **Servidor** (tipo administrativo, ou sem tipo) vira um **pedido de acesso**, sem perfil e sem
  sessão (403 `ACESSO_PENDENTE`). A administração aprova com qualquer perfil; a coordenação, com
  docente ou coordenação. Pode ser recusado (403 `ACESSO_RECUSADO`). Na web: Usuários → Aguardando
  acesso; na API: `/gestao/acessos`.
- **Primeiro administrador**, no servidor: `uv run python -m scripts.definir_administrador <login>`.
- **Validação com contas reais**: `uv run python -m scripts.roteiro_ifsul --conecta <url>` executa
  os 9 testes do item 10 da doc do IFSul e grava o relatório esperado × obtido, sem senha (passo a
  passo no [`quickstart.md`](specs/001-auth-perfil-turmas-avisos/quickstart.md)).

Até a emenda v2.3, a integração real era prevista "com o Moodle"; o serviço da instituição é a API
de autenticação do IFSul, e o provedor simulado passou a se chamar `MockAuthProvider`.

## Pendente

- **Validação com contas reais** (T072): rodar `scripts/roteiro_ifsul.py` com uma conta de aluno e
  uma administrativa e marcar o checklist da `spec.md` §9.4 (data-limite 13/11/2026). Os casos sem
  conta já passaram contra a API real em 06/11/2026
  ([relatório](evidencias/roteiro-ifsul-2026-11-06-sem-contas.md)).
- **HTTPS**: a URL atual da API do IFSul usa HTTP; em produção, `IFSUL_AUTH_URL` precisa ser HTTPS
  (a API recusa `http://` sem `IFSUL_AUTH_PERMITIR_HTTP=true`).
