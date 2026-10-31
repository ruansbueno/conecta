# Implementation Plan: Plataforma Web de Gestão (Fase F1; F2 planejada)

**Branch**: `001-plataforma-gestao` | **Date**: 2026-10-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-plataforma-gestao/spec.md`

> **Revisão de 13/10/2026** — este plano foi reescrito. A versão anterior previa Next.js com
> servidor Node, Server Components e Server Actions. A infraestrutura do IFSul hospeda a API em
> Python e serve a plataforma como **arquivos estáticos**, sem processo de aplicação próprio.
> O objetivo de segurança foi preservado trocando o meio: o cookie de sessão passa a ser emitido
> pela própria API. Ver `research.md` D1, D2 e D5.

## Summary

Plataforma web de gestão em React, construída com Vite e TypeScript, distribuída como build
estático. **Esta implementação cobre a fase F1**: login com sessão em cookie emitido pela API,
painel, avisos (lista, editor com destinos e agendamento, histórico e versões, arquivar/
desarquivar/excluir), turmas, vínculos, solicitações e administração de usuários e perfis. A fase
F2 (agenda e horários) está especificada e aguarda a implementação da E3 na API.

A forma do sistema vem de duas restrições que se combinam: **não há servidor próprio** e **o
JavaScript não pode alcançar o token**. A saída é a API emitir um cookie `httpOnly` no login; o
navegador o envia sozinho em cada chamada feita com `credentials: 'include'`, e a plataforma
nunca vê a credencial que usa. Em troca, duas obrigações aparecem: web e API na mesma origem, e
proteção CSRF em toda escrita.

## Technical Context

**Language/Version**: TypeScript 5.x (modo estrito), Node.js 20 apenas como ferramenta de build

**Primary Dependencies**: React 19, React Router 7 (modo declarativo), Tailwind CSS 4, `zod`
(validação de formulário e das respostas da API na borda). Sem biblioteca de estado global, sem
cliente HTTP e sem biblioteca de formulário — ver `research.md`.

**Storage**: nenhum. Todo dado vive na API. O único dado guardado no navegador é um rascunho de
formulário longo (editor de aviso), sem nada de sessão.

**Testing**: Vitest + Testing Library para unidade e componente; Playwright para ponta a ponta
contra um servidor falso que implementa o contrato. Nenhum teste depende da API real.

**Target Platform**: navegador em desktop (duas últimas versões de Chrome, Firefox, Safari, Edge),
a partir de 1280 px. Distribuição: arquivos estáticos servidos por nginx ou Apache na
infraestrutura do IFSul, no mesmo domínio da API.

**Project Type**: web (aplicação de página única; a API é externa a este diretório)

**Performance Goals**: primeira exibição útil de uma lista em até 2 s em rede institucional;
pacote inicial abaixo de 250 KB comprimido, com as rotas carregadas sob demanda; nenhuma lista
bloqueia a interface enquanto carrega — o esqueleto aparece primeiro.

**Constraints**: token exclusivamente em cookie `httpOnly` emitido pela API (Princípio III);
mesma origem entre web e API; CSRF em toda escrita; nenhum segredo no build (Princípio IV);
comportamento por `code` (Princípio II); nenhuma regra de negócio no cliente (Princípio I);
operação completa por teclado e contraste AA (Princípio V).

**Scale/Scope**: escala institucional; escopo desta fase: 14 telas de F1 e 19 endpoints de gestão,
mais login, sessão e perfil.

## Constitution Check

*GATE: verificado antes da Fase 0 e revisto após a Fase 1.*

| Princípio | Como o plano atende |
|---|---|
| I. Cliente sem regra de negócio | Nenhuma verificação de permissão decide o que é exibido além de esconder itens de menu; toda tela tem caminho para `403`; a restrição de destino do docente é apresentada, mas quem recusa é a API |
| II. Contrato como fonte da verdade | `ApiError` carrega `code`; um único mapa `code → (mensagem, efeito)`; respostas validadas por esquemas `zod` derivados do contrato |
| III. Token fora do alcance do JavaScript | A plataforma nunca lê nem escreve o token: só envia `credentials: 'include'`. Não existe código que leia cookie, e o lint proíbe `document.cookie`, `localStorage` e `sessionStorage` fora do módulo de rascunho |
| IV. Build estático | Saída 100% estática; nenhuma rota de servidor; a única variável embutida é a URL da API |
| V. Design system e acessibilidade | Tokens no tema do Tailwind; componentes acessíveis próprios; auditoria por tela |
| VI. Simplicidade | Quatro dependências de produção, todas justificadas em `research.md` |

**Resultado**: conforme, sem desvio a registrar.

## Project Structure

```text
projeto-web/
├── index.html
├── vite.config.ts                      # build, proxy de /api em desenvolvimento
├── src/
│   ├── main.tsx                        # bootstrap, roteador, tema
│   ├── rotas.tsx                       # tabela de rotas e carregamento sob demanda
│   ├── api/
│   │   ├── cliente.ts                  # fetch com credentials, CSRF, timeout, erro
│   │   ├── erros.ts                    # ApiError + mapa code → mensagem/efeito
│   │   ├── schemas.ts                  # esquemas zod do contrato
│   │   └── recursos/                   # uma função por endpoint
│   │       ├── auth.ts   avisos.ts   turmas.ts
│   │       ├── vinculos.ts   solicitacoes.ts   usuarios.ts
│   ├── sessao/
│   │   ├── contexto.tsx                # usuário corrente, carregado por GET /me
│   │   ├── exigir-sessao.tsx           # guarda de rota; guarda o destino pretendido
│   │   └── encerrar.ts                 # DELETE /auth/sessao + limpeza do estado local
│   ├── paginas/
│   │   ├── login.tsx                   # T01
│   │   ├── sem-permissao.tsx           # T16
│   │   ├── painel.tsx                  # T02 e T14 (variam pelo perfil)
│   │   ├── avisos/{lista,novo,detalhe,editar,historico}.tsx
│   │   ├── turmas/{lista,detalhe}.tsx
│   │   ├── solicitacoes.tsx
│   │   └── usuarios.tsx
│   ├── componentes/
│   │   ├── layout/{casca,barra-lateral,barra-superior}.tsx
│   │   ├── comum/{chip-destino,selo-situacao,tabela,estado-vazio,
│   │   │          estado-erro,modal,confirmacao,paginacao,busca,esqueleto}.tsx
│   │   ├── avisos/{editor,seletor-destinos,previa-app,linha-do-tempo,versoes}.tsx
│   │   ├── turmas/{tabela-turmas,form-turma,tabela-vinculos,form-vinculo}.tsx
│   │   ├── solicitacoes/{tabela,recusar-modal}.tsx
│   │   └── usuarios/{tabela,alterar-perfil-modal}.tsx
│   ├── estilos/globals.css             # Tailwind + tokens
│   └── lib/{datas.ts,texto.ts,rascunho.ts}
├── tests/
│   ├── unit/                           # cliente, erros, schemas, datas
│   └── componente/                     # uma pasta por área
├── e2e/                                # Playwright + servidor falso do contrato
│   ├── servidor-falso/
│   └── *.spec.ts
└── specs/001-plataforma-gestao/        # esta documentação
```

**Structure Decision**: separação por papel — `api/` fala com a API, `sessao/` cuida de quem está
autenticado, `paginas/` compõe telas, `componentes/` desenha. A regra que sustenta o Princípio I é
simples de verificar: só `api/recursos/` conhece caminhos de endpoint, e nenhum componente
importa de lá diretamente — quem busca é a página.

## Phase 0 — Pesquisa

Registrada em [research.md](./research.md). Decisões fechadas: base de build, modelo de sessão,
mesma origem e CSRF, roteamento, ausência de biblioteca de dados e de formulário, validação com
`zod`, estilo com Tailwind, componentes acessíveis próprios, filtros na URL, testes e
configuração.

## Phase 1 — Projeto

- [data-model.md](./data-model.md): tipos derivados do contrato, validação na borda e regras de
  apresentação.
- [contracts/consumo-api.md](./contracts/consumo-api.md): cada chamada que a plataforma faz, com
  parâmetros, resposta, erros tratados e a tela de origem.
- [quickstart.md](./quickstart.md): como rodar contra a API local com provedor mock.

### Fluxos centrais

**Login**

1. O formulário envia usuário e senha para `POST /auth/login` com `credentials: 'include'`.
2. A API valida, emite o cookie de sessão e devolve os dados do usuário. Em erro, a tela usa o
   `code` para decidir a mensagem.
3. A plataforma chama `GET /me`. Se o perfil for `aluno`, chama `DELETE /auth/sessao` e vai para
   `/sem-permissao` (RW-06).
4. Nos demais perfis, segue para o destino pretendido ou para `/painel`.

**Guarda de rota e perfil**

`exigir-sessao` envolve as rotas de gestão: ao montar, chama `GET /me`. Enquanto a resposta não
chega, mostra o esqueleto da casca. `401` ou `403 USUARIO_INATIVO` encerram a sessão e levam ao
login guardando o destino; `403 SEM_PERMISSAO` leva a `/sem-permissao`. Como o perfil vem da API a
cada carga da aplicação e a cada retorno à aba, mudança de perfil vale sem novo login (RW-10).

**Leitura de lista**

A página lê os parâmetros da URL (`situacao`, `q`, `limit`, `offset`), chama a função de recurso e
entrega os dados ao componente de tabela. Filtros e paginação são mudanças de URL — a lista é
compartilhável e a navegação para trás funciona. Cada página controla seus três estados com um
`useState` de carregamento, dados e erro; não há camada de cache.

**Escrita e CSRF**

A API expõe o token CSRF em um cookie legível (não `httpOnly`); o cliente o lê e o envia no
cabeçalho a cada `POST`, `PATCH` e `DELETE` — o padrão *double submit*, que a API assina e prende à
sessão (emenda v2.2 da API). Esse é o **único** cookie
que o JavaScript toca, e ele não autentica nada sozinho. Após sucesso, a página recarrega a lista
afetada; em erro, a tela devolve `{ code, mensagem, errors }` ao formulário, que marca os campos e
**mantém tudo que foi digitado** (RW-42).

**Erros**

`cliente.ts` converte qualquer falha em `ApiError { code, status, detail, errors }`. Um único mapa
traduz `code` em mensagem e efeito. `401` em qualquer ponto encerra a sessão e leva ao login
guardando o destino; `code` desconhecido vira mensagem genérica e registro no console, sem
derrubar a tela.

### Implantação

O build gera `dist/` com arquivos estáticos. O servidor web precisa de uma única regra: qualquer
rota desconhecida devolve `index.html` — é o que faz `/avisos/123/historico` funcionar ao recarregar.
A API fica no mesmo domínio, atrás de `/api`, o que torna o cookie `SameSite=Strict` viável e
dispensa CORS.

### Constitution Check (pós-projeto)

Sem mudanças: nenhuma regra de negócio entrou no cliente, o token permaneceu inacessível ao
JavaScript, o build continuou sem segredo e não houve dependência nova além das quatro previstas.

## Complexity Tracking

Nenhum desvio aos princípios. Dependências de produção: `react`, `react-router`, `tailwindcss`,
`zod`.

**Requisito de implantação confirmado em 13/10/2026**: a plataforma e a API ficam no mesmo
domínio na infraestrutura do IFSul, com a API sob `/api` por proxy reverso. Era a premissa do
modelo de sessão, e deixou de ser risco. Permanece como requisito: uma mudança futura de
hospedagem que separe os domínios reabre a decisão D2 de `research.md`.

## Fase F2 (planejada, não implementada)

> Planejada em detalhe em [plan-f2.md](./plan-f2.md) (31/10/2026), com as tarefas em
> [tasks-f2.md](./tasks-f2.md).

Entra quando a spec E3 da API for publicada. Previsão de impacto: dois conjuntos de endpoints,
tipos `Evento` e `HorarioDeTurma`, duas rotas com seus formulários e dois itens de navegação. O
editor de evento reaproveita o seletor de destinos e a linha do tempo dos avisos — o que confirma
que esses componentes pertencem a `componentes/comum/` e não ao módulo de avisos.
