# Tasks: Plataforma web — Fase F2 (agenda e horários)

**Input**: [plan-f2.md](./plan-f2.md), [spec.md](./spec.md) (US7, RW-34 a RW-36, RW-46),
contrato da E3 em `projeto-api/specs/002-agenda-horarios/contracts/api.md`, telas
`design/web/w-12-agenda.png` e `w-13-horarios.png`.

**Escopo**: somente a F2 da plataforma web, mais a emenda D-F2-2 na API. Numeração a partir de
T078, depois da F1 ([tasks.md](./tasks.md)).

**Tests**: incluídos e escritos antes da implementação. Unidade em `tests/unit/`, componente em
`tests/componente/`, fluxos em `e2e/` (servidor falso), acessibilidade com axe e só teclado.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência incompleta)
- **[Story]**: US7a (agenda), US7b (horários)

---

## Phase 11: Base da F2 (bloqueia as demais)

- [ ] T078 API: `GET /gestao/eventos?quando=proximos|realizados` (D-F2-2), com teste de contrato
      em `projeto-api/tests/contract/gestao/test_eventos_gestao.py` (não encerrados em ordem
      crescente; encerrados em ordem decrescente; em andamento só em `proximos`; valor inválido
      dá 422) e emenda ao contrato da E3 §5
- [ ] T079 [P] `src/api/recursos/eventos.ts` e `horarios.ts`: chamadas e esquemas `zod` de
      eventos, versões, histórico, horários e envelope com conflitos; testes do cliente em
      `tests/unit/eventos-recurso.test.ts` e `horarios-recurso.test.ts`
- [ ] T080 Mover `seletor-destinos`, `destinos-docente`, `linha-do-tempo` e `versoes` para
      `componentes/comum/`, com o nome do assunto como parâmetro (D-F2-4); a suíte da F1 continua
      verde sem mudar teste de aviso
- [ ] T081 [P] Servidor falso: `/gestao/eventos` (filtros, `quando`, janela por sobreposição,
      ciclo de vida, versões, histórico) e `/gestao/turmas/{id}/horarios` (CRUD e conflitos),
      fiel ao contrato da E3 (D-F2-15)
- [ ] T082 Navegação: itens "Agenda" (administração, coordenação, docente) e "Horários"
      (administração, coordenação); rotas novas registradas com a guarda de perfil (D-F2-3,
      D-F2-13); teste em `tests/unit/navegacao.test.ts`

**Checkpoint**: dados e navegação prontos; avisos intactos.

---

## Phase 12: US7a — Agenda (T12; RW-34)

- [ ] T083 [P] [US7a] `tests/unit/agenda-abas.test.ts`: mapeamento das quatro abas para a
      consulta da API e o estado na URL (D-F2-1); `tests/unit/formulario-evento.test.ts`: regras
      do formulário (fim depois do início, campos opcionais, destinos) (D-F2-5)
- [ ] T084 [P] [US7a] `tests/componente/agenda-lista.test.tsx`: cartões como na w-12 (data,
      tipo, faixa de horas, "até HH:MM", vários dias, local, chips), abas, filtro de tipo, busca,
      vazio, erro e carregando (D-F2-6)
- [ ] T085 [P] [US7a] `tests/componente/calendario-mes.test.tsx`: dias da semana, navegação de
      mês, evento de vários dias em cada dia, "+N", clique no dia filtra a lista (D-F2-7)
- [ ] T086 [P] [US7a] `tests/componente/editor-evento.test.tsx`: criar e editar, docente restrito
      às suas turmas, 422 marcando o campo da API, nada digitado se perde em erro ou sem rede,
      rascunho local (D-F2-5)
- [ ] T087 [US7a] `paginas/eventos/lista.tsx`, `componentes/eventos/cartao-evento.tsx` e
      `calendario-mes.tsx`
- [ ] T088 [US7a] `paginas/eventos/novo.tsx`, `editar.tsx` e `componentes/eventos/
      formulario-evento.tsx`, reaproveitando o seletor de destinos comum
- [ ] T089 [US7a] Ações (arquivar, desarquivar, excluir com confirmação) e
      `paginas/eventos/historico.tsx` com a linha do tempo e as versões comuns (RW-34)

**Checkpoint**: agenda completa na web.

---

## Phase 13: US7b — Horários (T13; RW-35, RW-36, RW-46)

- [ ] T090 [P] [US7b] `tests/unit/grade.test.ts`: montagem da grade (colunas de segunda a sexta,
      sábado e domingo só com aula, linhas pelos inícios distintos, docentes da grade) (D-F2-8,
      D-F2-12)
- [ ] T091 [P] [US7b] `tests/componente/grade-semanal.test.tsx` e `modal-aula.test.tsx`: grade
      como na w-13, criar, editar e remover aula, docente entre os de perfil docente, 422 e 409
      `PERFIL_INCOMPATIVEL` no campo certo (D-F2-9)
- [ ] T092 [P] [US7b] `tests/componente/conflitos.test.tsx`: conflitos mostrados como atenção,
      não erro, com sala ou docente, turma, dia e horas; foco na mensagem (RW-46, D-F2-10)
- [ ] T093 [P] [US7b] `tests/componente/escolher-turma.test.tsx`: lista das turmas ativas, lembra
      a última, link "Horários" no detalhe da turma (D-F2-3)
- [ ] T094 [US7b] `paginas/horarios/escolher-turma.tsx`, `paginas/horarios/grade.tsx` e os
      componentes `grade-semanal`, `modal-aula`, `conflitos` e `docentes-da-grade`
- [ ] T095 [US7b] "Avisar a turma": mensagem depois de salvar ou remover, cartão "Mudou alguma
      aula?" e `/avisos/novo?turma=<id>` com a turma como destino; teste em
      `tests/componente/avisar-turma.test.tsx` (RW-36, D-F2-11)

**Checkpoint**: grade completa na web.

---

## Phase 14: Ponta a ponta e polimento

- [ ] T096 [P] `e2e/agenda.spec.ts`: coordenação cria, edita, arquiva, desarquiva e exclui um
      evento, vê o histórico; o mês mostra o evento de vários dias em cada dia; docente só cria
      para suas turmas
- [ ] T097 [P] `e2e/horarios.spec.ts`: coordenação escolhe a turma, cria aula com conflito (salva
      e avisada), edita, remove e segue para o aviso da turma; docente não vê "Horários"
- [ ] T098 [P] Acessibilidade das telas novas: axe sem violação, só teclado (abas, calendário,
      grade, modais) e mensagens anunciadas (RW-39, RW-40)
- [ ] T099 [P] Validação visual com Chrome headless contra a API local real, ao lado de
      `w-12-agenda.png` e `w-13-horarios.png`, registrando as diferenças deliberadas (D-F2-14) em
      `evidencias/`
- [ ] T100 Atualizar a matriz de rastreabilidade da spec (seção 11) e a matriz de erros (seção 6)
      para T12 e T13, o README do projeto e anexar o relatório de execução

**Checkpoint**: F2 completa na web.

---

## Dependencies & Execution Order

- Phase 11 → Phases 12 e 13. T078 (API) antes do T081 (servidor falso) e da aba Realizados;
  T080 antes do editor de evento (T088) e do histórico (T089).
- Phases 12 e 13 são independentes entre si.
- Phase 14 por último.
- Testes de cada fase escritos e falhando antes da implementação.
