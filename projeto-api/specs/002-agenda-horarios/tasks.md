# Tasks: Agenda e Horários — Entrega 3 (API)

**Input**: [plan.md](./plan.md), [spec.md](./spec.md), [contracts/api.md](./contracts/api.md),
[data-model.md](./data-model.md).

**Escopo**: somente a API da **Entrega 3**: eventos (consulta e gestão, com versões e histórico),
horários (consulta e gestão, com conflitos), seed e E2E. Os clientes têm tarefas próprias.

**Tests**: incluídos, escritos antes da implementação e vistos falhando. Contrato em
`tests/contract/` e `tests/contract/gestao/`, regras em `tests/integration/`, puro em
`tests/unit/`, ponta a ponta em `tests/e2e/`. Testes que logam pelo mock levam
`@pytest.mark.mock_auth`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência incompleta)
- **[Story]**: US1 (publicar evento), US2 (consultar agenda), US3 (auditar evento), US4 (montar a
  grade), US5 (consultar a grade)

---

## Phase 1: Emendas e base comum (bloqueia as demais)

- [x] T001 [P] Emendar `data-model.md` e `contracts/api.md` com as decisões do plano: nomes físicos
      (D-E3-2), intervalo semiaberto e "encerrado" (D-E3-3, D-E3-4), ordem (D-E3-5), conflito só no
      mesmo período letivo (D-E3-9) e 404 para a grade de turma inativa (D-E3-10)
- [x] T002 Refatoração sem mudança de comportamento (D-E3-1): `repositories/alcance.py` com
      `alcanca(destino, do_dono, usuario)`; `services/destinos.py` com a validação de destinos e a regra do
      docente; `destinos_canonicos(destinos)`; `schemas/destino.py`. Avisos passam a usá-los, e a
      suíte inteira continua verde sem tocar em teste de aviso
- [x] T003 [P] Erros de domínio em `src/api/errors.py`: `EVENTO_NAO_ENCONTRADO`,
      `HORARIO_NAO_ENCONTRADO`, `EVENTO_NAO_EDITAVEL`, `EVENTO_SITUACAO_INVALIDA`
- [x] T004 Models `evento.py` (Evento, EventoDestino), `evento_versao.py`, `evento_historico.py` e
      `horario.py`, com os nomes físicos do D-E3-2, `CHECK` de tipo, situação, dia 1–7,
      `fim > inicio` (evento e horário) e índices `(st_evento, dt_inicio)`, `(id_usuario)` e
      `(id_turma, nr_dia_semana, hr_inicio)`; registro em `src/db/base.py`
- [x] T005 Migração Alembic das cinco tabelas, com os triggers de imutabilidade em
      `tb_evento_versao` e `tb_evento_historico` (mesma função da E2); `downgrade` completo
- [x] T006 [P] Integration test: `UPDATE`/`DELETE` em versão e histórico de evento falham no banco,
      em `tests/integration/test_evento_auditoria_imutavel.py`; o teste de nomenclatura e o de
      models × migrações seguem verdes com as tabelas novas

**Checkpoint**: tabelas criadas, regra de alcance única, avisos intactos.

---

## Phase 2: US1 — Publicar um evento para o público certo (RF-35, RF-36)

- [x] T007 [P] [US1] Contract test `POST /gestao/eventos` (201 com versão 1 e `situacao: ativo`;
      422 de campos, `fim <= inicio`, destino repetido ou fora de 1–20; 403 aluno; 404 turma) em
      `tests/contract/gestao/test_eventos_criar.py`
- [x] T008 [P] [US1] Integration test: docente cria para turma em que leciona; `todos`, `semestre`
      ou turma alheia dão 403 `DESTINO_NAO_PERMITIDO`, em
      `tests/integration/test_evento_destino_docente.py`
- [x] T009 [US1] `schemas/gestao/eventos.py`, `services/eventos_gestao_service.criar` (evento +
      destinos + versão 1 + histórico `criado` na mesma transação) e rota
      `POST /gestao/eventos`

---

## Phase 3: US2 — Consultar a agenda (RF-37, RF-38)

- [x] T010 [P] [US2] Contract test `GET /eventos` e `GET /eventos/{id}` (formato do item,
      paginação, filtros `tipo`, `situacao`, `turma_id`; 422 de `ate < de` e de valores inválidos;
      404 de excluído ou fora do alcance) em `tests/contract/test_eventos_listar.py`
- [x] T011 [P] [US2] Integration test de visibilidade: cada tipo de destino alcança quem deve e
      ninguém mais; vários destinos que coincidem dão uma entrega só; turma inativa suspende o
      alcance por turma e por semestre; arquivado só na lista de arquivados, em
      `tests/integration/test_evento_visibilidade.py` (SC-E3-001)
- [x] T012 [P] [US2] Integration test de tempo: sem filtro, "a partir de agora" com os em andamento;
      `[de, ate)` semiaberto; `incluir_encerrados`; evento sem `fim`; evento que cruza a
      meia-noite; um mês inteiro numa chamada (SC-E3-002), em
      `tests/integration/test_evento_intervalo.py`
- [x] T013 [US2] `repositories/evento_repository.py`, `services/evento_service.py`,
      `schemas/evento.py` e rotas `GET /eventos` e `GET /eventos/{id}`

---

## Phase 4: US3 — Gestão e auditoria do evento (RF-39 a RF-42)

- [x] T014 [P] [US3] Contract test `GET /gestao/eventos` (filtros do contrato, docente só os
      próprios, `excluido` só para a gestão) e `GET /gestao/eventos/{id}` em
      `tests/contract/gestao/test_eventos_gestao.py`
- [x] T015 [P] [US3] Contract test do ciclo de vida: `PATCH` (versão + 1, `editado_em`, "nenhuma
      alteração", `fim` coerente com o `inicio` resultante, `fim: null`), arquivar, desarquivar,
      excluir, 409 `EVENTO_NAO_EDITAVEL` e `EVENTO_SITUACAO_INVALIDA`, em
      `tests/contract/gestao/test_eventos_ciclo_de_vida.py`
- [x] T016 [P] [US3] Integration test: cada operação grava exatamente um registro com usuário e
      data; a edição registra só os campos alterados com `de`/`para`; versões completas, inclusive
      de evento excluído para a gestão; docente não audita evento alheio (403); falha no meio não
      deixa versão nem histórico órfão, em `tests/integration/test_evento_versoes_historico.py`
      (SC-E3-003)
- [x] T017 [US3] Restante de `eventos_gestao_service` (listar, obter, editar, arquivar,
      desarquivar, excluir, versões, histórico) e rotas de `/gestao/eventos`

**Checkpoint**: eventos completos; o app e a web podem consumir a agenda.

---

## Phase 5: US4 — Montar a grade de horários (RF-43, RF-44, RF-46, RF-47)

- [x] T018 [P] [US4] Unit test `tests/unit/test_conflito_horario.py`: normalização do local
      (acento, caixa, espaços), sobreposição estrita (encostar não conflita) e horário sem local ou
      sem docente
- [x] T019 [P] [US4] Contract test do CRUD de `/gestao/turmas/{id}/horarios` (201/200 com o
      envelope `horario` + `conflitos`, 422 de dia, hora e campos, 404 de turma, horário de outra
      turma e docente, 409 `PERFIL_INCOMPATIVEL`, 403 docente e aluno, `DELETE` 204) em
      `tests/contract/gestao/test_horarios_crud.py`
- [x] T020 [P] [US4] Contract test dos conflitos: sala e docente informados e gravação aceita; turma
      de outro período ou inativa não conflita; o próprio horário fora na edição; os dois tipos ao
      mesmo tempo, em `tests/contract/gestao/test_horarios_conflito.py` (SC-E3-004)
- [x] T021 [US4] `services/conflitos.py`, `repositories/horario_repository.py`,
      `services/horarios_service.py` (gestão), `schemas/horario.py`, `schemas/gestao/horarios.py` e
      rotas de `/gestao/turmas/{id}/horarios`

---

## Phase 6: US5 — Consultar os horários da turma (RF-45)

- [x] T022 [P] [US5] Integration test: vínculo de qualquer papel consulta, ordenado por dia e hora;
      sem vínculo, 403 `SEM_PERMISSAO`, exceto administração e coordenação; turma inativa, 404 para
      todos; turma sem grade, lista vazia, em `tests/integration/test_horario_acesso_por_vinculo.py`
- [x] T023 [US5] Consulta em `horarios_service` e rota `GET /turmas/{id}/horarios`

---

## Phase 7: Ponta a ponta e polimento

- [ ] T024 [P] Matriz de permissões da E3 em `tests/contract/gestao/test_permissoes_matriz_e3.py`:
      cada rota de eventos e horários × quatro perfis (spec §2.3, RF-43)
- [ ] T025 [P] E2E `tests/e2e/test_fluxo_agenda.py`: a coordenação cria um evento para duas turmas
      e a grade de uma delas; um aluno de uma das turmas vê o evento uma vez e a grade; um aluno de
      outra turma não vê nada (SC-E3-001, SC-E3-005)
- [ ] T026 Seed: eventos de exemplo (próximos, em andamento, encerrados neste mês, um arquivado e
      um editado com histórico) e a grade das turmas de teste, com um conflito de sala, idempotente
- [ ] T027 [P] Atualizar o `README.md` da API, o `quickstart.md` (fluxos com `curl`), o checklist da
      spec (`plan.md` e `tasks.md` gerados) e o `ER.architect` pelo gerador (fora do commit)
- [ ] T028 Validação manual do quickstart da E3 e evidência de testes em `evidencias/`

**Checkpoint**: E3 completa na API; as fases F2 do app e da web podem começar.

---

## Dependencies & Execution Order

- Phase 1 → todas. T002 (refatoração) antes de qualquer código de evento.
- Phase 2 → Phases 3 e 4 (consultar e auditar pedem eventos criados). Phase 3 e Phase 4 podem
  correr em paralelo.
- Phase 5 → Phase 6 (consultar a grade pede horários). Phases 5–6 são independentes das 2–4.
- Phase 7 por último.
- Testes de cada fase escritos e falhando antes da implementação.
