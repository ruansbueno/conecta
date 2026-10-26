# Tasks: Aplicativo CONECTA — Fase F1

**Input**: Design documents from `/specs/001-app-conecta/`

**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/consumo-api.md, quickstart.md

**Escopo**: somente a **fase F1** (telas T01–T09 e T14, endpoints das seções 1–9 do contrato da
API). Agenda, visão de mês, evento e horários (F2) terão tarefas próprias, geradas quando a spec
E3 da API existir.

**Tests**: incluídos. Unidade e widget com `MockClient`; integração com servidor HTTP falso em
memória. Nenhum teste depende da API real.

**Organization**: tarefas agrupadas por user story (US1–US5), cada uma testável de forma
independente.

## Format: `[ID] [P?] [Story] Descrição`

- **[P]**: pode ser feita em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1–US5)
- Requisitos entre parênteses (RM-xx) indicam a rastreabilidade

## Path Conventions

Projeto Flutter único, conforme `plan.md`: `lib/`, `test/`, `integration_test/` na raiz de
`projeto-mobile/`.

---

## Phase 1: Setup

- [x] T001 Criar o projeto Flutter na raiz de `projeto-mobile/` (`flutter create .`, org
      `br.ifsul.conecta`, plataformas android e ios), preservando `specs/` e `.specify/`
- [x] T002 Criar a árvore de `lib/` conforme `plan.md`: `config/`, `theme/`, `models/`,
      `services/`, `repositories/`, `state/`, `ui/{login,casca,avisos,turmas,solicitacoes,perfil,comum}`
- [x] T003 Declarar em `pubspec.yaml` as dependências de produção `provider`, `http`,
      `flutter_secure_storage`, `shared_preferences`, `intl` e, em `dev_dependencies`,
      `flutter_test`, `integration_test`, `mocktail`
- [x] T004 [P] Configurar `analysis_options.yaml` com `flutter_lints` e a regra que proíbe literal
      de cor fora de `lib/theme/` (Princípio V)
- [x] T005 [P] Criar `lib/config/ambiente.dart` lendo `API_BASE_URL` por `String.fromEnvironment`,
      com padrão `http://localhost:8000` (D12)
- [x] T006 [P] Liberar HTTP em claro apenas para `localhost` e `10.0.2.2` na configuração de rede
      do Android, mantendo HTTPS obrigatório nos demais hosts
- [x] T007 [P] Adicionar a fonte Inter (pesos 400–800) em `assets/fonts/` e declará-la no
      `pubspec.yaml`

**Checkpoint**: `flutter run` abre um app vazio apontando para a API local.

---

## Phase 2: Foundational (bloqueia todas as user stories)

**⚠️ CRÍTICO**: nenhuma user story começa antes desta fase.

- [x] T008 `lib/theme/cores.dart`: transcrever os tokens de `design/README.md` como constantes
      nomeadas (RM-33)
- [x] T009 [P] `lib/theme/tipografia.dart`: escala Inter (11 a 26) com os pesos e a entreletra
      usados nas telas
- [x] T010 `lib/theme/tema.dart`: `ThemeData` do app a partir de T008 e T009, com alvo mínimo de
      toque de 48 dp nos componentes interativos (RM-34)
- [x] T011 [P] `lib/models/`: `Destino`, `Turma`/`TurmaVinculada`, `Usuario`, `Solicitacao`,
      `Aviso`, `Pagina<T>` com `fromJson`, igualdade por valor e os enums de `data-model.md`
- [x] T012 [P] `test/unit/models_test.dart`: conversão a partir dos exemplos de JSON do contrato,
      incluindo campo nulo, enum desconhecido e destino de tipo novo (data-model.md)
- [x] T013 `lib/services/api_failure.dart`: `ApiFailure` (code, status, detail, errors) e o mapa
      único `code → (mensagem, efeito)` da seção 6 da spec, com fallback genérico (RM-06, RM-38)
- [x] T014 `lib/services/api_client.dart`: `http.Client` injetado, cabeçalhos, token, timeout de
      15 s, decodificação, conversão de erro em `ApiFailure` e notificação de sessão inválida no
      `401` (RM-03, RM-04, D3, D6)
- [x] T015 [P] `test/unit/api_client_test.dart`: sucesso, erro com `code`, corpo inesperado,
      timeout, ausência de rede e emissão única do evento de sessão inválida
- [x] T016 [P] `lib/services/cofre_sessao.dart`: gravar, ler e apagar token em
      `flutter_secure_storage` (RM-01, RM-02)
- [x] T017 [P] `lib/services/cache_local.dart`: escrever e ler `cache:{usuarioId}:{recurso}` com
      `coletado_em`, informar a idade do dado e apagar tudo de um usuário (RM-28 a RM-31)
- [x] T018 [P] `test/unit/cache_local_test.dart`: gravação só após sucesso, idade do dado,
      isolamento entre usuários e limpeza no logout
- [x] T019 `lib/state/session_controller.dart`: usuário corrente, login, logout, reação ao evento
      de `401` e a `403 USUARIO_INATIVO`, com encerramento único (RM-04, RM-05, RM-10)
- [ ] T020 `lib/config/rotas.dart` + `lib/main.dart`: providers raiz, tema, tabela de rotas e
      decisão inicial (token ausente → `/login`; presente → valida com `GET /me`) (RM-07)
- [x] T021 [P] `lib/ui/comum/`: `EstadoVazio`, `EstadoErro` (com repetir), `EsqueletoLista`,
      `FaixaCache`, `ChipDestino`, `SeloSituacao` — todos a partir do tema (RM-32, RM-33)
- [x] T022 [P] `test/widget/comum_test.dart`: cada componente comum renderiza, respeita o alvo de
      48 dp e expõe rótulo semântico (RM-34, RM-35)
- [x] T023 [P] `test/fixtures/`: respostas JSON copiadas dos exemplos de `contracts/api.md`
      (login, me, avisos, turmas, solicitações) e os corpos de erro de cada `code` tratado
- [x] T024 [P] `integration_test/servidor_falso.dart`: `HttpServer` em memória que responde pelas
      fixtures, com gatilhos para forçar `401`, `409`, lentidão e queda (D9)

**Checkpoint**: tema, modelos, rede, sessão e componentes comuns prontos e testados.

---

## Phase 3: US1 — Entrar no aplicativo (P1)

**Objetivo**: autenticar, guardar a sessão com segurança e reagir a token inválido.

**Teste independente**: entrar com credenciais válidas e inválidas; forçar `401` no servidor falso
e confirmar a volta ao login.

- [x] T025 [US1] `lib/repositories/auth_repository.dart`: `login(username, password)` e `me()`
      sobre o `ApiClient` (contrato §1 e §2)
- [x] T026 [P] [US1] `test/unit/auth_repository_test.dart`: 200, `CREDENCIAIS_INVALIDAS`,
      `USUARIO_INATIVO`, `VALIDATION_ERROR` e falha de rede
- [ ] T027 [US1] `lib/ui/login/login_page.dart`: campos de usuário e senha, validação local,
      estado de envio, erro acima do botão e limpeza da senha a cada falha (RM-01, US1 cenários 2–5)
- [ ] T028 [US1] Ligar `SessionController` ao login: gravar token no cofre, carregar o usuário e
      navegar para a casca de abas (RM-01, RM-03)
- [ ] T029 [US1] `lib/ui/casca/casca_abas.dart`: barra de cinco abas com `IndexedStack`, abas de
      F2 ocultas nesta fase (seção 3 da spec)
- [ ] T030 [P] [US1] `test/widget/login_test.dart`: campo vazio, credencial inválida, usuário
      inativo, sem rede e sucesso
- [ ] T031 [P] [US1] `integration_test/sessao_test.dart`: abertura com token válido, abertura com
      token inválido, `401` no meio da navegação e logout limpando token e cache (RM-04, RM-30)

**Checkpoint**: entrar, permanecer e sair funcionam de ponta a ponta.

---

## Phase 4: US2 — Ler os avisos (P2)

**Objetivo**: listar, paginar, recarregar, abrir o detalhe e abrir sem rede.

**Teste independente**: com as fixtures de avisos, percorrer lista, paginação, vazio, detalhe e
modo offline.

- [ ] T032 [US2] `lib/repositories/avisos_repository.dart`: `listar(situacao, limit, offset)` e
      `obter(id)`, com gravação em cache apenas da primeira página de ativos (contrato §3 e §4)
- [ ] T033 [P] [US2] `test/unit/avisos_repository_test.dart`: paginação, `situacao=arquivado`,
      `AVISO_NAO_ENCONTRADO`, uso de cache sem rede
- [ ] T034 [US2] `lib/state/avisos_controller.dart`: estado da lista (carregando, conteúdo, vazio,
      erro), `temMais`, carregar mais e recarregar (RM-11, RM-14, RM-15, RM-32)
- [ ] T035 [US2] `lib/ui/avisos/aviso_card.dart`: autor, iniciais, data relativa, marca de
      editado, título, trecho e chips de destino (RM-16, data-model.md)
- [ ] T036 [US2] `lib/ui/avisos/lista_page.dart`: alternância ativos/arquivados, puxar para
      recarregar, rolagem infinita, estado vazio com atalho para turmas (só `aluno`) e faixa de
      cache (RM-11, RM-12, RM-29)
- [ ] T037 [US2] `lib/ui/avisos/detalhe_page.dart`: abre com o dado da lista, revalida por
      `GET /avisos/{id}`, trata `404` voltando e recarregando (RM-13, RM-17)
- [ ] T038 [P] [US2] `test/widget/avisos_lista_test.dart`: os quatro estados, aviso com vários
      destinos aparecendo uma vez, marca de editado e carregamento da segunda página
- [ ] T039 [P] [US2] `test/widget/aviso_detalhe_test.dart`: conteúdo completo, linha de edição e
      caminho do `404`
- [ ] T040 [P] [US2] `integration_test/avisos_test.dart`: primeira carga, paginação, recarga e
      abertura offline com faixa de data (RM-28, RM-29)

**Checkpoint**: a aba Avisos está completa, inclusive sem rede.

---

## Phase 5: US3 — Acompanhar minhas turmas (P3)

- [ ] T041 [US3] `lib/repositories/turmas_repository.dart`: `minhas()` e `disponiveis()`, com
      cache apenas de `minhas` (contrato §5 e §6)
- [ ] T042 [P] [US3] `test/unit/turmas_repository_test.dart`: lista vazia, `SEM_PERMISSAO` em
      disponíveis, cache de minhas
- [ ] T043 [US3] `lib/state/turmas_controller.dart`: minhas turmas, disponíveis e recarga cruzada
      após solicitação ou cancelamento (RM-18, RM-19)
- [ ] T044 [US3] `lib/ui/turmas/turma_card.dart`: sigla em duas linhas, nome, semestre e selo de
      papel (data-model.md)
- [ ] T045 [US3] `lib/ui/turmas/minhas_page.dart`: lista, estado vazio por perfil, cartão de
      "entrar em outra turma" (só `aluno`) e as três solicitações mais recentes (RM-18, RM-20)
- [ ] T046 [US3] `lib/ui/turmas/disponiveis_page.dart`: lista, botão Solicitar, marca de
      "Solicitada" e tratamento de `403` (RM-19, RM-20)
- [ ] T047 [P] [US3] `test/widget/turmas_test.dart`: aluno com vínculos, coordenação sem vínculo,
      estado vazio e ausência do atalho para não-alunos

**Checkpoint**: a aba Turmas reflete corretamente cada perfil.

---

## Phase 6: US4 — Solicitar inscrição (P4)

- [ ] T048 [US4] `lib/repositories/solicitacoes_repository.dart`: `criar(turmaId)`, `minhas()` e
      `cancelar(id)` (contrato §7, §8 e §9)
- [ ] T049 [P] [US4] `test/unit/solicitacoes_repository_test.dart`: 201, `JA_VINCULADO`,
      `SOLICITACAO_DUPLICADA`, `TURMA_INDISPONIVEL`, `SOLICITACAO_NAO_PENDENTE`, 204
- [ ] T050 [US4] `lib/state/solicitacoes_controller.dart`: criar, listar, cancelar e disparar
      recarga das turmas afetadas (RM-21, RM-22, RM-23)
- [ ] T051 [US4] `lib/ui/solicitacoes/folha_confirmacao.dart`: folha inferior com confirmação,
      explicação da aprovação e dois caminhos de saída (T08)
- [ ] T052 [US4] `lib/ui/solicitacoes/lista_page.dart`: itens com status, datas, motivo de recusa
      e cancelamento com diálogo de confirmação (RM-21, RM-22)
- [ ] T053 [P] [US4] `test/widget/solicitacoes_test.dart`: os quatro status, cancelamento
      confirmado e recusado pelo usuário, e cada mensagem de `409`/`404`
- [ ] T054 [P] [US4] `integration_test/solicitacao_fluxo_test.dart`: solicitar → ver pendente →
      cancelar → turma volta a disponíveis; e solicitar duas vezes a mesma turma

**Checkpoint**: o ciclo de solicitação funciona de ponta a ponta.

---

## Phase 7: US5 — Perfil (P5)

- [ ] T055 [US5] `lib/ui/perfil/perfil_page.dart`: avatar, nome, usuário, selo de perfil, curso,
      período, vínculos, nota sobre quem define o perfil e sair (RM-08, RM-10)
- [ ] T056 [US5] Recarregar `GET /me` ao abrir a aba e ao voltar do segundo plano, ajustando os
      controles dependentes de perfil (RM-09)
- [ ] T057 [P] [US5] `test/widget/perfil_test.dart`: aluno com vínculos, coordenação sem vínculo,
      mudança de perfil entre duas cargas e confirmação de saída
- [ ] T058 [P] [US5] `integration_test/perfil_atualizado_test.dart`: perfil alterado no servidor
      falso passa a valer na mesma sessão (RM-09)

**Checkpoint**: todas as telas de F1 estão implementadas.

---

## Phase 8: Polimento e evidências

- [ ] T059 [P] Revisar as mensagens de erro de todas as telas contra a tabela da seção 6 da spec
- [ ] T060 [P] Verificação de acessibilidade por tela: contraste AA, alvo de 48 dp, rótulos
      semânticos e ordem de foco (RM-34, RM-35)
- [ ] T061 [P] Verificar as telas com a fonte do sistema em 200% e corrigir cortes (RM-36)
- [ ] T062 [P] `integration_test/offline_test.dart`: cada aba com cache e sem rede, com a faixa de
      data (SC-005)
- [ ] T063 [P] `integration_test/erro_desconhecido_test.dart`: `code` fora do catálogo cai na
      mensagem genérica e é registrado em log (RM-38)
- [ ] T064 Conferir que o token não aparece em preferências, log ou cache após o login (SC-006)
- [ ] T065 [P] Comparar cada tela implementada com o PNG correspondente em `design/mobile/` e
      registrar as diferenças deliberadas
- [ ] T066 Atualizar a matriz de rastreabilidade da spec (seção 11) com os nomes finais dos
      arquivos de teste e anexar o relatório de execução (O14)

---

## Dependências

```
Setup (T001–T007)
   └── Foundational (T008–T024)   ← bloqueia tudo
         ├── US1 (T025–T031)      ← bloqueia as demais: sem sessão não há chamada autenticada
         │     ├── US2 (T032–T040)
         │     ├── US3 (T041–T047)
         │     │     └── US4 (T048–T054)   ← depende das listas de turmas
         │     └── US5 (T055–T058)
         └── Polimento (T059–T066)
```

US2, US3 e US5 são independentes entre si e podem ser feitas em paralelo depois de US1. US4
depende de US3 por usar a lista de turmas disponíveis.

## Estratégia de entrega incremental

1. Setup + Foundational + US1 → app que entra, permanece e sai com segurança.
2. + US2 → já tem valor de uso real: o aluno lê seus avisos.
3. + US3 e US4 → fecha o fluxo de turmas e inscrição.
4. + US5 e polimento → fase F1 completa, pronta para as evidências do TCC.

## Fora destas tarefas

- Fase F2 (agenda, mês, evento, horários): tarefas geradas após a spec E3 da API.
- Qualquer tela de gestão, notificação push e tema escuro.
