# Tasks: Aplicativo CONECTA — Fase F2 (agenda e horários)

**Input**: [plan-f2.md](./plan-f2.md) (D-AF2-1 a D-AF2-12), [spec.md](./spec.md) (US6, RM-24 a
RM-27), contracts E3 §1–3 (`projeto-api/specs/002-agenda-horarios/contracts/api.md`)

**Escopo**: telas T10–T13 (`m-10`, `m-10b`, `m-11`, `m-12`). A numeração continua a da F1, que
terminou em T066.

**Tests**: incluídos, escritos antes do código (RED → GREEN):

- **unidade e widget:** com `MockClient`;
- **integração:** no emulador, contra o servidor falso;
- **API real:** nenhum teste depende dela.

## Format: `[ID] [P?] [Story] Descrição`

- **[P]**: pode ser feita em paralelo
- **[US6a]**: agenda e evento
- **[US6b]**: horários

---

## Phase 9: Fundação da F2 (PR da agenda)

- [x] T067 [P] `test/unit/evento_test.dart` e `aula_test.dart`. Testes de conversão do JSON da E3:
  - tipo desconhecido vira `desconhecido`;
  - `fim`, `local` e `descricao` podem vir nulos;
  - as datas ficam em UTC;
  - as horas `HH:MM` ficam como texto.
- [x] T068 [P] `lib/models/evento.dart` e `aula.dart`, para os testes da T067 passarem
- [x] T069 [P] `test/unit/eventos_repository_test.dart` e `horarios_repository_test.dart`. Testes de
  repositório:
  - parâmetros de `GET /eventos`: sem janela; com `tipo`; com `de`, `ate`, `incluir_encerrados` e
    `limit=100`;
  - `GET /eventos/{id}`;
  - `GET /turmas/{id}/horarios?limit=100`;
  - cache gravado e lido para Próximos (sem filtro), para o mês corrente e para a grade por turma
    (D-AF2-8);
  - `apagarUsuario` também remove a grade.
- [x] T070 `lib/repositories/eventos_repository.dart` e `horarios_repository.dart`, mais os recursos
  novos de `lib/services/cache_local.dart` (`RecursoCache` com sufixo), para os testes da T069
  passarem
- [x] T071 [P] `EVENTO_NAO_ENCONTRADO` no mapa de falhas (`voltaLista`), com teste em
  `test/unit/api_failure_test.dart`
- [x] T072 Aba Agenda na casca (D-AF2-1) e rota do detalhe do evento. Teste de widget da barra.
  A aba Horários entra com a grade, na T083, para nenhuma entrega ter aba vazia.

**Checkpoint**: modelos, repositórios, cache e abas prontos; as telas novas ainda vazias.

---

## Phase 10: US6a — Agenda e evento (RM-24, RM-25, RM-26)

- [x] T073 [P] [US6a] `test/unit/calendario_test.dart`. Regras puras de calendário (D-AF2-3,
  D-AF2-4, D-AF2-9):
  - janela da grade começando no domingo, em hora local e enviada em UTC;
  - marcadores por dia: até 3, com a cor do tipo; o evento de vários dias marca cada dia;
  - eventos de um dia;
  - rótulo de horário no dia: início, "até HH:MM" ou "o dia todo";
  - faixa de horas do cartão;
  - agrupamento por data.
- [x] T074 [US6a] `lib/ui/agenda/calendario.dart` e as cores por tipo em `theme/` (D-AF2-10), para
  os testes da T073 passarem
- [x] T075 [P] [US6a] `test/widget/agenda_page_test.dart`. Teste da lista (m-10):
  - Próximos agrupados por data, com o cartão como na m-10;
  - rolagem infinita;
  - Provas com `tipo=prova`;
  - folha de tipos, com o filtro no título e a folha desabilitada em Provas;
  - estados vazio, de erro e de cache (faixa);
  - toque leva ao detalhe.
- [x] T076 [US6a] `lib/state/agenda_controller.dart`, `ui/agenda/agenda_page.dart`,
  `evento_card.dart` e `folha_tipos.dart`
- [x] T077 [P] [US6a] `test/widget/mes_view_test.dart`. Teste do mês (m-10b):
  - cabeçalho D S T Q Q S S, com ‹ › trocando a janela pedida;
  - hoje destacado e dia escolhido marcado, com o nome acessível começando pelo número;
  - lista do dia com "N atividades";
  - "Nenhuma atividade neste dia";
  - faixa acima de 100;
  - o tipo filtrado vale também no mês;
  - cache do mês corrente.
- [x] T078 [US6a] `lib/state/mes_controller.dart` e `ui/agenda/mes_view.dart`
- [x] T079 [P] [US6a] `test/widget/detalhe_evento_test.dart`. Teste do detalhe (m-11):
  - abre com o evento da lista e revalida;
  - vários dias;
  - sem local;
  - "editado em";
  - 404 volta à agenda com a mensagem e a recarrega;
  - sem rede, mostra o que veio da lista com a faixa;
  - aberto pela rota, sem o evento, mostra o esqueleto até a resposta.
- [x] T080 [US6a] `lib/ui/agenda/detalhe_page.dart`
- [x] T081 [US6a] Servidor falso de integração com eventos (D-AF2-12) e
  `integration_test/agenda_test.dart`:
  - próximos, Provas, mês com evento de vários dias e detalhe;
  - um evento excluído na API dá 404 e volta à lista.

**Checkpoint**: agenda completa no app. **Fim do PR da agenda.**

---

## Phase 11: US6b — Horários (RM-27; PR de horários e polimento)

- [ ] T082 [P] [US6b] `test/widget/horarios_page_test.dart`. Teste da grade (m-12):
  - sem vínculo: estado vazio com o texto da US6;
  - um vínculo: código como texto;
  - mais de um: a folha troca a turma, e a escolha fica lembrada;
  - vínculo que sumiu: volta à primeira turma;
  - grade agrupada por dia, só os dias com aula, com disciplina, horas, local e docente;
  - 403 e 404 com as mensagens próprias, recarregando as turmas (D-AF2-7);
  - cache por turma.
- [ ] T083 [US6b] `lib/state/horarios_controller.dart`, `ui/horarios/horarios_page.dart` e
  `folha_turmas.dart`; aba Horários na casca, completando as cinco da spec §3
- [ ] T084 [US6b] Servidor falso com a grade e `integration_test/horarios_test.dart`:
  - aluno com duas turmas troca a turma e vê a grade;
  - vínculo removido na API: mensagem e volta.

**Checkpoint**: horários completos no app.

---

## Phase 12: Polimento e evidências

- [ ] T085 [P] `integration_test/offline_test.dart`: agenda, mês corrente, detalhe e grade abrem sem
  rede com a faixa de data (SC-005)
- [ ] T086 [P] Telas novas com a fonte do sistema em 200%, sem cortes (RM-36). Leitor de tela: dias
  do mês, chips, cartões e folhas com nome e estado (RM-35).
- [ ] T087 [P] Comparar m-10, m-10b, m-11 e m-12 com capturas no emulador contra a API local real,
  registrando as diferenças deliberadas (D-AF2-11) em `evidencias/`
- [ ] T088 Fechar a documentação:
  - spec §3 (abas liberadas) e §11 (rastreabilidade RM-24 a RM-27 com os testes finais);
  - matriz de mensagens;
  - README do projeto;
  - relatório de execução anexado.

**Checkpoint**: F2 completa no app.

---

## Dependências

```
Fundação (T067–T072)   ← bloqueia as telas
   ├── US6a (T073–T081)
   └── US6b (T082–T084)   ← independente da agenda
         └── Polimento (T085–T088)
```

## Fora destas tarefas

- Criar e editar eventos ou aulas no app (é da gestão, na web).
- Notificação de evento próximo.
- Aba Realizados ou Arquivados no app: o desenho não as tem.
