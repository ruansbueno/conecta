# Quickstart: Autenticação, Perfis, Turmas e Avisos (Entrega 1)

Guia para validar a Entrega 1 de ponta a ponta em desenvolvimento, usando o Postgres local via
Docker e o provedor simulado (`MockAuthProvider`). **Tudo o que for validado aqui usa usuários
simulados** — não substitui a validação da integração real com a API de autenticação do IFSul
(`spec.md` §9.4 e a seção "Integração real" abaixo).

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
#   CSRF_SECRET=<outro valor do mesmo jeito, diferente do JWT_SECRET>
# A API não sobe com os valores de exemplo do .env.example.
```

`AUTH_PROVIDER=mock` seleciona o provedor simulado. Para a API real do IFSul: `AUTH_PROVIDER=ifsul`
e `IFSUL_AUTH_URL` (HTTPS; `http://` só com `IFSUL_AUTH_PERMITIR_HTTP=true`, para teste) — nenhuma
outra configuração muda.

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

## 5b. Gestão (E2) — como `coord.teste`

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login -H "Content-Type: application/json" \
  -d '{"username": "coord.teste", "password": "senha-teste"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["access_token"])')
H="Authorization: Bearer $TOKEN"

curl http://localhost:8000/gestao/turmas -H "$H"                      # turmas com totais
curl -X POST http://localhost:8000/gestao/avisos -H "$H" -H "Content-Type: application/json" \
  -d '{"titulo": "Aviso de teste", "conteudo": "Texto.", "destinos": [{"tipo": "todos"}]}'
curl "http://localhost:8000/gestao/avisos?situacao=agendado" -H "$H"   # agendados (RF-34)
curl http://localhost:8000/gestao/avisos/<id>/historico -H "$H"        # criado, editado, …
curl http://localhost:8000/gestao/solicitacoes -H "$H"                 # fila de pendentes
curl -X POST http://localhost:8000/gestao/solicitacoes/<id>/aprovar -H "$H"
```

Esperado: a coordenação vê tudo; `docente.teste` vê só as turmas em que leciona (3A e 5A), publica
apenas para elas (`todos` → 403 `DESTINO_NAO_PERMITIDO`) e decide só as solicitações delas;
`aluno.teste` recebe 403 em qualquer `/gestao/*`. O roteiro completo da `spec.md` §9.3 roda
automatizado em `tests/e2e/test_fluxo_publicar_receber.py`.

## 6. Rodar a suíte automatizada

```bash
pytest tests/contract tests/integration tests/unit                 # mock_auth + demais
pytest -m "not ifsul_real"                                          # explícito: sem integração real
IFSUL_AUTH_URL=… IFSUL_TEST_USERNAME=… IFSUL_TEST_PASSWORD=… pytest -m ifsul_real  # conta real
```
Testes de integração usam banco de teste dedicado (ver `plan.md`, seção Testing). O relatório
separa os grupos `mock_auth` e `ifsul_real`.

## Integração real com a API de autenticação do IFSul (emenda v2.3)

1. Suba a API com o provedor real (em produção, `IFSUL_AUTH_URL` com HTTPS):

   ```bash
   export IFSUL_AUTH_URL=http://200.19.1.19/luissilva/Conecta_API_REST/public/api/v1/autenticacoes
   AUTH_PROVIDER=ifsul IFSUL_AUTH_PERMITIR_HTTP=true uv run uvicorn src.main:app --port 8001
   ```

2. Defina o primeiro administrador pelo login institucional (o `admin.conecta` do seed não existe
   no AD): `uv run python -m scripts.definir_administrador <login>`.
3. Rode o roteiro do item 10 da doc do IFSul; ele pede as contas de aluno e administrativa (senha
   sem eco) e grava o relatório esperado × obtido, sem senha:

   ```bash
   uv run python -m scripts.roteiro_ifsul --conecta http://localhost:8001 \
     --saida evidencias/roteiro-ifsul-$(date +%F).md
   ```

   Sem contas (`--sem-contas`), executa só os casos 4 a 7.
4. O 1º login da conta administrativa vira pedido de acesso: aprove-o pela web (Usuários →
   Aguardando acesso) ou por `POST /gestao/acessos/{id}/aprovar`, e rode o roteiro de novo para o
   caso 2 entrar com o perfil concedido.
5. Marque o checklist de `spec.md` §9.4 com a data e o relatório.
