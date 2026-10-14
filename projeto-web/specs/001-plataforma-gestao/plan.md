# Implementation Plan: Plataforma Web de Gestão (Fase F1; F2 planejada)

**Branch**: `001-plataforma-gestao` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-plataforma-gestao/spec.md`

## Summary

Plataforma web de gestão em Next.js (App Router) com TypeScript e Tailwind, para administração,
coordenação e docentes. **Esta implementação cobre a fase F1**: login com sessão em cookie
`httpOnly`, painel, avisos (lista, editor com destinos e agendamento, histórico e versões,
arquivar/desarquivar/excluir), turmas, vínculos, solicitações e administração de usuários e
perfis. A fase F2 (agenda e horários) está especificada e bloqueada até a spec E3 da API existir.

A forma do sistema vem de uma decisão: **o navegador nunca vê o token**. O login passa por uma
rota do próprio Next, que guarda o JWT em cookie `httpOnly`; a leitura de dados acontece em Server
Components e a escrita em Server Actions, ambos chamando a API a partir do servidor. Com isso, o
pacote JavaScript enviado ao navegador não contém token, URL interna nem lógica de autorização —
ele cuida de interação: formulários, seletor de destinos, modais e tabelas.

## Technical Context

**Language/Version**: TypeScript 5.x (modo estrito), Node.js 20 LTS

**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, `zod` (validação dos
formulários e das respostas da API na borda). Sem biblioteca de estado global, sem cliente HTTP e
sem biblioteca de formulário — ver `research.md`.

**Storage**: nenhum. Todo dado vive na API. O único estado persistido no navegador é um rascunho
local de formulário longo (editor de aviso), sem qualquer dado de sessão.

**Testing**: Vitest + Testing Library para unidade e componente; Playwright para ponta a ponta
contra um servidor falso que implementa o contrato. Nenhum teste depende da API real.

**Target Platform**: navegador em desktop (duas últimas versões de Chrome, Firefox, Safari, Edge),
a partir de 1280 px. Servidor Node para a camada Next.

**Project Type**: web (aplicação única; a API é externa a este diretório)

**Performance Goals**: primeira exibição útil de uma lista em até 2 s em rede institucional;
navegação entre telas sem recarregar a página inteira; nenhuma lista bloqueia a interface enquanto
carrega — o esqueleto aparece primeiro.

**Constraints**: token exclusivamente em cookie `httpOnly` (Princípio III); nenhuma chamada do
navegador direto à API (Princípio IV); comportamento por `code` (Princípio II); nenhuma regra de
negócio no cliente (Princípio I); operação completa por teclado e contraste AA (Princípio V).

**Scale/Scope**: escala institucional; escopo desta fase: 14 telas de F1 e 19 endpoints de gestão,
mais login e perfil.

## Constitution Check

*GATE: verificado antes da Fase 0 e revisto após a Fase 1.*

| Princípio | Como o plano atende |
|---|---|
| I. Cliente sem regra de negócio | Nenhuma verificação de permissão decide o que é exibido além de esconder itens de menu; toda tela tem caminho para `403`; a restrição de destino do docente é apresentada, mas quem recusa é a API |
| II. Contrato como fonte da verdade | `ApiError` carrega `code`; um único mapa `code → (mensagem, efeito)`; respostas validadas por esquemas `zod` derivados do contrato |
| III. Token fora do navegador | Cookie `httpOnly` escrito em Route Handler; `apiFetch` só existe em módulo marcado `server-only` |
| IV. Dados no servidor | Leitura em Server Components, escrita em Server Actions; componentes de cliente recebem dados já prontos por propriedade |
| V. Design system e acessibilidade | Tokens no tema do Tailwind; componentes acessíveis próprios (modal com foco preso, tabela com cabeçalho associado); auditoria por tela |
| VI. Simplicidade | Quatro dependências de produção, todas justificadas em `research.md`; nenhuma biblioteca de estado ou de dados |

**Resultado**: conforme, sem desvio a registrar.

## Project Structure

```text
projeto-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # html, fontes, tema
│   │   ├── login/page.tsx              # T01
│   │   ├── sem-permissao/page.tsx      # T16
│   │   ├── (gestao)/                   # grupo com sessão exigida
│   │   │   ├── layout.tsx              # busca GET /me, monta barra lateral por perfil
│   │   │   ├── painel/page.tsx         # T02 e T14 (variam pelo perfil)
│   │   │   ├── avisos/
│   │   │   │   ├── page.tsx            # T03
│   │   │   │   ├── novo/page.tsx       # T04 / T15
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx        # conteúdo do aviso
│   │   │   │       ├── editar/page.tsx
│   │   │   │       └── historico/page.tsx   # T06
│   │   │   ├── turmas/
│   │   │   │   ├── page.tsx            # T07
│   │   │   │   └── [id]/page.tsx       # T08
│   │   │   ├── solicitacoes/page.tsx   # T09
│   │   │   └── usuarios/page.tsx       # T10 (+ T11 em modal)
│   │   └── api/sessao/route.ts         # POST entra, DELETE sai (grava/remove o cookie)
│   ├── server/                         # tudo aqui é "server-only"
│   │   ├── api.ts                      # apiFetch: base, token do cookie, timeout, erro
│   │   ├── erros.ts                    # ApiError + mapa code → mensagem/efeito
│   │   ├── sessao.ts                   # ler, gravar e apagar o cookie; encerrar sessão
│   │   ├── schemas.ts                  # esquemas zod do contrato
│   │   └── recursos/                   # uma função por endpoint
│   │       ├── auth.ts   avisos.ts   turmas.ts
│   │       ├── vinculos.ts   solicitacoes.ts   usuarios.ts
│   ├── acoes/                          # Server Actions (escrita)
│   │   ├── avisos.ts                   # criar, editar, arquivar, desarquivar, excluir
│   │   ├── turmas.ts                   # criar, editar, desativar
│   │   ├── vinculos.ts                 # vincular, desvincular
│   │   ├── solicitacoes.ts             # aprovar, recusar
│   │   └── usuarios.ts                 # alterar perfil, ativar/desativar
│   ├── componentes/
│   │   ├── layout/{barra-lateral,barra-superior}.tsx
│   │   ├── comum/{chip-destino,selo-situacao,tabela,estado-vazio,
│   │   │          estado-erro,modal,confirmacao,paginacao,busca}.tsx
│   │   ├── avisos/{lista,editor,seletor-destinos,previa-app,linha-do-tempo,versoes}.tsx
│   │   ├── turmas/{tabela-turmas,form-turma,tabela-vinculos,form-vinculo}.tsx
│   │   ├── solicitacoes/{tabela,recusar-modal}.tsx
│   │   └── usuarios/{tabela,alterar-perfil-modal}.tsx
│   ├── estilos/globals.css             # Tailwind + tokens
│   └── lib/{datas.ts,texto.ts}         # formatação em pt-BR, trechos, iniciais
├── tests/
│   ├── unit/                           # api, erros, schemas, datas
│   └── componente/                     # uma pasta por área
├── e2e/                                # Playwright + servidor falso do contrato
│   ├── servidor-falso/
│   └── *.spec.ts
├── middleware.ts                       # exige cookie nas rotas de gestão
└── specs/001-plataforma-gestao/        # esta documentação
```

**Structure Decision**: separação por responsabilidade de execução, não por funcionalidade.
`src/server/` concentra tudo que toca a API e o cookie e é marcado `server-only`, de modo que
qualquer importação acidental a partir de um componente de cliente quebra a compilação — é assim
que o Princípio III deixa de depender de disciplina e passa a ser verificado pela ferramenta.
`src/acoes/` isola a escrita; `src/componentes/` nunca chama a API.

## Phase 0 — Pesquisa

Registrada em [research.md](./research.md). Decisões fechadas: framework e roteamento, sessão em
cookie, leitura no servidor, escrita por Server Actions, ausência de biblioteca de dados e de
formulário, validação com `zod`, estilo com Tailwind a partir dos tokens, componentes acessíveis
próprios, estratégia de testes e configuração por ambiente.

## Phase 1 — Projeto

- [data-model.md](./data-model.md): tipos derivados do contrato, validação na borda e regras de
  apresentação.
- [contracts/consumo-api.md](./contracts/consumo-api.md): cada chamada que a plataforma faz, com
  parâmetros, resposta, erros tratados e a tela de origem.
- [quickstart.md](./quickstart.md): como rodar contra a API local com provedor mock.

### Fluxos centrais

**Login**

1. O formulário envia usuário e senha para `POST /api/sessao` (Route Handler).
2. O handler chama `POST /auth/login` na API. Em erro, devolve o `code` para a tela exibir.
3. Em sucesso, chama `GET /me`. Se o perfil for `aluno`, **não** grava cookie e devolve o destino
   `/sem-permissao` (RW-06).
4. Nos demais perfis, grava o cookie `httpOnly` com o token e redireciona para o destino
   pretendido ou para `/painel`.

**Página de gestão**

O `layout` do grupo `(gestao)` chama `GET /me` no servidor a cada requisição, monta a barra
lateral conforme o perfil e passa o usuário às páginas. Como é a API quem responde, mudança de
perfil vale na navegação seguinte (RW-10). `401` e `403 USUARIO_INATIVO` encerram a sessão ali
mesmo; `403 SEM_PERMISSAO` leva a `/sem-permissao`.

**Leitura de lista**

A página é um Server Component: lê os parâmetros da URL (`situacao`, `q`, `limit`, `offset`),
chama a função de recurso correspondente e entrega os dados prontos a um componente de tabela.
Filtros e paginação são links que mudam a URL — a lista é compartilhável e funciona sem
JavaScript. O esqueleto aparece via `loading.tsx` de cada rota.

**Escrita**

Formulários chamam Server Actions. A ação valida a entrada com `zod`, chama a API, e então:
sucesso → `revalidatePath` da lista afetada e redirecionamento ou fechamento do modal; erro →
devolve `{ code, mensagem, errors }` para o formulário, que marca os campos e **mantém tudo que
foi digitado** (RW-42).

**Erros**

`apiFetch` converte qualquer falha em `ApiError { code, status, detail, errors }`. Um único mapa
traduz `code` em mensagem e efeito. `401` em qualquer ponto apaga o cookie e leva ao login
guardando o destino; `code` desconhecido vira mensagem genérica e registro no log do servidor.

### Constitution Check (pós-projeto)

Sem mudanças: nenhuma regra de negócio entrou no cliente, o token permaneceu restrito ao servidor
e não houve dependência nova além das quatro previstas.

## Complexity Tracking

Nenhum desvio aos princípios. Dependências de produção: `next`, `react`, `tailwindcss`, `zod`.

## Fase F2 (planejada, não implementada)

Entra quando a spec E3 da API for publicada. Previsão de impacto: dois conjuntos de endpoints,
tipos `Evento` e `HorarioDeTurma`, duas rotas com suas ações e dois itens de navegação. O editor
de evento reaproveita o seletor de destinos e a linha do tempo dos avisos — o que confirma que
esses componentes pertencem a `componentes/comum/` e não ao módulo de avisos.
