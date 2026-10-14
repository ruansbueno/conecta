# CONECTA — Aplicativo Mobile

Aplicativo Flutter do CONECTA, para todos os usuários autenticados: avisos, turmas, solicitação de
inscrição, perfil e — na fase seguinte — agenda e horários.

Este repositório contém, por enquanto, **apenas a documentação de planejamento**. Nenhuma linha de
código do aplicativo foi escrita.

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
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
| **F1** | Login e sessão, avisos, turmas, solicitações, perfil, cache local | Planejada, pronta para implementar |
| **F2** | Agenda (lista e mês), evento, horários | Especificada; aguarda a implementação da E3 na API (`002-agenda-horarios`) |

## Stack

Flutter · `provider` (estado) · `Navigator` com rotas nomeadas · `http` com cliente próprio ·
`flutter_secure_storage` (token) · `shared_preferences` (cache) · `intl` (datas em pt-BR).

## Próximo passo

Executar as tarefas de `specs/001-app-conecta/tasks.md`, na ordem das fases, começando pelo
Setup. Nada deve ser implementado sem a tarefa correspondente.
