# CONECTA — Aplicativo Mobile

Aplicativo Flutter do CONECTA, para todos os usuários autenticados: avisos, agenda, horários,
turmas, solicitação de inscrição e perfil.

As fases F1 e F2 estão completas: entrar, manter a sessão com segurança, ler os avisos, consultar a
agenda e a grade de horários, acompanhar as turmas, inclusive sem rede, pedir inscrição numa turma
e ver o perfil — com as evidências em [`evidencias/`](evidencias/). Verificado no Android
(emulador Android 16). Veja [Andamento](#andamento).

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `lib/` | Código: `config/`, `services/` (cliente HTTP, sessão, cache), `repositories/`, `models/`, `state/`, `ui/`, `theme/` |
| `test/` | Testes de unidade e de widget |
| `integration_test/` | Testes de integração com servidor falso |
| `.specify/memory/constitution.md` | Princípios que governam o app (cliente sem regra de negócio, sessão segura, camadas, design system) |
| `specs/001-app-conecta/spec.md` | Especificação funcional: escopo em fases, telas, user stories, requisitos RM-01 a RM-41 |
| `specs/001-app-conecta/plan.md` | Plano técnico: stack, estrutura de pastas, fluxos centrais |
| `specs/001-app-conecta/research.md` | Decisões técnicas com alternativas e motivos (D1 a D12) |
| `specs/001-app-conecta/data-model.md` | Modelos do app e regras de apresentação |
| `specs/001-app-conecta/contracts/consumo-api.md` | Cada chamada que o app faz, com erros tratados |
| `specs/001-app-conecta/quickstart.md` | Como rodar contra a API local e o roteiro de verificação |
| `specs/001-app-conecta/tasks.md` | 66 tarefas da fase F1, agrupadas por user story |
| `specs/001-app-conecta/checklists/requirements.md` | Checklist de qualidade da spec |

Siglas usadas nas specs e nas tabelas: **US** = história de usuário; **RM** = requisito do
aplicativo; **m-xx** = tela desenhada em `design/mobile/`; **Txxx** = tarefa do `tasks.md`;
**Dn** = decisão técnica do `research.md`.

## Relação com os outros projetos

- **`projeto-api`** — a API REST que o app consome. As regras de negócio moram lá; o contrato
  `specs/001-auth-perfil-turmas-avisos/contracts/api.md` é a fonte da verdade e prevalece sobre
  esta documentação em caso de divergência.
- **`design/`** — as telas desenhadas (`design/mobile/`) e os tokens visuais (`design/README.md`),
  que esta spec transforma em requisitos.

## Fases

| Fase | Conteúdo | Situação |
|---|---|---|
| **F1** | Login e sessão, avisos, turmas, solicitações, perfil, cache local | ✅ Completa (8 de 8 fases) |
| **F2** | Agenda (lista e mês), evento, horários | ✅ Completa (fases 9 a 12): agenda [#28](https://github.com/ruansbueno/conecta/pull/28), horários e polimento [#29](https://github.com/ruansbueno/conecta/pull/29) — [`plan-f2.md`](specs/001-app-conecta/plan-f2.md), [`tasks-f2.md`](specs/001-app-conecta/tasks-f2.md) |

## Stack

Flutter · `provider` (estado) · `Navigator` com rotas nomeadas · `http` com cliente próprio ·
`flutter_secure_storage` (token) · `shared_preferences` (cache) · `intl` (datas em pt-BR).

## Andamento

| Fase da F1 | Conteúdo | Situação |
|---|---|---|
| 1. Setup | Projeto Flutter, dependências, análise estática | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 2. Fundação | Tema do design, cliente HTTP com tratamento central de erros, sessão no armazenamento seguro, cache local, casca com abas | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 3. US1 — Entrar | Login, sessão de 24 h, sessão expirada e acesso desativado | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 4. US2 — Ler os avisos | Avisos ativos e arquivados, detalhe, paginação, abrir sem rede com a última lista recebida | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 5. US3 — Minhas turmas | Minhas turmas com o papel (m-06), estado vazio por perfil, turmas disponíveis só para aluno (m-07), solicitações recentes, cache sem rede | ✅ [#14](https://github.com/ruansbueno/conecta/pull/14) |
| 6. US4 — Solicitar inscrição | Solicitar e folha de confirmação (m-08), Minhas solicitações com os quatro status (m-09), cancelar a pendente, recarga de Minhas turmas | ✅ [#15](https://github.com/ruansbueno/conecta/pull/15) |
| 7. US5 — Perfil | Perfil (m-13) com curso, período e vínculos; saída com confirmação; perfil reavaliado ao abrir a aba e ao voltar do segundo plano | ✅ [#16](https://github.com/ruansbueno/conecta/pull/16) |
| — Pontos menores | Achados menores das revisões das fases 4 a 7 (respostas fora de ordem, recargas repetidas, faixa de dados guardados, telas empilhadas quando o perfil muda) | ✅ [#17](https://github.com/ruansbueno/conecta/pull/17) |
| 8. Polimento e evidências | Mensagens conferidas contra a spec, acessibilidade e fonte a 200% em todas as telas, uso sem rede, log de falhas, token só no armazenamento seguro, comparação com o design | ✅ [#18](https://github.com/ruansbueno/conecta/pull/18) |

| Fase da F2 | Conteúdo | Situação |
|---|---|---|
| 9. Fundação da F2 | Modelos de evento e aula, repositórios da E3, cache da agenda e da grade por turma, `EVENTO_NAO_ENCONTRADO` | ✅ [#28](https://github.com/ruansbueno/conecta/pull/28) |
| 10. US6a — Agenda | Aba Agenda: Próximos e Provas com filtro de tipo (m-10), mês de domingo a sábado com marcadores (m-10b), detalhe do evento (m-11), sem rede com o que estava guardado | ✅ [#28](https://github.com/ruansbueno/conecta/pull/28) |
| 11. US6b — Horários | Aba Horários: grade da turma por dia (m-12), troca de turma com a escolha lembrada, mensagens próprias quando o vínculo some, grade guardada por turma | ✅ [#29](https://github.com/ruansbueno/conecta/pull/29) |
| 12. Polimento da F2 | Sem rede na agenda e na grade, fonte a 200% conferida no aparelho, leitor de tela, comparação com o design | ✅ [#29](https://github.com/ruansbueno/conecta/pull/29) |
| — Login pelo IFSul | Mensagens de acesso pendente e recusado (RM-41); login sem menção ao Moodle | ✅ [#31](https://github.com/ruansbueno/conecta/pull/31) |
| — Modo noturno ([spec 002](specs/002-modo-noturno/spec.md)) | Botão de lua e sol no canto superior direito de todas as telas, inclusive o login e "Sem conexão"; segue o sistema até a pessoa escolher, e a escolha fica no aparelho (continua depois de sair da conta); paleta escura com contraste AA conferido; fecho "não há mais" nas listas curtas | ✅ [#36](https://github.com/ruansbueno/conecta/pull/36) |

**Testes** (registro de 11/11/2026, com o modo noturno, [`testes-app-2026-11-11.txt`](evidencias/testes-app-2026-11-11.txt)):
408 de unidade e de widget (`flutter test`, com a acessibilidade nos dois temas) e 22 de integração
no emulador, com servidor falso, em `integration_test/`. Antes do modo noturno: registro de 06/11
([`testes-app-final-2026-11-06.txt`](evidencias/testes-app-final-2026-11-06.txt)) e o de 10/11, com
cada teste pelo nome ([`testes-app-por-teste-2026-11-10.txt`](evidencias/testes-app-por-teste-2026-11-10.txt)).

## Como rodar

Com a API no ar (veja [`projeto-api/README.md`](../projeto-api/README.md)):

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000   # emulador Android
flutter test                                                   # unidade e widget
flutter test integration_test -d <id do emulador>              # integração, com servidor falso
```

Num celular Android ligado por USB, use `adb reverse tcp:8000 tcp:8000` e
`--dart-define=API_BASE_URL=http://localhost:8000`: o app só aceita HTTP sem TLS para o emulador
(`10.0.2.2`) e para `localhost`. O roteiro completo está em
[`quickstart.md`](specs/001-app-conecta/quickstart.md).
