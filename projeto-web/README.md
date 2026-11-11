# CONECTA — Plataforma Web de Gestão

Plataforma web do CONECTA, em React, para administração, coordenação e docentes: publicar e
auditar avisos, gerir turmas e vínculos, decidir solicitações de inscrição e administrar perfis
de acesso. É aqui que a informação entra no sistema; o aplicativo mobile é quem a entrega.

As fases F1 e F2 estão completas: entrar na plataforma, publicar avisos para o público certo,
acompanhar e auditar tudo o que foi publicado, manter turmas e vínculos, decidir as solicitações de
inscrição e os pedidos de acesso, administrar usuários e perfis, montar a agenda e a grade de
horários e acompanhar tudo pelo painel — com acessibilidade AA verificada, uso só com teclado, as
evidências em [`evidencias/`](evidencias/) e a implantação estática de referência em
[`deploy/`](deploy/). Veja [Andamento](#andamento).

## Onde está cada coisa

| Caminho | Conteúdo |
|---|---|
| `src/` | Código: `api/` (cliente HTTP, esquemas `zod`, recursos por endpoint), `sessao/`, `componentes/`, `paginas/`, `lib/`, `estilos/` |
| `tests/` | Testes de unidade e de componente (Vitest + Testing Library) |
| `e2e/` | Testes de ponta a ponta (Playwright) e o servidor falso que imita o contrato da API |
| `evidencias/` | Relatórios da F1 e da F2 (verificações, capturas de cada tela ao lado do design e as diferenças deliberadas) e os registros das execuções dos testes |
| `deploy/` | `nginx.conf` de referência e `verificar.sh` (build → nginx em Docker com HTTPS → API local) |
| `.specify/memory/constitution.md` | Princípios que governam a plataforma (cliente sem regra de negócio, token fora do navegador, dados no servidor, acessibilidade) |
| `specs/001-plataforma-gestao/spec.md` | Especificação funcional: escopo em fases, 16 telas, 7 user stories, requisitos RW-01 a RW-44 |
| `specs/001-plataforma-gestao/plan.md` | Plano técnico: stack, estrutura de pastas, fluxos de sessão, leitura e escrita |
| `specs/001-plataforma-gestao/research.md` | Decisões técnicas com alternativas e motivos (D1 a D15) |
| `specs/001-plataforma-gestao/data-model.md` | Tipos derivados do contrato e regras de apresentação |
| `specs/001-plataforma-gestao/contracts/consumo-api.md` | Cada chamada que a plataforma faz, com erros tratados |
| `specs/001-plataforma-gestao/quickstart.md` | Como rodar contra a API local e o roteiro de verificação |
| `specs/001-plataforma-gestao/tasks.md` | 77 tarefas da fase F1, agrupadas por user story |
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
| **F1** | Login e sessão, painel, avisos com destinos/histórico/versões, turmas, vínculos, solicitações, usuários e perfis | ✅ Completa (10 de 10 fases) |
| **F2** | Gestão de agenda e de horários das turmas | ✅ Completa (fases 11 a 14): agenda [#25](https://github.com/ruansbueno/conecta/pull/25), grade de horários e polimento [#26](https://github.com/ruansbueno/conecta/pull/26) — [`plan-f2.md`](specs/001-plataforma-gestao/plan-f2.md), [`tasks-f2.md`](specs/001-plataforma-gestao/tasks-f2.md) |

## Stack

React + TypeScript estrito, construídos com **Vite** · Tailwind CSS · React Router · `zod` para
validar a borda · Vitest + Testing Library e Playwright nos testes.

A saída é um **build estático**: arquivos servidos por nginx ou Apache na infraestrutura do
IFSul, no mesmo domínio da API. Não há servidor de aplicação nesta camada.

A decisão que organiza o projeto: **o JavaScript nunca alcança o token**. Quem emite o cookie de
sessão (`httpOnly`, `Secure`, `SameSite=Strict`) é a própria API; o navegador o envia sozinho em
cada chamada feita com `credentials: 'include'`. Disso decorrem duas obrigações: web e API na
mesma origem, e proteção CSRF em toda escrita.

## Andamento


| Fase da F1 | Conteúdo | Situação |
|---|---|---|
| 1. Setup | Projeto Vite, dependências, regras de lint próprias (cores só no tema, armazenamento só no rascunho, componentes sem acesso direto à API) | ✅ [#4](https://github.com/ruansbueno/conecta/pull/4) |
| 2. Fundação | Tema do design, cliente HTTP com cookie + CSRF, mapa único de erros, sessão, casca com navegação por perfil, componentes acessíveis | ✅ [#4](https://github.com/ruansbueno/conecta/pull/4) |
| 3. US1 — Entrar | Login (w-01), sem permissão (w-16), aluno orientado ao app, sessão expirada e acesso desativado | ✅ [#4](https://github.com/ruansbueno/conecta/pull/4) |
| 4. US2 — Publicar aviso | Editor (w-04), seletor de destinos (w-05), restrição do docente (w-15), agendamento, prévia do cartão do app, rascunho local, edição | ✅ [#4](https://github.com/ruansbueno/conecta/pull/4) |
| 5. US3 — Acompanhar e auditar | Lista por situação com busca e filtros (w-03), histórico e versões (w-06), arquivar, desarquivar e excluir | ✅ [#5](https://github.com/ruansbueno/conecta/pull/5) |
| 6. US4 — Turmas e vínculos | Lista com filtros (w-07), criar e editar, inscrições, desativar e reativar, detalhe com vínculos (w-08), vincular e desvincular | ✅ [#7](https://github.com/ruansbueno/conecta/pull/7) |
| 7. US5 — Solicitações | Fila por status e turma (w-09), destaque de espera, aprovar criando vínculo, recusar com motivo | ✅ [#8](https://github.com/ruansbueno/conecta/pull/8) |
| 8. US6 — Usuários e perfis | Lista por perfil e situação (w-10), alterar perfil e ativar/desativar só pela administração (w-11), mudança valendo na navegação seguinte | ✅ [#9](https://github.com/ruansbueno/conecta/pull/9) |
| 9. Painel e integração | Painel de coordenação e de docente (w-02, w-14), contador de solicitações na barra lateral e o e2e do fluxo completo web → API → app | ✅ [#10](https://github.com/ruansbueno/conecta/pull/10) |
| — Pontos menores | Achados menores das revisões das fases 5 a 9 (textos e datas, listas, foco e leitores de tela, comportamento, servidor falso) | ✅ [#11](https://github.com/ruansbueno/conecta/pull/11) |
| 10. Polimento e evidências | Mensagens de erro conferidas contra a spec, axe (WCAG 2.1 AA) em todas as telas, uso só com teclado, nada digitado se perde sem rede, evidências com capturas e implantação estática com nginx | ✅ [#13](https://github.com/ruansbueno/conecta/pull/13) |

| Fase da F2 | Conteúdo | Situação |
|---|---|---|
| 11. Fundação da F2 | Emenda `quando` na API, recursos e esquemas da E3, componentes comuns (destinos, linha do tempo), servidor falso com eventos e horários | ✅ [#25](https://github.com/ruansbueno/conecta/pull/25) |
| 12. US7a — Agenda | Abas Próximos, Mês, Realizados e Arquivados (w-12), calendário do mês, editor de evento com rascunho, ações e histórico com versões | ✅ [#25](https://github.com/ruansbueno/conecta/pull/25) |
| 13. US7b — Horários | Escolha da turma, grade semanal (w-13), modal de aula, conflitos como atenção, docentes da grade, "avisar a turma" levando ao aviso com a turma como destino | ✅ [#26](https://github.com/ruansbueno/conecta/pull/26) |
| 14. Polimento da F2 | E2E da agenda e dos horários, axe e teclado nas telas novas, validação visual contra a API real, rastreabilidade e mensagens | ✅ [#26](https://github.com/ruansbueno/conecta/pull/26) |

**Testes** (registro de 06/11/2026, [`testes-web-final-2026-11-06.txt`](evidencias/testes-web-final-2026-11-06.txt)):
414 de unidade e componente (Vitest), 61 de ponta a ponta (Playwright) e 11 da implantação
(`deploy/verificar.sh`); o registro de 10/11, com cada teste pelo nome, tem 62 de ponta a ponta
([`testes-web-por-teste-2026-11-10.txt`](evidencias/testes-web-por-teste-2026-11-10.txt)). Além disso, a validação visual de cada tela contra a
API local real ([F1](evidencias/RELATORIO.md), [F2](evidencias/RELATORIO-F2.md)).

## Como rodar

Com a API no ar em `http://localhost:8000` (veja [`projeto-api/README.md`](../projeto-api/README.md)):

```bash
npm install
npm run dev          # http://localhost:5173 — /api é encaminhado para a API local
```

Entre com os usuários do seed da API (`coord.teste`, `docente.teste`, `admin.teste`), senha
`senha-teste`.

```bash
npm run test         # unidade e componente (Vitest)
npx playwright install chromium   # uma vez, para os testes de ponta a ponta
npm run test:e2e     # ponta a ponta (Playwright), com o servidor falso — não precisa da API
npm run lint
npm run typecheck
npm run build        # site estático em dist/
deploy/verificar.sh  # build servido por nginx (Docker, HTTPS) com a API local em /api
```

O roteiro completo de verificação está em
[`quickstart.md`](specs/001-plataforma-gestao/quickstart.md).

## Instalação no IFSul

Ajustar em `deploy/nginx.conf` o `server_name`, os caminhos do certificado, o endereço da API e, se
o HTTPS público não usar a porta 443, a porta do redirecionamento de HTTP (`map` no topo do
arquivo). A premissa do modelo de sessão — plataforma e API no mesmo domínio, com a API sob `/api`
e HTTPS — está confirmada com a infraestrutura do IFSul (ver o passo 0 do `quickstart.md`).
