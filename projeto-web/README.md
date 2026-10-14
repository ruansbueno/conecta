# CONECTA — Plataforma Web de Gestão

Plataforma web do CONECTA, em Next.js, para administração, coordenação e docentes: publicar e
auditar avisos, gerir turmas e vínculos, decidir solicitações de inscrição e administrar perfis
de acesso. É aqui que a informação entra no sistema; o aplicativo mobile é quem a entrega.

Este diretório contém, por enquanto, **apenas a documentação de planejamento**. Nenhuma linha de
código da plataforma foi escrita.

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `.specify/memory/constitution.md` | Princípios que governam a plataforma (cliente sem regra de negócio, token fora do navegador, dados no servidor, acessibilidade) |
| `specs/001-plataforma-gestao/spec.md` | Especificação funcional: escopo em fases, 16 telas, 7 user stories, requisitos RW-01 a RW-44 |
| `specs/001-plataforma-gestao/plan.md` | Plano técnico: stack, estrutura de pastas, fluxos de sessão, leitura e escrita |
| `specs/001-plataforma-gestao/research.md` | Decisões técnicas com alternativas e motivos (D1 a D13) |
| `specs/001-plataforma-gestao/data-model.md` | Tipos derivados do contrato e regras de apresentação |
| `specs/001-plataforma-gestao/contracts/consumo-api.md` | Cada chamada que a plataforma faz, com erros tratados |
| `specs/001-plataforma-gestao/quickstart.md` | Como rodar contra a API local e o roteiro de verificação |
| `specs/001-plataforma-gestao/tasks.md` | 74 tarefas da fase F1, agrupadas por user story |
| `specs/001-plataforma-gestao/checklists/requirements.md` | Checklist de qualidade da spec |

## Relação com os outros projetos

- **`projeto-api`** — a API REST que a plataforma consome (endpoints `/gestao/*`). As regras de
  negócio moram lá; o contrato é a fonte da verdade e prevalece sobre esta documentação.
- **`projeto-mobile`** — o outro cliente da mesma API. Tudo publicado aqui é entregue lá, e os
  dois compartilham o mesmo vocabulário visual.
- **`design/`** — as telas desenhadas (`design/web/`) e os tokens visuais (`design/README.md`).

## Fases

| Fase | Conteúdo | Situação |
|---|---|---|
| **F1** | Login e sessão, painel, avisos com destinos/histórico/versões, turmas, vínculos, solicitações, usuários e perfis | Planejada, pronta para implementar |
| **F2** | Gestão de agenda e de horários das turmas | Especificada; bloqueada até a spec E3 da API existir |

## Stack

Next.js (App Router) · TypeScript estrito · Tailwind CSS · `zod` para validar a borda ·
sessão em cookie `httpOnly` · leitura em Server Components, escrita em Server Actions ·
Vitest + Testing Library e Playwright nos testes.

A decisão que organiza o projeto: **o navegador nunca vê o token**. Toda chamada à API parte do
servidor da plataforma, e `src/server/` é marcado `server-only` para que uma importação indevida
quebre a compilação em vez de depender de revisão.

## Próximo passo

Executar as tarefas de `specs/001-plataforma-gestao/tasks.md`, na ordem das fases, começando pelo
Setup. Nada deve ser implementado sem a tarefa correspondente.
