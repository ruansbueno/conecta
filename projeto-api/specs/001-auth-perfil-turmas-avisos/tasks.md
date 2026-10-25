# Tasks: Autenticação, Perfis, Turmas e Avisos — Entrega 1 (API + aplicativo)

**Input**: Design documents from `/specs/001-auth-perfil-turmas-avisos/`

**Prerequisites**: plan.md, spec.md (v2), research.md, data-model.md, contracts/api.md, quickstart.md

**Escopo**: somente a **Entrega 1** (endpoints das seções 1–9 de `contracts/api.md`). Os endpoints
`/gestao/*` (E2) e agenda/horários (E3) terão tarefas próprias, geradas após a validação da E1.
Na E1, perfis, turmas, vínculos, solicitações decididas e avisos entram por **seed**.

**Tests**: Incluídas. Testes que dependem do provedor simulado levam `@pytest.mark.mock_auth`;
a integração real com o Moodle usa `@pytest.mark.moodle_real` (ver `spec.md` seção 9).

**Organization**: Tarefas agrupadas por user story (US1–US4, P1→P4), com teste independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência incompleta)
- **[Story]**: user story (US1–US4)
- Requisitos entre parênteses (RF-xx) indicam a rastreabilidade da `spec.md`

## Path Conventions

Projeto único (web-service), conforme `plan.md`: `src/`, `tests/`, `alembic/` na raiz de `projeto-api/`.

---

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Criar a árvore de diretórios conforme `plan.md`:
      `src/{core,db,models,schemas,providers/auth,repositories,services,api/routes}`,
      `tests/{contract,integration,unit}`, `alembic/versions`, com `__init__.py` nos pacotes
- [x] T002 Criar `pyproject.toml` com `fastapi`, `uvicorn[standard]`, `sqlalchemy>=2.0`, `alembic`,
      `asyncpg`, `pydantic-settings`, `pyjwt` e, para testes, `pytest`, `pytest-asyncio`, `httpx`
- [x] T003 [P] Configurar lint/format (ruff) em `pyproject.toml`
- [x] T004 [P] Criar `docker-compose.yml` (serviço `db` Postgres, só para desenvolvimento) e
      `.env.example` com `DATABASE_URL`, `AUTH_PROVIDER`, `JWT_SECRET`
- [x] T005 [P] Criar `Dockerfile` da aplicação (mesma imagem para dev/staging/produção)
- [x] T006 [P] Registrar em `pyproject.toml` os marcadores pytest `mock_auth` e `moodle_real`, e
      configurar `moodle_real` para ser ignorado quando `MOODLE_*` não estiver definido (RF-02; `spec.md` §9.1)

**Checkpoint**: estrutura, dependências e marcadores prontos.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: nenhuma user story começa antes desta fase.

- [x] T007 `src/core/config.py`: `Settings` (pydantic-settings) com `DATABASE_URL`,
      `AUTH_PROVIDER` (`mock|moodle`), `JWT_SECRET`, `JWT_EXPIRES_SECONDS` (padrão 86400)
- [x] T008 `src/db/session.py`: engine assíncrono e `async_sessionmaker` a partir de `DATABASE_URL` (dep. T007)
- [x] T009 `src/db/base.py`: `Base` declarativa e import central dos models para o Alembic
- [x] T010 [P] Inicializar Alembic (`alembic/env.py`) lendo `DATABASE_URL` do mesmo `Settings` (dep. T007, T009)
- [x] T011 [P] `src/providers/auth/base.py`: interface `AuthProvider`
      (`authenticate(username, password) -> AuthenticatedUser | None`) e `AuthenticatedUser`
      com **apenas `username` e `nome`** — o provedor não informa perfil (RF-02, RF-08)
- [x] T012 [P] `src/providers/auth/mock_moodle.py`: `MockMoodleAuthProvider` com usuários de teste
      (username, senha, nome) para os papéis `aluno`, `docente`, `coordenacao` e `administrador`;
      os perfis de teste são aplicados pelo seed no banco (RF-03) (dep. T011)
- [x] T013 [P] `src/providers/auth/moodle.py`: `MoodleAuthProvider` stub (`NotImplementedError`
      explicativo) (dep. T011)
- [x] T014 `src/core/security.py`: emissão de JWT (`sub`, `perfil` informativo, `exp` = 24 h) e
      validação de assinatura/expiração (dep. T007)
- [x] T015 `src/models/usuario.py`: `Usuario` — `id`, `username` (único), `nome`, `perfil` (enum
      `administrador|coordenacao|docente|aluno`, padrão `aluno`), `ativo` (padrão `true`),
      `criado_em`, `atualizado_em`, `ultimo_login_em` (`data-model.md`) (dep. T009)
- [x] T016 Gerar migração Alembic para `usuario` (dep. T010, T015)
- [x] T017 `src/api/errors.py`: exceções de domínio com `code` e handlers que produzem
      `{detail, code}`; handler de `RequestValidationError` → 422 `VALIDATION_ERROR` com `errors[]`
      (RF-05, RF-29; catálogo em `contracts/api.md`)
- [x] T018 [P] `src/schemas/common.py`: `Page[T]` (`items`, `total`, `limit`, `offset`) e
      dependência `PaginationParams` (`limit` 1–100 padrão 20; `offset` ≥ 0) (RF-29)
- [x] T019 `src/core/security.py` (continuação): dependência `get_current_user` que valida o token,
      **recarrega o `Usuario` do banco** e usa o perfil e o `ativo` do banco (401 `NAO_AUTENTICADO`;
      403 `USUARIO_INATIVO`) e `require_perfil(*perfis)` (403 `SEM_PERMISSAO`) (RF-04, RF-05, RF-07, RF-10)
      (dep. T014, T015, T017)
- [x] T020 `src/main.py`: instância FastAPI, registro dos handlers de T017 e ponto de registro de routers (dep. T017)

**Checkpoint**: fundação pronta.

---

## Phase 3: User Story 1 - Login e obtenção de acesso (Priority: P1) 🎯 MVP

**Goal**: usuário informa credenciais e recebe token com o perfil armazenado no CONECTA.

**Independent Test**: `POST /auth/login` com usuário do mock → 200; senha errada → 401.

### Tests for User Story 1 ⚠️ (escrever primeiro; devem falhar)

- [x] T021 [P] [US1] Contract test `POST /auth/login` (200, 401 `CREDENCIAIS_INVALIDAS`, 403
      `USUARIO_INATIVO`, 422) em `tests/contract/test_auth_login.py` `@mock_auth` (RF-01, RF-05, RF-07)
- [x] T022 [P] [US1] Integration test: primeiro login cria usuário `aluno`; novo login atualiza só
      `nome`/`ultimo_login_em` e **não** altera o perfil, em `tests/integration/test_primeiro_login_aluno.py` `@mock_auth` (RF-08)
- [x] T023 [P] [US1] Integration test: provedor indisponível/erro → mesma resposta 401 genérica, em
      `tests/integration/test_login_provider_indisponivel.py` (RF-06)
- [x] T024 [P] [US1] Integration test: usuário desativado não faz login e tem token existente
      rejeitado (403), em `tests/integration/test_usuario_inativo.py` `@mock_auth` (RF-07)

### Implementation for User Story 1

- [x] T025 [P] [US1] `src/schemas/auth.py`: `LoginRequest` (validações do contrato) e `LoginResponse`
- [x] T026 [US1] `src/repositories/usuario_repository.py`: `upsert_from_provider(username, nome)`
      (cria como `aluno`; se existe, atualiza `nome` e `ultimo_login_em`; nunca o perfil), `get_by_id`,
      `get_by_username` (dep. T015)
- [x] T027 [US1] `src/services/auth_service.py`: `login` — chama o `AuthProvider` injetado
      (selecionado por `Settings.AUTH_PROVIDER`), trata falha do provedor como `CREDENCIAIS_INVALIDAS`,
      verifica `ativo`, faz upsert e emite JWT (RF-01, RF-04, RF-06) (dep. T012, T013, T014, T026)
- [x] T028 [US1] `src/api/routes/auth.py`: `POST /auth/login`, devolvendo o token no corpo **e**
      os cookies `conecta_sessao` (`HttpOnly`, `Secure`, `SameSite=Strict`, 24 h) e `conecta_csrf`
      (legível) (RF-32) (dep. T025, T027)
- [x] T028a [US1] `src/core/security.py` (continuação): aceitar autenticação por cookie de sessão
      além do cabeçalho `Bearer`, com o mesmo resultado em `get_current_user` (RF-32) (dep. T019)
- [x] T028b [US1] `src/api/deps/csrf.py`: dependência que exige `X-CSRF-Token` igual ao cookie
      `conecta_csrf` em `POST`, `PATCH` e `DELETE` autenticados por cookie; 403 `CSRF_INVALIDO` em
      ausência ou divergência; nenhuma exigência com `Bearer` (RF-33) (dep. T028a)
- [x] T028c [US1] `src/api/routes/auth.py`: `DELETE /auth/sessao`, invalidando os dois cookies com
      `Max-Age=0` (RF-33) (dep. T028, T028b)
- [x] T028d [P] [US1] Contract test da sessão por cookie em `tests/contract/test_auth_cookie.py`
      `@mock_auth`: atributos dos cookies, acesso a rota protegida só com cookie, escrita sem
      `X-CSRF-Token` → 403 `CSRF_INVALIDO`, escrita com `Bearer` sem CSRF → sucesso, e
      `DELETE /auth/sessao` encerrando a sessão (RF-32, RF-33)
- [x] T029 [US1] Registrar o router de auth em `src/main.py` (dep. T020, T028)
- [x] T030 [US1] `scripts/seed_dev_data.py`: cria os usuários de teste do mock no banco com os
      perfis `administrador`, `coordenacao`, `docente` e `aluno`, mais o administrador de
      implantação `admin.conecta`; todos os dados são fictícios (dep. T012, T026)

**Checkpoint**: login funcional e testável isoladamente.

---

## Phase 4: User Story 2 - Consulta do próprio perfil (Priority: P2)

**Goal**: usuário autenticado consulta seus dados, incluindo turmas e papel.

**Independent Test**: login → `GET /me` retorna o usuário logado; sem token → 401.

### Tests for User Story 2 ⚠️

- [x] T031 [P] [US2] Contract test `GET /me` (200 com `turmas`, 401, 403 `USUARIO_INATIVO`) em
      `tests/contract/test_me.py` `@mock_auth` (RF-11)
- [x] T032 [P] [US2] Integration test: alterar o perfil no banco muda a resposta/autorização da
      requisição seguinte, sem novo login, em `tests/integration/test_perfil_efeito_imediato.py` (RF-04)

### Implementation for User Story 2

- [x] T033 [P] [US2] `src/schemas/usuario.py`: `UsuarioOut` e `MeOut` (com `turmas[]`)
- [x] T034 [US2] `src/api/routes/me.py`: `GET /me` com `get_current_user`; lista `turmas` via repositório de vínculos quando disponível (dep. T019, T033)
- [x] T035 [US2] Registrar o router de `me` em `src/main.py` (dep. T020, T034)

**Checkpoint**: Login + Perfil.

---

## Phase 5: User Story 3 - Turmas e solicitação de inscrição (Priority: P3)

**Goal**: aluno lista turmas disponíveis, solicita inscrição e acompanha o status; usuários
vinculados listam suas turmas. (Aprovação/recusa é E2: no teste e no seed, a decisão é aplicada
direto no banco/serviço.)

**Independent Test**: listar disponíveis → solicitar → ver `pendente`; aplicar aprovação via
serviço/seed → turma em "minhas turmas".

### Tests for User Story 3 ⚠️

- [x] T036 [P] [US3] Contract test `GET /turmas/disponiveis` (200, 403 para não aluno, paginação) em `tests/contract/test_turmas_disponiveis.py` (RF-12)
- [x] T037 [P] [US3] Contract test `POST /turmas/{id}/solicitacoes` (201, 403, 404 `TURMA_INDISPONIVEL`, 409 `JA_VINCULADO`, 409 `SOLICITACAO_DUPLICADA`, 422) em `tests/contract/test_solicitacoes.py` (RF-13, RF-14)
- [x] T038 [P] [US3] Contract test `GET /turmas/minhas` em `tests/contract/test_turmas_minhas.py` (RF-16)
- [x] T039 [P] [US3] Contract test `GET /solicitacoes/minhas` e `DELETE /solicitacoes/{id}` (204, 404, 409 `SOLICITACAO_NAO_PENDENTE`) em `tests/contract/test_solicitacoes_minhas.py` (RF-15)
- [x] T040 [P] [US3] Integration test do fluxo disponíveis → solicitar → (aprovação aplicada pelo serviço) → minhas turmas, em `tests/integration/test_turmas_flow.py`
- [x] T041 [P] [US3] Integration test: solicitação duplicada, solicitação após recusa/cancelamento permitida, turma sai de "disponíveis" enquanto há pendente, em `tests/integration/test_solicitacao_duplicada.py` (RF-14)

### Implementation for User Story 3

- [x] T042 [P] [US3] `src/models/turma.py`: `Turma` (`codigo` único, `nome`, `semestre_curso` 1–12, `periodo_letivo`, `inscricoes_abertas`, `ativa`, timestamps) (dep. T009)
- [x] T043 [P] [US3] `src/models/vinculo_turma.py`: `VinculoTurma` (`papel`, `origem`, `criado_por`; único `turma_id`+`usuario_id`) (dep. T009, T015)
- [x] T044 [P] [US3] `src/models/solicitacao_inscricao.py`: `SolicitacaoInscricao` (`status`, decisão; índice único parcial por pendente) (dep. T009, T015, T042)
- [x] T045 [US3] Gerar migração Alembic para `turma`, `vinculo_turma` e `solicitacao_inscricao`, com as constraints de `data-model.md` (dep. T010, T042, T043, T044)
- [x] T046 [P] [US3] `src/schemas/turma.py`: `TurmaOut`, `TurmaMinhaOut` (com `papel`), `SolicitacaoOut`, `SolicitacaoMinhaOut`
- [x] T047 [US3] `src/repositories/turma_repository.py`: `list_disponiveis(aluno_id)` (ativa + abertas, sem vínculo e sem pendente), `list_minhas(usuario_id)`, `get_by_id` (dep. T042, T043, T044)
- [x] T048 [US3] `src/repositories/solicitacao_repository.py`: `create`, `get`, `list_by_aluno(status)`, `cancel`, `exists_pendente`, e `approve`/`refuse` (usados por seed/testes na E1 e pelos endpoints da E2) — `approve` cria o vínculo na mesma transação (dep. T043, T044)
- [x] T049 [US3] `src/services/turma_service.py`: `listar_disponiveis`, `listar_minhas`, `solicitar` (404 `TURMA_INDISPONIVEL`, 409 `JA_VINCULADO`, 409 `SOLICITACAO_DUPLICADA`), `listar_solicitacoes`, `cancelar` (dep. T047, T048)
- [x] T050 [US3] `src/api/routes/turmas.py` e `src/api/routes/solicitacoes.py`: endpoints das seções 3–7 do contrato, com `require_perfil("aluno")` onde aplicável (dep. T046, T049)
- [x] T051 [US3] Registrar os routers em `src/main.py` e completar `GET /me` com `turmas[]` (dep. T020, T050)
- [x] T052 [US3] Seed: turmas A, B, C (3º semestre) e D (5º), algumas com inscrições abertas; vínculos de aluno e docente; uma solicitação pendente; e `scripts/aprovar_solicitacao.py <id>`, que aplica a aprovação via `solicitacao_repository.approve` enquanto o endpoint de gestão (E2) não existe (dep. T030, T042, T043, T048)

**Checkpoint**: Login + Perfil + Turmas.

---

## Phase 6: User Story 4 - Consulta de avisos (Priority: P4)

**Goal**: usuário vê exatamente os avisos que o alcançam por algum destino, respeitando agendamento e situação.

**Independent Test**: com avisos de seed (`todos`, 3 turmas, `semestre`, `docentes`, agendado, arquivado, excluído), cada usuário vê somente o que lhe cabe.

### Tests for User Story 4 ⚠️

- [ ] T053 [P] [US4] Contract test `GET /avisos` e `GET /avisos/{id}` (200, 404 `AVISO_NAO_ENCONTRADO`, filtros `situacao`/`turma_id`, paginação, 422) em `tests/contract/test_avisos.py` (RF-20, RF-23, RF-29)
- [ ] T054 [P] [US4] Integration test das regras de visibilidade — `todos`; aviso com 3 turmas (visto uma única vez por quem está em 1, 2 ou 3 delas; não visto por quem está só na D); `semestre`; `docentes`; agendado futuro/ao chegar a data; arquivado (só na lista de arquivados); excluído (nunca); coordenação/administração veem só `todos`; turma desativada suspende entrega; vínculo removido corta acesso — em `tests/integration/test_avisos_visibilidade.py` (RF-21, RF-22, RF-23)
- [ ] T055 [P] [US4] Contract test da matriz de permissões da E1 (aluno em rotas de turma/solicitação de aluno; não-aluno recebe 403) em `tests/contract/test_permissoes_matriz.py` (RF-10)

### Implementation for User Story 4

- [ ] T056 [P] [US4] `src/models/aviso.py`: `Aviso` (`autor_id`, `situacao`, `publicar_em`, `versao_atual`, `editado_em`, `arquivado_em`, `excluido_em`, `criado_em`) e `AvisoDestino` (`tipo`, `turma_id`, `semestre`; `CHECK` de consistência e unicidade) (dep. T009, T015, T042)
- [ ] T057 [US4] Gerar migração Alembic para `aviso` e `aviso_destino` (dep. T010, T056)
- [ ] T058 [P] [US4] `src/schemas/aviso.py`: `AvisoOut` (com `autor`, `destinos[]`, `publicado_em`, `editado_em`) e `DestinoOut`
- [ ] T059 [US4] `src/repositories/aviso_repository.py`: `listar_para_usuario(usuario, situacao, turma_id, page)` e `get_para_usuario(usuario, aviso_id)` — regra de visibilidade de `data-model.md` com `EXISTS` sobre destinos, `DISTINCT`, ordenação por `publicado_em` desc (dep. T043, T056)
- [ ] T060 [US4] `src/services/aviso_service.py`: encapsula o repositório (dep. T059)
- [ ] T061 [US4] `src/api/routes/avisos.py`: `GET /avisos` e `GET /avisos/{aviso_id}` (dep. T058, T060)
- [ ] T062 [US4] Registrar o router de avisos em `src/main.py` (dep. T020, T061)
- [ ] T063 [US4] Seed de avisos de teste cobrindo todos os casos do T054, incluindo um aviso com 3 turmas (dep. T052, T056)

**Checkpoint**: Todas as 4 user stories da E1 funcionam isoladamente e juntas.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T064 [P] Unit tests da suíte de contrato do `AuthProvider`, parametrizada para os dois provedores (mock: sucesso/credencial inválida/`@mock_auth`; Moodle: `@moodle_real`, ignorada sem credenciais) em `tests/unit/test_auth_provider.py` (RF-01, RF-02)
- [ ] T065 [P] Unit tests de emissão/validação de JWT (expiração, assinatura inválida, claims) em `tests/unit/test_security.py` (RF-04)
- [ ] T066 [P] Contract tests do formato de erro `{detail, code}` e do 422 com `errors[]`, e da paginação (`limit`, `offset`, `total`) em `tests/contract/test_erro_padrao.py` e `tests/contract/test_paginacao.py` (RF-29)
- [ ] T067 Revisar 401 vs 403 em todas as rotas protegidas (Princípio III)
- [ ] T068 [P] `README.md` com setup local referenciando `quickstart.md` e a estratégia de testes mock × real
- [ ] T069 Configurar o relatório de testes para listar separadamente os grupos `mock_auth` e `moodle_real` (`spec.md` §9.1) e arquivar a saída como evidência (O14)
- [ ] T070 Executar a validação manual completa de `quickstart.md`
- [ ] T071 Revisão de segurança: nenhuma senha logada, serializada ou persistida (Princípio II); perfil nunca alterado pelo login
- [ ] T072 Preencher o checklist de validação da integração real (`spec.md` §9.4) quando houver acesso ao Moodle (tarefa pendente de dependência externa; não bloqueia o fim da E1)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **User Stories (Phases 3–6)** → **Polish (Phase 7)**
- US1 (P1): depende só da Fundação.
- US2 (P2): depende da Fundação; a lista `turmas[]` de `/me` é completada em T051 (US3).
- US3 (P3): depende da Fundação (`Usuario` como FK).
- US4 (P4): depende da Fundação e dos models de US3 (`Turma` T042, `VinculoTurma` T043) para destinos e visibilidade.

### Within Each User Story

- Testes escritos e falhando antes da implementação; models → repositories → services → rotas → registro do router.

### Parallel Opportunities

- Tarefas [P] da Fase 1; T010–T013 e T017/T018 da Fase 2.
- Após a Fase 2: US1, US2 e US3 em paralelo; US4 inicia após T042 e T043.
- Testes [P] e models [P] de cada story entre si.

---

## Implementation Strategy

1. Setup + Foundational → fundação.
2. US1 (Login) → validar com o mock → demonstrar (MVP mínimo).
3. US2 → US3 → US4, validando cada checkpoint.
4. Polish e evidências de teste (T069), antes de iniciar a especificação detalhada de implementação da E2.

Após a E1: executar `/speckit-plan` e `/speckit-tasks` para a E2 (`/gestao/*`, plataforma web e
teste de ponta a ponta da `spec.md` §9.3) e, depois, para a E3.

## Notes

- Verificar que os testes falham antes de implementar.
- Commit por tarefa ou grupo lógico.
- A troca futura mock → Moodle é trabalho à parte: implementar o corpo do stub (T013) e usar `AUTH_PROVIDER=moodle`; validar com o checklist (T072).
