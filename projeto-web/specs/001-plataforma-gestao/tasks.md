# Tasks: Plataforma Web de Gestão — Fase F1

**Input**: Design documents from `/specs/001-plataforma-gestao/`

**Prerequisites**: spec.md, plan.md, research.md, data-model.md, contracts/consumo-api.md, quickstart.md

**Escopo**: somente a **fase F1** (telas T01–T11, T14–T16; endpoints das seções 10–15 do contrato
da API, mais login e perfil). Agenda e horários (F2) terão tarefas próprias, geradas quando a
spec E3 da API existir.

**Tests**: incluídos. Unidade e componente com Vitest + Testing Library; ponta a ponta com
Playwright contra o servidor falso do contrato. Nenhum teste depende da API real.

**Organization**: tarefas agrupadas por user story (US1–US6), cada uma testável de forma
independente.

## Format: `[ID] [P?] [Story] Descrição`

- **[P]**: pode ser feita em paralelo (arquivos diferentes, sem dependência pendente)
- **[Story]**: user story da spec (US1–US6)
- Requisitos entre parênteses (RW-xx) indicam a rastreabilidade

## Path Conventions

Projeto Next.js único, conforme `plan.md`: `src/`, `tests/`, `e2e/` na raiz de `projeto-web/`.

---

## Phase 1: Setup

- [ ] T001 Criar o projeto Next.js na raiz de `projeto-web/` (App Router, TypeScript estrito,
      Tailwind, diretório `src/`), preservando `specs/` e `.specify/`
- [ ] T002 Criar a árvore de `src/` conforme `plan.md`: `app/`, `server/`, `acoes/`,
      `componentes/{layout,comum,avisos,turmas,solicitacoes,usuarios}`, `estilos/`, `lib/`
- [ ] T003 Instalar as dependências de produção (`zod`, `server-only`) e de desenvolvimento
      (`vitest`, `@testing-library/react`, `@testing-library/user-event`, `@playwright/test`,
      `eslint`, `prettier`)
- [ ] T004 [P] Configurar ESLint com a regra que proíbe cor literal fora do tema e a que proíbe
      importar `src/server/**` a partir de componente de cliente (Princípios III e V)
- [ ] T005 [P] Criar `.env.example` com `API_BASE_URL` e `SESSION_COOKIE_NAME`, sem nenhuma
      variável `NEXT_PUBLIC_` (RW-44, D12)
- [ ] T006 [P] Adicionar a fonte Inter (400–800) via `next/font/local`, com os arquivos de
      `design/_assets/fonts/`
- [ ] T007 [P] Configurar os scripts `dev`, `build`, `start`, `lint`, `typecheck`, `test`,
      `test:e2e`

**Checkpoint**: `npm run dev` abre uma página vazia com o tema carregado.

---

## Phase 2: Foundational (bloqueia todas as user stories)

**⚠️ CRÍTICO**: nenhuma user story começa antes desta fase.

- [ ] T008 `src/estilos/globals.css` e o tema do Tailwind: transcrever os tokens de
      `design/README.md` como variáveis e cores nomeadas (RW-38)
- [ ] T009 [P] `src/lib/datas.ts` e `src/lib/texto.ts`: formatação em pt-BR, data relativa,
      conversão de UTC para o fuso de quem acessa, trechos e iniciais
- [ ] T010 `src/server/schemas.ts`: esquemas `zod` de usuário, turma, vínculo, solicitação, aviso
      de gestão, destino, versão, evento de histórico e envelope de página (data-model.md, D7)
- [ ] T011 [P] `tests/unit/schemas.test.ts`: validação a partir dos exemplos de JSON do contrato,
      incluindo campo nulo, enum desconhecido e destino de tipo novo
- [ ] T012 `src/server/erros.ts`: `ApiError` e o mapa único `code → (mensagem, efeito)` da seção 6
      da spec, com `RESPOSTA_INVALIDA`, `SEM_REDE`, `TIMEOUT` e fallback genérico (RW-08)
- [ ] T013 `src/server/api.ts`: `apiFetch` com `server-only`, base da URL, token do cookie,
      timeout de 15 s, validação por esquema e conversão de falha em `ApiError` (RW-03, D3)
- [ ] T014 [P] `tests/unit/api.test.ts`: sucesso, erro com `code`, resposta fora do esquema,
      timeout, ausência de rede e ausência de token
- [ ] T015 `src/server/sessao.ts`: ler, gravar e apagar o cookie `httpOnly`/`Secure`/`SameSite`;
      `encerrarSessao(motivo)` com redirecionamento ao login guardando o destino (RW-01, RW-04,
      RW-05, RW-09)
- [ ] T016 [P] `tests/unit/sessao.test.ts`: atributos do cookie, validade alinhada ao token,
      limpeza em `401` e em `403 USUARIO_INATIVO`
- [ ] T017 `middleware.ts`: exigir o cookie nas rotas do grupo `(gestao)` e redirecionar ao login
      com o destino pretendido (RW-07)
- [ ] T018 `src/server/recursos/auth.ts`: `login()` e `me()` (contrato, Sessão)
- [ ] T019 `src/app/api/sessao/route.ts`: `POST` (login → `GET /me` → grava cookie ou devolve
      `/sem-permissao` para `aluno`) e `DELETE` (encerrar sessão) (RW-01, RW-06)
- [ ] T020 `src/app/(gestao)/layout.tsx`: carregar `GET /me` no servidor a cada requisição, montar
      a barra lateral pelo perfil e tratar `401`/`403` (RW-10, RW-11)
- [ ] T021 [P] `src/componentes/layout/`: barra lateral com grupos e item ativo, barra superior
      com título, período letivo e usuário (telas T02 e T14)
- [ ] T022 [P] `src/componentes/comum/`: `ChipDestino`, `SeloSituacao`, `Tabela`, `Paginacao`,
      `Busca`, `EstadoVazio`, `EstadoErro`, `Esqueleto` — todos a partir do tema (RW-37, RW-38)
- [ ] T023 `src/componentes/comum/modal.tsx` e `confirmacao.tsx`: foco preso, fechamento com
      `Esc`, devolução do foco à origem, rótulos ARIA; a confirmação exige descrever a
      consequência (RW-39, RW-41, D9)
- [ ] T024 [P] `tests/componente/comum.test.tsx`: cada componente comum renderiza, é operável por
      teclado e expõe os papéis e rótulos corretos
- [ ] T025 [P] `src/app/sem-permissao/page.tsx`: tela T16, com texto que distingue "perfil sem
      acesso à gestão" de "aluno deve usar o aplicativo" (RW-06, RW-12)
- [ ] T026 [P] `e2e/servidor-falso/`: servidor que implementa o contrato a partir de fixtures
      copiadas de `contracts/api.md`, com gatilhos para `401`, `403`, `409`, `422` e lentidão
      (D11)

**Checkpoint**: tema, rede, sessão, navegação e componentes comuns prontos e testados.

---

## Phase 3: US1 — Entrar na plataforma (P1)

**Objetivo**: autenticar com sessão segura, separar quem é de gestão e reagir a token inválido.

**Teste independente**: entrar com cada perfil; tentar `/avisos` sem sessão; forçar `401`.

- [ ] T027 [US1] `src/app/login/page.tsx`: formulário com usuário e senha, estado de envio, erro
      acima do botão e preservação do usuário digitado (T01, RW-42)
- [ ] T028 [US1] Ligar o formulário a `POST /api/sessao` e tratar cada `code` do login (RW-08)
- [ ] T029 [US1] Redirecionar após entrar: destino pretendido, `/painel` ou `/sem-permissao`
      conforme o perfil (RW-06, RW-07)
- [ ] T030 [P] [US1] `tests/componente/login.test.tsx`: campo vazio, credencial inválida, usuário
      inativo, falha de rede e sucesso
- [ ] T031 [P] [US1] `e2e/login.spec.ts`: os quatro perfis, rota protegida sem sessão, `401` no
      meio da navegação e encerrar sessão
- [ ] T032 [P] [US1] `e2e/sem-vazamento.spec.ts`: o token não aparece em `document.cookie`, no
      HTML nem no JavaScript servido; `API_BASE_URL` não está no pacote do cliente (SC-003, RW-44)

**Checkpoint**: entrar, permanecer, ser barrado e sair funcionam de ponta a ponta.

---

## Phase 4: US2 — Publicar um aviso para o público certo (P2)

**Objetivo**: o valor central da plataforma — criar o que o aplicativo vai entregar.

- [ ] T033 [US2] `src/server/recursos/avisos.ts`: listar, obter, criar, editar, arquivar,
      desarquivar, excluir, versões e histórico (contrato, Avisos)
- [ ] T034 [P] [US2] `tests/unit/avisos-recurso.test.ts`: filtros, paginação e cada `code` de erro
      do contrato
- [ ] T035 [US2] `src/componentes/avisos/seletor-destinos.tsx`: abas de turmas, semestres e
      grupos, busca de turma, seleção múltipla, limite de 20 e chips removíveis (T05, RW-16)
- [ ] T036 [US2] Restrição do docente no seletor: apenas turmas em que leciona; demais tipos
      visíveis como indisponíveis, com explicação (T15, RW-17)
- [ ] T037 [US2] `src/componentes/avisos/editor.tsx`: título, conteúdo, contador, destinos,
      agendamento e prévia do cartão como aparece no aplicativo (T04, RW-15, RW-22)
- [ ] T038 [US2] `src/acoes/avisos.ts`: Server Actions de criar e editar, com validação `zod`,
      `revalidatePath` e devolução de `{ code, mensagem, errors }` preservando o digitado
      (RW-18, RW-42)
- [ ] T039 [US2] Rascunho local do editor (`rascunho:aviso:*`), sem dado de sessão, apagado ao
      salvar, ao descartar e ao encerrar a sessão (data-model.md)
- [ ] T040 [P] [US2] `tests/componente/editor.test.tsx`: sem destino, limite de 20, agendamento no
      passado, `DESTINO_NAO_PERMITIDO` mantendo o texto e restrição do docente
- [ ] T041 [P] [US2] `e2e/publicar-aviso.spec.ts`: coordenação publica para três turmas; docente
      publica para a sua turma e é recusado em destino alheio

**Checkpoint**: é possível publicar, e o público fica explícito antes de publicar.

---

## Phase 5: US3 — Acompanhar e auditar (P3)

- [ ] T042 [US3] `src/app/(gestao)/avisos/page.tsx` e `componentes/avisos/lista.tsx`: tabela com
      abas de situação, busca, filtros por autor e turma, e paginação pela URL (T03, RW-13, RW-14)
- [ ] T043 [US3] Derivar a situação "Agendado" de `ativo` + `publicar_em` futuro, documentada
      como apresentação, não como estado da API (data-model.md)
- [ ] T044 [US3] Ações de ciclo de vida na lista e no detalhe, com confirmação que descreve a
      consequência (RW-19, RW-41)
- [ ] T045 [US3] `src/app/(gestao)/avisos/[id]/historico/page.tsx` com
      `componentes/avisos/{linha-do-tempo,versoes}.tsx`: eventos com autor e data, comparação de
      campos alterados e destinos apresentados como conjunto (T06, RW-20, RW-21)
- [ ] T046 [P] [US3] `tests/componente/historico.test.tsx`: cada tipo de evento, comparação de
      texto e de destinos, versão atual destacada
- [ ] T047 [P] [US3] `e2e/aviso-ciclo-de-vida.spec.ts`: criar, editar, arquivar, desarquivar,
      excluir — conferindo um evento por operação e a visibilidade em cada filtro (SC-007)

**Checkpoint**: tudo que foi publicado é auditável pela própria interface.

---

## Phase 6: US4 — Turmas e vínculos (P4)

- [ ] T048 [US4] `src/server/recursos/turmas.ts` e `vinculos.ts`: listar, obter, criar, editar,
      desativar; listar, criar e remover vínculos (contrato, Turmas e vínculos)
- [ ] T049 [P] [US4] `tests/unit/turmas-recurso.test.ts`: filtros e os `code` 409 e 422
- [ ] T050 [US4] `src/app/(gestao)/turmas/page.tsx` com `componentes/turmas/tabela-turmas.tsx`:
      lista com filtros, selos de situação e de inscrições (T07, RW-23)
- [ ] T051 [US4] `componentes/turmas/form-turma.tsx` e `src/acoes/turmas.ts`: criar e editar, com
      validação de código, semestre e período, e tratamento de `CODIGO_TURMA_DUPLICADO` (RW-24)
- [ ] T052 [US4] Abrir/fechar inscrições e desativar turma, com confirmação explicando o efeito
      em avisos e vínculos (RW-25, RW-41)
- [ ] T053 [US4] `src/app/(gestao)/turmas/[id]/page.tsx` com `tabela-vinculos.tsx` e
      `form-vinculo.tsx`: dados da turma, vínculos por papel e busca de pessoa ao vincular (T08,
      RW-26)
- [ ] T054 [US4] `src/acoes/vinculos.ts`: vincular e desvincular, com o alerta de perda imediata
      de acesso e tratamento de `JA_VINCULADO` e `PERFIL_INCOMPATIVEL` (RW-27)
- [ ] T055 [P] [US4] `e2e/turmas-vinculos.spec.ts`: criar turma, código duplicado, vincular
      docente, remover vínculo e desativar turma

**Checkpoint**: a estrutura acadêmica pode ser mantida pela coordenação.

---

## Phase 7: US5 — Solicitações (P5)

- [ ] T056 [US5] `src/server/recursos/solicitacoes.ts`: listar, aprovar, recusar (contrato,
      Solicitações)
- [ ] T057 [US5] `src/app/(gestao)/solicitacoes/page.tsx` com `componentes/solicitacoes/tabela`:
      filtros por status e turma, destaque para pendentes há mais de 3 dias (T09, RW-28)
- [ ] T058 [US5] `componentes/solicitacoes/recusar-modal.tsx` e `src/acoes/solicitacoes.ts`:
      aprovar e recusar com motivo opcional de até 300 caracteres (RW-29, RW-30)
- [ ] T059 [P] [US5] `e2e/solicitacoes.spec.ts`: aprovar criando vínculo, recusar com motivo,
      decidir uma já decidida (`409`) e docente tentando decidir turma alheia (`403`)

**Checkpoint**: a fila de inscrições é resolvida pela coordenação e pelos docentes.

---

## Phase 8: US6 — Usuários e perfis (P6)

- [ ] T060 [US6] `src/server/recursos/usuarios.ts`: listar, obter, alterar perfil e situação
      (contrato, Usuários)
- [ ] T061 [US6] `src/app/(gestao)/usuarios/page.tsx` com `componentes/usuarios/tabela.tsx`:
      busca, filtros de perfil e situação, selos com texto (T10, RW-31, RW-40)
- [ ] T062 [US6] `componentes/usuarios/alterar-perfil-modal.tsx` e `src/acoes/usuarios.ts`:
      seletor com a descrição do que cada perfil pode fazer, aviso de efeito imediato, e
      tratamento de `PERFIL_INCOMPATIVEL` e dos `422` de autodesativação e último administrador
      (T11, RW-32, RW-33)
- [ ] T063 [US6] Esconder a ação de alterar perfil para quem não é administração e tratar `403`
      com a tela de sem permissão (RW-11, RW-12)
- [ ] T064 [P] [US6] `tests/componente/perfil-modal.test.tsx`: cada opção, confirmação e cada erro
- [ ] T065 [P] [US6] `e2e/usuarios.spec.ts`: administração muda o perfil e a mudança vale na
      navegação seguinte da pessoa afetada (SC-008); coordenação não vê a ação

**Checkpoint**: todas as telas de F1 estão implementadas.

---

## Phase 9: Painel e integração

- [ ] T066 `src/app/(gestao)/painel/page.tsx`: três chamadas em paralelo, cartões de número a
      partir dos `total`, listas recentes e falha isolada por cartão (T02, T14, D13)
- [ ] T067 [P] `e2e/painel.spec.ts`: painel de coordenação e de docente, com o conteúdo que a API
      restringe para cada um
- [ ] T068 `e2e/fluxo-completo.spec.ts`: coordenação publica pela web → a API registra → o
      conteúdo chega a quem é alcançado e não chega aos demais (SC-001, RF-30 da API)

---

## Phase 10: Polimento e evidências

- [ ] T069 [P] Revisar as mensagens de erro de todas as telas contra a tabela da seção 6 da spec
- [ ] T070 [P] Auditoria de acessibilidade por tela: contraste AA, foco visível, ordem de foco,
      cabeçalhos de tabela, modais e rótulos (RW-39, RW-40, SC-005)
- [ ] T071 [P] Percorrer login, lista, editor, modal e confirmação apenas com teclado e corrigir o
      que exigir mouse (SC-004)
- [ ] T072 [P] Verificar que nenhum formulário perde o digitado em erro da API ou queda de rede
      (SC-006)
- [ ] T073 [P] Comparar cada tela implementada com o PNG correspondente em `design/web/` e
      registrar as diferenças deliberadas
- [ ] T074 Atualizar a matriz de rastreabilidade da spec (seção 11) com os nomes finais dos
      arquivos de teste e anexar o relatório de execução (O14)

---

## Dependências

```
Setup (T001–T007)
   └── Foundational (T008–T026)   ← bloqueia tudo
         └── US1 (T027–T032)      ← sem sessão não há chamada autenticada
               ├── US2 (T033–T041)
               │     └── US3 (T042–T047)   ← audita o que a US2 cria
               ├── US4 (T048–T055)
               │     └── US5 (T056–T059)   ← decide sobre turmas da US4
               ├── US6 (T060–T065)
               └── Painel (T066–T068) ← depende das listas das demais
                     └── Polimento (T069–T074)
```

US2, US4 e US6 são independentes entre si e podem ser feitas em paralelo depois de US1. US3
depende de US2; US5 depende de US4; o painel depende das listas.

## Estratégia de entrega incremental

1. Setup + Foundational + US1 → plataforma que entra, separa perfis e protege o token.
2. + US2 e US3 → já tem valor real: a coordenação publica e audita avisos.
3. + US4 e US5 → fecha a gestão acadêmica: turmas, vínculos e inscrições.
4. + US6, painel e polimento → fase F1 completa, com o fluxo web → API → app demonstrável.

## Fora destas tarefas

- Fase F2 (agenda e horários): tarefas geradas após a spec E3 da API.
- Qualquer funcionalidade de aluno, notificações, relatórios e uso em telefone.
