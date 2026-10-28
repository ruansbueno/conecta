# CONECTA — Aplicativo Mobile

Aplicativo Flutter do CONECTA, para todos os usuários autenticados: avisos, turmas, solicitação de
inscrição, perfil e — na fase seguinte — agenda e horários.

O marco de avisos da F1 está implementado (fases 1 a 4, 40 de 66 tarefas): entrar, manter a
sessão com segurança e ler os avisos, inclusive sem rede. Veja [Andamento](#andamento).

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
| **F1** | Login e sessão, avisos, turmas, solicitações, perfil, cache local | Em andamento: marco de avisos pronto (fases 1–4 de 8) |
| **F2** | Agenda (lista e mês), evento, horários | Especificada; aguarda a implementação da E3 na API (`002-agenda-horarios`) |

## Stack

Flutter · `provider` (estado) · `Navigator` com rotas nomeadas · `http` com cliente próprio ·
`flutter_secure_storage` (token) · `shared_preferences` (cache) · `intl` (datas em pt-BR).

## Andamento

Atualizado em 28/10/2026.

| Fase da F1 | Conteúdo | Situação |
|---|---|---|
| 1. Setup | Projeto Flutter, dependências, análise estática | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 2. Fundação | Tema do design, cliente HTTP com tratamento central de erros, sessão no armazenamento seguro, cache local, casca com abas | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 3. US1 — Entrar | Login, sessão de 24 h, sessão expirada e acesso desativado | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 4. US2 — Ler os avisos | Avisos ativos e arquivados, detalhe, paginação, abrir sem rede com a última lista recebida | ✅ [#2](https://github.com/ruansbueno/conecta/pull/2) |
| 5. US3 — Minhas turmas | Turmas em que a pessoa tem vínculo e turmas disponíveis para solicitar | A fazer |
| 6. US4 — Solicitar inscrição | Pedir inscrição, acompanhar o status e cancelar | A fazer |
| 7. US5 — Perfil | Dados da pessoa, atualizados quando o perfil muda no servidor | A fazer |
| 8. Polimento e evidências | Mensagens de erro, acessibilidade, fonte a 200%, uso sem rede, comparação com o design | A fazer |

**Testes**: 151 de unidade e de widget (`flutter test`), mais os de integração com servidor falso
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

Fase 5 de [`tasks.md`](specs/001-app-conecta/tasks.md): turmas. Pela ordem de execução do projeto,
vem depois da plataforma web F1. Nada deve ser implementado sem a tarefa correspondente.
