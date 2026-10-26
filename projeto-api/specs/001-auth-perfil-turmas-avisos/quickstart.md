# Quickstart: Autenticação, Perfis, Turmas e Avisos (Entrega 1)

Guia para validar a Entrega 1 de ponta a ponta em desenvolvimento, usando o Postgres local via
Docker e o `MockMoodleAuthProvider`. **Tudo o que for validado aqui usa usuários simulados** — não
substitui a validação da integração real com o Moodle (`spec.md` §9.4).

## Pré-requisitos

- Docker e Docker Compose instalados.
- Python 3.12 e um gerenciador de dependências (ex.: `uv` ou `pip` + `venv`).
- Repositório `projeto-api` com o código da E1 implementado (`/speckit-implement`).

## 1. Subir o Postgres local

```bash
docker compose up -d --wait db
```

## 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
# .env deve conter, no mínimo:
#   DATABASE_URL=postgresql+asyncpg://conecta:conecta@localhost:5433/conecta_dev
#   AUTH_PROVIDER=mock
#   JWT_SECRET=<ao menos 32 bytes; gere com:
#     python -c 'import secrets; print(secrets.token_urlsafe(48))'>
# A API não sobe com o valor de exemplo do .env.example.
```

`AUTH_PROVIDER=mock` seleciona o `MockMoodleAuthProvider`. Para o Moodle real: `AUTH_PROVIDER=moodle`
e as variáveis `MOODLE_*` — nenhuma outra configuração muda (ver `research.md`).

## 3. Aplicar migrações e seed

```bash
uv run alembic upgrade head
uv run python -m scripts.seed_dev_data
```

O seed cria: usuários de teste (`admin.teste`, `coord.teste`, `docente.teste`, `aluno.teste`,
`aluno2.teste`, `aluno3.teste`, `aluno.sem.turma`) com os perfis correspondentes; turmas A, B, C
(3º semestre) e D (5º); vínculos; uma solicitação pendente; e avisos de exemplo (`todos`, aviso
para as turmas A+B+C, `semestre` 3, `docentes`, agendado, arquivado, excluído).

## 4. Subir a API

```bash
uv run uvicorn src.main:app --reload
```

## 5. Validar os fluxos principais

**Login (US1)**
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "aluno.teste", "password": "senha-teste"}'
```
Esperado: `200` com `access_token` e `usuario.perfil = "aluno"`. Com senha errada: `401` e
`{"detail": "...", "code": "CREDENCIAIS_INVALIDAS"}`.

**Perfil (US2)**
```bash
curl http://localhost:8000/me -H "Authorization: Bearer <access_token>"
```
Esperado: `200` com os dados de `aluno.teste` e a lista `turmas`.

**Turmas e solicitação de inscrição (US3)** — como `aluno.sem.turma`
```bash
curl http://localhost:8000/turmas/disponiveis -H "Authorization: Bearer <token>"
curl -X POST http://localhost:8000/turmas/<turma_id>/solicitacoes -H "Authorization: Bearer <token>"
curl http://localhost:8000/solicitacoes/minhas -H "Authorization: Bearer <token>"
```
Esperado: `201` com `status: "pendente"`; a turma deixa de aparecer em "disponíveis"; **não** aparece
em "minhas turmas" até a aprovação. Na E1 a aprovação é aplicada pelo seed/serviço
(`uv run python -m scripts.aprovar_solicitacao <id>`); na E2 será pelo endpoint de gestão.

**Avisos (US4)**
```bash
curl "http://localhost:8000/avisos?limit=20" -H "Authorization: Bearer <token>"
curl "http://localhost:8000/avisos?situacao=arquivado" -H "Authorization: Bearer <token>"
```
Esperado: o usuário vê somente avisos que o alcançam por algum destino, sem duplicatas, já
publicados. Compare `aluno.teste` (turma A), `aluno3.teste` (turma C) e `aluno.sem.turma`.

## 6. Rodar a suíte automatizada

```bash
pytest tests/contract tests/integration tests/unit                 # mock_auth + demais
pytest -m "not moodle_real"                                         # explícito: sem integração real
pytest -m moodle_real                                               # só quando houver acesso ao Moodle
```
Testes de integração usam banco de teste dedicado (ver `plan.md`, seção Testing). O relatório
separa os grupos `mock_auth` e `moodle_real`.

## Troca futura para o Moodle real

Quando houver acesso à API do Moodle: implementar `MoodleAuthProvider`
(`src/providers/auth/moodle.py`), configurar `MOODLE_*`, definir `AUTH_PROVIDER=moodle` e executar
o checklist de `spec.md` §9.4. Nenhuma rota, service ou contrato muda.
