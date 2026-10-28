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

Aplicação React única construída com Vite, conforme `plan.md`: `src/`, `tests/`, `e2e/` na raiz de
`projeto-web/`.

> **Revisão de 13/10/2026** — as fases 1 e 2 foram reescritas. A versão anterior previa Next.js
> com servidor Node; a plataforma passa a ser um build estático, com sessão em cookie emitido
> pela API. As fases 3 a 10 mudaram pouco: o que era Server Action virou chamada do cliente.

---

## Phase 1: Setup

- [x] T001 Criar a aplicação com Vite (template `react-ts`) na raiz de `projeto-web/`,
      preservando `specs/` e `.specify/`; ativar o modo estrito do TypeScript
- [x] T002 Criar a árvore de `src/` conforme `plan.md`: `api/{recursos}`, `sessao/`, `paginas/`,
      `componentes/{layout,comum,avisos,turmas,solicitacoes,usuarios}`, `estilos/`, `lib/`
- [x] T003 Instalar as dependências de produção (`react-router`, `tailwindcss`, `zod`) e de
      desenvolvimento (`vitest`, `@testing-library/react`, `@testing-library/user-event`,
      `@playwright/test`, `eslint`, `prettier`)
- [x] T004 [P] Configurar ESLint com três regras próprias: proibir cor literal fora do tema;
      proibir `document.cookie`, `localStorage` e `sessionStorage` fora de `src/lib/rascunho.ts`;
      proibir importar `api/recursos/**` de dentro de `componentes/**` (Princípios I, III e V)
- [x] T005 [P] Configurar o proxy de desenvolvimento em `vite.config.ts`: `/api` apontando para a
      API local, reproduzindo a mesma origem que haverá em produção (D3)
- [x] T006 [P] Criar `.env.example` com `VITE_API_BASE_URL=/api` e registrar, em comentário, que
      todo valor embutido no build é público (D14, RW-44)
- [x] T007 [P] Adicionar a fonte Inter (400–800) a partir de `design/_assets/fonts/`, servida
      pelo próprio build
- [x] T008 [P] Configurar os scripts `dev`, `build`, `preview`, `lint`, `typecheck`, `test`,
      `test:e2e`

**Checkpoint**: `npm run dev` abre uma página vazia com o tema carregado e `/api` já
encaminhado para a API local.

---

## Phase 2: Foundational (bloqueia todas as user stories)

**⚠️ CRÍTICO**: nenhuma user story começa antes desta fase.

- [x] T009 `src/estilos/globals.css` e o tema do Tailwind: transcrever os tokens de
      `design/README.md` como variáveis e cores nomeadas (RW-38)
- [x] T010 [P] `src/lib/datas.ts` e `src/lib/texto.ts`: formatação em pt-BR, data relativa,
      conversão de UTC para o fuso de quem acessa, trechos e iniciais
- [x] T011 `src/api/schemas.ts`: esquemas `zod` de usuário, turma, vínculo, solicitação, aviso de
      gestão, destino, versão, evento de histórico e envelope de página (data-model.md, D9)
- [x] T012 [P] `tests/unit/schemas.test.ts`: validação a partir dos exemplos de JSON do contrato,
      incluindo campo nulo, enum desconhecido e destino de tipo novo
- [x] T013 `src/api/erros.ts`: `ApiError` e o mapa único `code → (mensagem, efeito)` da seção 6 da
      spec, com `RESPOSTA_INVALIDA`, `SEM_REDE`, `TIMEOUT` e fallback genérico (RW-08)
- [x] T014 `src/api/cliente.ts`: `fetch` com `credentials: 'include'`, base da URL, timeout de
      15 s, cabeçalho CSRF nos métodos de escrita, validação por esquema e conversão de falha em
      `ApiError` (RW-03, D4, D5)
- [x] T015 [P] `tests/unit/cliente.test.ts`: sucesso, erro com `code`, resposta fora do esquema,
      timeout, ausência de rede, envio do cabeçalho CSRF só nas escritas e presença de
      `credentials: 'include'` em toda chamada
- [x] T016 `src/api/recursos/auth.ts`: `login()`, `me()` e `encerrarSessao()`
      (`DELETE /auth/sessao`)
- [x] T017 `src/sessao/contexto.tsx`: carregar `GET /me`, expor o usuário corrente e recarregá-lo
      ao voltar o foco para a aba (RW-10)
- [x] T018 `src/sessao/encerrar.ts`: encerrar sessão na API, descartar o estado local e o rascunho,
      e levar ao login com o motivo (`401`, `403 USUARIO_INATIVO`, saída do usuário) (RW-04,
      RW-05, RW-09)
- [x] T019 [P] `tests/unit/sessao.test.ts`: encerramento único quando duas chamadas falham juntas,
      limpeza do rascunho e preservação do destino pretendido
- [x] T020 `src/sessao/exigir-sessao.tsx`: guarda das rotas de gestão, com esqueleto enquanto
      `GET /me` não responde e tratamento de `401`, `403 USUARIO_INATIVO` e `403 SEM_PERMISSAO`
      (RW-07, RW-12)
- [x] T021 `src/rotas.tsx` e `src/main.tsx`: tabela de rotas, carregamento sob demanda por rota,
      contexto de sessão e tema (D6)
- [x] T022 [P] `src/componentes/layout/`: casca com barra lateral (grupos e item ativo por perfil)
      e barra superior com título, período letivo e usuário (T02, T14, RW-11)
- [x] T023 [P] `src/componentes/comum/`: `ChipDestino`, `SeloSituacao`, `Tabela`, `Paginacao`,
      `Busca`, `EstadoVazio`, `EstadoErro`, `Esqueleto` — todos a partir do tema (RW-37, RW-38)
- [x] T024 `src/componentes/comum/modal.tsx` e `confirmacao.tsx`: foco preso, fechamento com
      `Esc`, devolução do foco à origem, rótulos ARIA; a confirmação exige descrever a
      consequência (RW-39, RW-41, D12)
- [x] T025 [P] `tests/componente/comum.test.tsx`: cada componente comum renderiza, é operável por
      teclado e expõe os papéis e rótulos corretos
- [x] T026 [P] `src/paginas/sem-permissao.tsx`: tela T16, com texto que distingue "perfil sem
      acesso à gestão" de "aluno deve usar o aplicativo" (RW-06, RW-12)
- [x] T027 [P] `src/lib/rascunho.ts`: rascunho do editor de aviso, único ponto do código
      autorizado a tocar armazenamento do navegador; sem nada de sessão (RW-42, Princípio III)
- [x] T028 [P] `e2e/servidor-falso/`: servidor que implementa o contrato a partir de fixtures
      copiadas de `contracts/api.md`, **inclusive o cookie de sessão e o cookie CSRF**, com
      gatilhos para `401`, `403`, `409`, `422` e lentidão (D13)

**Checkpoint**: tema, rede, sessão, navegação e componentes comuns prontos e testados.

---

## Phase 3: US1 — Entrar na plataforma (P1)

**Objetivo**: autenticar com sessão segura, separar quem é de gestão e reagir a token inválido.

**Teste independente**: entrar com cada perfil; tentar `/avisos` sem sessão; forçar `401`.

- [x] T029 [US1] `src/paginas/login.tsx`: formulário com usuário e senha, estado de envio, erro
      acima do botão e preservação do usuário digitado (T01, RW-42)
- [x] T030 [US1] Ligar o formulário a `POST /auth/login` com `credentials: 'include'` e tratar cada
      `code` do login; após o 200, chamar `GET /me` e decidir o destino (RW-01, RW-08)
- [x] T031 [US1] Redirecionar após entrar: destino pretendido, `/painel` ou `/sem-permissao`
      conforme o perfil (RW-06, RW-07)
- [x] T032 [P] [US1] `tests/componente/login.test.tsx`: campo vazio, credencial inválida, usuário
      inativo, falha de rede e sucesso
- [x] T033 [P] [US1] `e2e/login.spec.ts`: os quatro perfis, rota protegida sem sessão, `401` no
      meio da navegação e encerrar sessão
- [x] T034 [P] [US1] `e2e/sem-vazamento.spec.ts`: o token não aparece em `document.cookie`,
      `localStorage` nem `sessionStorage`; o cookie de sessão é `httpOnly`, `Secure` e
      `SameSite=Strict`; nenhum segredo no pacote servido (SC-003, RW-44)

**Checkpoint**: entrar, permanecer, ser barrado e sair funcionam de ponta a ponta.

---

## Phase 4: US2 — Publicar um aviso para o público certo (P2)

**Objetivo**: o valor central da plataforma — criar o que o aplicativo vai entregar.

- [x] T035 [US2] `src/api/recursos/avisos.ts`: listar, obter, criar, editar, arquivar,
      desarquivar, excluir, versões e histórico (contrato, Avisos)
- [x] T036 [P] [US2] `tests/unit/avisos-recurso.test.ts`: filtros, paginação e cada `code` de erro
      do contrato
- [x] T037 [US2] `src/componentes/avisos/seletor-destinos.tsx`: abas de turmas, semestres e
      grupos, busca de turma, seleção múltipla, limite de 20 e chips removíveis (T05, RW-16)
- [x] T038 [US2] Restrição do docente no seletor: apenas turmas em que leciona; demais tipos
      visíveis como indisponíveis, com explicação (T15, RW-17)
- [x] T039 [US2] `src/componentes/avisos/editor.tsx`: título, conteúdo, contador, destinos,
      agendamento e prévia do cartão como aparece no aplicativo (T04, RW-15, RW-22)
- [x] T040 [US2] `src/paginas/avisos/editar.tsx` e `novo.tsx`: envio ao criar e editar, com validação
      `zod`, recarga da lista afetada e devolução de `{ code, mensagem, errors }` preservando o digitado
      (RW-18, RW-42)
- [x] T041 [US2] Rascunho local do editor (`rascunho:aviso:*`), sem dado de sessão, apagado ao
      salvar, ao descartar e ao encerrar a sessão (data-model.md)
- [x] T042 [P] [US2] `tests/componente/editor.test.tsx`: sem destino, limite de 20, agendamento no
      passado, `DESTINO_NAO_PERMITIDO` mantendo o texto e restrição do docente
- [x] T043 [P] [US2] `e2e/publicar-aviso.spec.ts`: coordenação publica para três turmas; docente
      publica para a sua turma e é recusado em destino alheio

**Checkpoint**: é possível publicar, e o público fica explícito antes de publicar.

---

## Phase 5: US3 — Acompanhar e auditar (P3)

- [x] T044 [US3] `src/paginas/avisos/lista.tsx`: tabela com
      abas de situação, busca, filtros por autor e turma, e paginação pela URL (T03, RW-13, RW-14)
- [x] T045 [US3] Selo "Agendado" derivado de `ativo` + `publicar_em` futuro (apresentação, não
      estado da API); a aba "Agendados" usa `situacao=agendado` da API (RF-34) (data-model.md)
- [x] T046 [US3] Ações de ciclo de vida na lista e no detalhe, com confirmação que descreve a
      consequência (RW-19, RW-41)
- [x] T047 [US3] `src/paginas/avisos/historico.tsx` com
      `componentes/avisos/{linha-do-tempo,versoes}.tsx`: eventos com autor e data, comparação de
      campos alterados e destinos apresentados como conjunto (T06, RW-20, RW-21)
- [x] T048 [P] [US3] `tests/componente/historico.test.tsx`: cada tipo de evento, comparação de
      texto e de destinos, versão atual destacada
- [x] T049 [P] [US3] `e2e/aviso-ciclo-de-vida.spec.ts`: criar, editar, arquivar, desarquivar,
      excluir — conferindo um evento por operação e a visibilidade em cada filtro (SC-007)

**Checkpoint**: tudo que foi publicado é auditável pela própria interface.

---

## Phase 6: US4 — Turmas e vínculos (P4)

- [ ] T050 [US4] `src/api/recursos/turmas.ts` e `vinculos.ts`: listar, obter, criar, editar,
      desativar; listar, criar e remover vínculos (contrato, Turmas e vínculos)
- [ ] T051 [P] [US4] `tests/unit/turmas-recurso.test.ts`: filtros e os `code` 409 e 422
- [ ] T052 [US4] `src/paginas/turmas/lista.tsx` com `componentes/turmas/tabela-turmas.tsx`:
      lista com filtros, selos de situação e de inscrições (T07, RW-23)
- [ ] T053 [US4] `componentes/turmas/form-turma.tsx`: criar e editar, com
      validação de código, semestre e período, e tratamento de `CODIGO_TURMA_DUPLICADO` (RW-24)
- [ ] T054 [US4] Abrir/fechar inscrições e desativar turma, com confirmação explicando o efeito
      em avisos e vínculos (RW-25, RW-41)
- [ ] T055 [US4] `src/paginas/turmas/detalhe.tsx` com `tabela-vinculos.tsx` e
      `form-vinculo.tsx`: dados da turma, vínculos por papel e busca de pessoa ao vincular (T08,
      RW-26)
- [ ] T056 [US4] Vincular e desvincular, com o alerta de perda imediata
      de acesso e tratamento de `JA_VINCULADO` e `PERFIL_INCOMPATIVEL` (RW-27)
- [ ] T057 [P] [US4] `e2e/turmas-vinculos.spec.ts`: criar turma, código duplicado, vincular
      docente, remover vínculo e desativar turma

**Checkpoint**: a estrutura acadêmica pode ser mantida pela coordenação.

---

## Phase 7: US5 — Solicitações (P5)

- [ ] T058 [US5] `src/api/recursos/solicitacoes.ts`: listar, aprovar, recusar (contrato,
      Solicitações)
- [ ] T059 [US5] `src/paginas/solicitacoes.tsx` com `componentes/solicitacoes/tabela`:
      filtros por status e turma, destaque para pendentes há mais de 3 dias (T09, RW-28)
- [ ] T060 [US5] `componentes/solicitacoes/recusar-modal.tsx`:
      aprovar e recusar com motivo opcional de até 300 caracteres (RW-29, RW-30)
- [ ] T061 [P] [US5] `e2e/solicitacoes.spec.ts`: aprovar criando vínculo, recusar com motivo,
      decidir uma já decidida (`409`) e docente tentando decidir turma alheia (`403`)

**Checkpoint**: a fila de inscrições é resolvida pela coordenação e pelos docentes.

---

## Phase 8: US6 — Usuários e perfis (P6)

- [ ] T062 [US6] `src/api/recursos/usuarios.ts`: listar, obter, alterar perfil e situação
      (contrato, Usuários)
- [ ] T063 [US6] `src/paginas/usuarios.tsx` com `componentes/usuarios/tabela.tsx`:
      busca, filtros de perfil e situação, selos com texto (T10, RW-31, RW-40)
- [ ] T064 [US6] `componentes/usuarios/alterar-perfil-modal.tsx`:
      seletor com a descrição do que cada perfil pode fazer, aviso de efeito imediato, e
      tratamento de `PERFIL_INCOMPATIVEL` e dos `422` de autodesativação e último administrador
      (T11, RW-32, RW-33)
- [ ] T065 [US6] Esconder a ação de alterar perfil para quem não é administração e tratar `403`
      com a tela de sem permissão (RW-11, RW-12)
- [ ] T066 [P] [US6] `tests/componente/perfil-modal.test.tsx`: cada opção, confirmação e cada erro
- [ ] T067 [P] [US6] `e2e/usuarios.spec.ts`: administração muda o perfil e a mudança vale na
      navegação seguinte da pessoa afetada (SC-008); coordenação não vê a ação

**Checkpoint**: todas as telas de F1 estão implementadas.

---

## Phase 9: Painel e integração

- [ ] T068 `src/paginas/painel.tsx`: três chamadas em paralelo, cartões de número a
      partir dos `total`, listas recentes e falha isolada por cartão (T02, T14, D13)
- [ ] T069 [P] `e2e/painel.spec.ts`: painel de coordenação e de docente, com o conteúdo que a API
      restringe para cada um
- [ ] T070 `e2e/fluxo-completo.spec.ts`: coordenação publica pela web → a API registra → o
      conteúdo chega a quem é alcançado e não chega aos demais (SC-001, RF-30 da API)

---

## Phase 10: Polimento e evidências

- [ ] T071 [P] Revisar as mensagens de erro de todas as telas contra a tabela da seção 6 da spec
- [ ] T072 [P] Auditoria de acessibilidade por tela: contraste AA, foco visível, ordem de foco,
      cabeçalhos de tabela, modais e rótulos (RW-39, RW-40, SC-005)
- [ ] T073 [P] Percorrer login, lista, editor, modal e confirmação apenas com teclado e corrigir o
      que exigir mouse (SC-004)
- [ ] T074 [P] Verificar que nenhum formulário perde o digitado em erro da API ou queda de rede
      (SC-006)
- [ ] T075 [P] Comparar cada tela implementada com o PNG correspondente em `design/web/` e
      registrar as diferenças deliberadas
- [ ] T076 [P] Verificar a implantação estática: build servido por nginx com rotas desconhecidas
      caindo em `index.html`, API no mesmo domínio sob `/api`, HTTPS e cookie `Secure` funcionando
      (RW-45, D3)
- [ ] T077 Atualizar a matriz de rastreabilidade da spec (seção 11) com os nomes finais dos
      arquivos de teste e anexar o relatório de execução (O14)

---

## Dependências

```
Setup (T001–T008)
   └── Foundational (T009–T028)   ← bloqueia tudo
         └── US1 (T029–T034)      ← sem sessão não há chamada autenticada
               ├── US2 (T035–T043)
               │     └── US3 (T044–T049)   ← audita o que a US2 cria
               ├── US4 (T050–T057)
               │     └── US5 (T058–T061)   ← decide sobre turmas da US4
               ├── US6 (T062–T067)
               └── Painel e integração (T068–T070) ← depende das listas das demais
                     └── Polimento (T071–T077)
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
