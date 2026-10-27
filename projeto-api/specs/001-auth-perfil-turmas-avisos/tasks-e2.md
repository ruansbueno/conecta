# Tasks: Gestão — Entrega 2 (API)

**Input**: [plan-e2.md](./plan-e2.md), [spec.md](./spec.md) v2.1, [contracts/api.md](./contracts/api.md)
§10–15, [data-model.md](./data-model.md) (AvisoVersao, AvisoEvento).

**Escopo**: somente a **Entrega 2** (`/gestao/*`, versões, histórico e E2E da §9.3). Numeração a
partir de T101 para não colidir com a E1 ([tasks.md](./tasks.md)).

**Tests**: incluídas, escritas antes da implementação. Contrato em `tests/contract/gestao/`,
regras em `tests/integration/gestao/`, ponta a ponta em `tests/e2e/`. Testes que logam pelo mock
levam `@pytest.mark.mock_auth`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência incompleta)
- **[Story]**: US3 (aprovação, parte E2), US5 (usuários, turmas, vínculos), US6 (avisos)

---

## Phase 1: Foundational E2 (bloqueia as demais)

- [x] T101 `src/models/aviso_versao.py` e `src/models/aviso_evento.py` conforme `data-model.md`
      (JSONB para `destinos` e `alteracoes`; `tipo` do evento com `CHECK`; único
      `aviso_id`+`versao` na versão) e registro em `src/db/base.py`
- [x] T102 Migração Alembic de `aviso_versao` e `aviso_evento`, com os triggers que rejeitam
      `UPDATE`/`DELETE` (D-E2-3)
- [x] T103 [P] Teste de integração da imutabilidade: `UPDATE` e `DELETE` em versão e evento falham
      no banco, em `tests/integration/gestao/test_auditoria_imutavel.py` (spec §3.5)
- [x] T104 `src/services/permissoes.py`: `exigir_perfil`, `leciona(usuario, turma_id)`,
      `turmas_que_leciona(usuario)` e mensagens 403 (`SEM_PERMISSAO`, `DESTINO_NAO_PERMITIDO`)
- [x] T105 [P] Novos erros de domínio em `src/api/errors.py`: `TURMA_NAO_ENCONTRADA`,
      `USUARIO_NAO_ENCONTRADO`, `VINCULO_NAO_ENCONTRADO`, `PERFIL_INCOMPATIVEL`,
      `CODIGO_TURMA_DUPLICADO`, `AVISO_NAO_EDITAVEL`, `AVISO_SITUACAO_INVALIDA`,
      `DESTINO_NAO_PERMITIDO`
- [x] T106 Pacote `src/api/routes/gestao/` com router `/gestao` registrado em `src/main.py`
- [ ] T107 [P] Contract test: aluno recebe 403 `SEM_PERMISSAO` em toda rota `/gestao/*`; sem
      autenticação, 401; escrita por cookie sem CSRF, 403 `CSRF_INVALIDO`, em
      `tests/contract/gestao/test_gestao_acesso.py` (RF-10)

**Checkpoint**: modelo de auditoria e base de permissões prontos.

---

## Phase 2: US5 — Usuários e perfis (RF-09)

- [x] T108 [P] [US5] Contract test `GET /gestao/usuarios` (filtros `q`, `perfil`, `ativo`;
      paginação; coordenação lê; docente 403), `GET /gestao/usuarios/{id}` (com `turmas`; 404) e
      `PATCH /gestao/usuarios/{id}` (200; coordenação 403; 404; 409 `PERFIL_INCOMPATIVEL`; 422) em
      `tests/contract/gestao/test_gestao_usuarios.py`
- [x] T109 [P] [US5] Integration test: perfil alterado vale na requisição seguinte do usuário;
      desativar corta o token em uso; administrador não desativa a si próprio; último
      administrador ativo não é rebaixado nem desativado (D-E2-9), em
      `tests/integration/gestao/test_usuarios_regras.py` (US5 cenários 1–2)
- [x] T110 [US5] Schemas, repositório (busca, filtros, contagem), `usuarios_gestao_service` e
      rotas `src/api/routes/gestao/usuarios.py`; `atualizado_em` atualizado em mudança de
      perfil/ativo

---

## Phase 3: US5 — Turmas (RF-18)

- [x] T111 [P] [US5] Contract test `POST /gestao/turmas` (201 com `ativa`, `criado_em`; 409
      `CODIGO_TURMA_DUPLICADO`; 422 de cada campo, `periodo_letivo` `AAAA/N`), `GET /gestao/turmas`
      (filtros, `total_alunos`, `total_docentes`), `GET /gestao/turmas/{id}` (404),
      `PATCH` (parcial; `ativa`; 409; 422) e `DELETE` (204 lógico; 404) em
      `tests/contract/gestao/test_gestao_turmas.py`
- [x] T112 [P] [US5] Integration test: docente lista só as turmas em que leciona e recebe 403 no
      detalhe de turma alheia (D-E2-1); docente não cria nem edita turma; turma desativada
      preserva vínculos e suspende avisos por turma/semestre, em
      `tests/integration/gestao/test_turmas_regras.py`
- [x] T113 [US5] Schemas, repositório (filtros e contagens por papel), `turmas_gestao_service` e
      rotas `src/api/routes/gestao/turmas.py`

---

## Phase 4: US5 — Vínculos (RF-19)

- [x] T114 [P] [US5] Contract test `GET /gestao/turmas/{id}/vinculos` (filtro `papel`; docente da
      turma lê; docente alheio 403), `POST` (201; 404 turma/usuário; 409 `JA_VINCULADO`; 409
      `PERFIL_INCOMPATIVEL`; 422) e `DELETE …/vinculos/{usuario_id}` (204; 404
      `VINCULO_NAO_ENCONTRADO`) em `tests/contract/gestao/test_gestao_vinculos.py`
- [x] T115 [P] [US5] Integration test: coordenação vincula docente → docente passa a receber os
      avisos da turma e pode aprovar as solicitações dela; docente não vincula aluno (403);
      remover vínculo corta o acesso aos avisos na hora; vínculo criado por gestão tem
      `origem = gestao` e `criado_por`, em `tests/integration/gestao/test_vinculos_regras.py`
      (US5 cenários 3–4)
- [x] T116 [US5] Schemas, `vinculos_service` (papel = perfil; administração/coordenação sem
      vínculo) e rotas `src/api/routes/gestao/vinculos.py`; `PATCH` de usuário passa a usar a
      mesma regra para `PERFIL_INCOMPATIVEL`

---

## Phase 5: US3 (E2) — Decisão de solicitações (RF-17)

- [x] T117 [P] [US3] Contract test `GET /gestao/solicitacoes` (padrão `pendente`; filtros
      `status`, `turma_id`; docente vê só as suas turmas), `POST …/aprovar` e `POST …/recusar`
      (200 com `decidida_por`/`decidida_em`; `motivo` até 300; 403 docente alheio; 404; 409
      `SOLICITACAO_NAO_PENDENTE`; 409 `JA_VINCULADO`) em
      `tests/contract/gestao/test_gestao_solicitacoes.py`
- [x] T118 [P] [US3] Integration test: aprovar cria o vínculo na mesma transação; aprovação com
      vínculo já existente marca `recusada` e responde 409 (D-E2-8); decisões simultâneas sobre a
      mesma solicitação → uma vence, a outra 409; docente da turma A não decide na B (US5 cenário 5),
      em `tests/integration/gestao/test_aprovacao_cria_vinculo.py`
- [x] T119 [US3] Schemas, `solicitacoes_gestao_service` (lock, regras de docente, auto-recusa) e
      rotas `src/api/routes/gestao/solicitacoes.py`; `scripts/aprovar_solicitacao.py` passa a usar o
      serviço (D-E2-10)

---

## Phase 6: US6 — Avisos: publicação e ciclo de vida (RF-24, RF-25, RF-26, RF-34)

- [x] T120 [P] [US6] Contract test `POST /gestao/avisos` (201 no formato de gestão com
      `versao_atual: 1`; 403 `DESTINO_NAO_PERMITIDO`; 404 `TURMA_NAO_ENCONTRADA`; 422: campos,
      `publicar_em` no passado, destino repetido, turma inativa, `turma_id`/`semestre` no tipo
      errado, 0 ou 21 destinos) em `tests/contract/gestao/test_gestao_avisos_criar.py`
- [x] T121 [P] [US6] Contract test `GET /gestao/avisos` (filtros `situacao` incl. `agendado` e
      `excluido`, `autor_id`, `turma_id`, `q`; docente só os seus; `excluido` 403 ao docente) e
      `GET /gestao/avisos/{id}` (403 docente/aviso alheio; 404) em
      `tests/contract/gestao/test_gestao_avisos_listar.py`
- [x] T122 [P] [US6] Contract test `PATCH /gestao/avisos/{id}` (200 com `versao_atual` + 1 e
      `editado_em`; `destinos` substitui a lista; 409 `AVISO_NAO_EDITAVEL`; 422 "nenhuma
      alteração"; 403), `POST …/arquivar`, `POST …/desarquivar` (409 `AVISO_SITUACAO_INVALIDA`) e
      `DELETE` (204; some de `/avisos` e de `/gestao/avisos`) em
      `tests/contract/gestao/test_gestao_avisos_ciclo.py`
- [x] T123 [P] [US6] Integration test: docente publica só para turmas em que leciona e só com
      destinos `turma` (US6 cenário 2); docente não edita aviso alheio (cenário 6); edição que
      remove um destino tira o aviso de quem deixou de ser alcançado; agendado aparece em
      `situacao=agendado` e não em `ativo` até a data; `publicar_em` alterado/anulado (D-E2-6),
      em `tests/integration/gestao/test_docente_destinos_permitidos.py` e
      `tests/integration/gestao/test_aviso_ciclo_de_vida.py`
- [x] T124 [US6] `src/models` sem mudança; repositórios de versão e evento; `avisos_gestao_service`
      (validação de destinos e permissões, transação única com versão e evento, diff para
      `alteracoes`, lock por aviso) e rotas `src/api/routes/gestao/avisos.py`

---

## Phase 7: US6 — Versões e histórico (RF-27, RF-28)

- [x] T125 [P] [US6] Contract test `GET /gestao/avisos/{id}/versoes` e `…/historico` (da mais
      recente para a mais antiga; paginação; docente só dos seus; excluído consultável por
      administração/coordenação; 403; 404) em `tests/contract/gestao/test_gestao_avisos_auditoria.py`
- [x] T126 [P] [US6] Integration test: cada operação gera exatamente um evento com usuário e data;
      edição registra só os campos alterados com `de`/`para`; versões preservam o conteúdo de cada
      versão; falha no meio da operação não deixa versão nem evento órfão (D-E2-4), em
      `tests/integration/gestao/test_aviso_auditoria.py`
- [x] T127 [US6] Rotas de versões e histórico em `src/api/routes/gestao/avisos.py`

---

## Phase 8: Ponta a ponta e polimento

- [x] T128 [P] E2E `tests/e2e/test_fluxo_publicar_receber.py`: roteiro completo da `spec.md` §9.3
      (8 passos) só pelos endpoints, com logins pelo mock (RF-30, SC-007)
- [x] T129 [P] Matriz de permissões da E2 em `tests/contract/gestao/test_permissoes_matriz_e2.py`:
      cada rota `/gestao/*` × quatro perfis (RF-10)
- [x] T130 Seed: avisos de exemplo passam a ter versão 1 e evento `criado`; um aviso editado (2
      versões) e um com histórico de arquivamento, para a web exibir linha do tempo
- [x] T131 [P] Atualizar `README.md` da API, `quickstart.md` (fluxos de gestão com `curl`) e o
      README raiz
- [x] T132 Validação manual do quickstart de gestão e evidência de testes arquivada em
      `evidencias/`

**Checkpoint**: E2 completa; a plataforma web (fase F1) pode ser implementada contra a API.

---

## Dependencies & Execution Order

- Phase 1 → Phases 2–7. Phase 4 (vínculos) usa a regra de `PERFIL_INCOMPATIVEL` também no
  `PATCH` de usuário (Phase 2). Phase 7 depende da Phase 6. Phase 8 por último.
- Testes de cada fase escritos e falhando antes da implementação.
