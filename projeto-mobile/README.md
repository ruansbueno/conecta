# CONECTA — Aplicativo Mobile

Aplicativo Flutter do CONECTA, para todos os usuários autenticados: avisos, turmas, solicitação de
inscrição, perfil e — na fase seguinte — agenda e horários.

A F1 está completa (66 de 66 tarefas): entrar, manter a sessão com segurança, ler os avisos,
acompanhar as turmas, inclusive sem rede, pedir inscrição numa turma e ver o perfil — com
acessibilidade e fonte a 200% verificadas em todas as telas e as evidências em
[`evidencias/`](evidencias/RELATORIO.md). Veja [Andamento](#andamento).

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `lib/` | Código: `config/`, `services/` (cliente HTTP, sessão, cache), `repositories/`, `models/`, `state/`, `ui/`, `theme/` |
| `test/` | Testes de unidade e de widget |
| `integration_test/` | Testes de integração com servidor falso |
| `.specify/memory/constitution.md` | Princípios que governam o app (cliente sem regra de negócio, sessão segura, camadas, design system) |
| `specs/001-app-conecta/spec.md` | Especificação funcional: escopo em fases, telas, user stories, requisitos RM-01 a RM-40 |
| `specs/001-app-conecta/plan.md` | Plano técnico: stack, estrutura de pastas, fluxos centrais |
| `specs/001-app-conecta/research.md` | Decisões técnicas com alternativas e motivos (D1 a D12) |
| `specs/001-app-conecta/data-model.md` | Modelos do app e regras de apresentação |
| `specs/001-app-conecta/contracts/consumo-api.md` | Cada chamada que o app faz, com erros tratados |
| `specs/001-app-conecta/quickstart.md` | Como rodar contra a API local e o roteiro de verificação |
| `specs/001-app-conecta/tasks.md` | 66 tarefas da fase F1, agrupadas por user story |
| `specs/001-app-conecta/checklists/requirements.md` | Checklist de qualidade da spec |

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

Atualizado em 01/11/2026.

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

**Testes**: 348 de unidade e de widget (`flutter test`), mais 22 de integração no aparelho com servidor falso
em `integration_test/`.

## Como rodar

Com a API no ar (veja [`projeto-api/README.md`](../projeto-api/README.md)):

```bash
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000   # emulador Android
flutter run --dart-define=API_BASE_URL=http://localhost:8000  # iOS ou desktop
flutter test                                                   # unidade e widget
```

O roteiro completo está em [`quickstart.md`](specs/001-app-conecta/quickstart.md).

## Próximo passo

O aplicativo está completo nas fases F1 e F2. A integração real com o Moodle é da API (o app não
muda, RM-40).
