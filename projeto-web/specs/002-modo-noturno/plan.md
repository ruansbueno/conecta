# Implementation Plan: Modo noturno e fim de lista (web)

**Branch**: `036-modo-noturno` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: spec 002 da web; paleta escura aprovada pelo autor em 11/11/2026 sobre o protótipo
(capturas das telas reais com os tokens redefinidos), com um ajuste: os botões principais ficam
`#2563eb` com texto branco também no escuro.

## Summary

O tema é uma camada de tokens: `globals.css` já é a única origem de cor (RW-38), e toda tela usa
classes do Tailwind ligadas a esses tokens (`bg-branco`, `text-navy`…). O modo noturno redefine os
tokens sob `html[data-tema='escuro']`; nenhuma tela muda de cor por conta própria. Um script
pequeno, servido pela própria origem, escolhe o tema antes da primeira pintura; um hook React
expõe o tema e a alternância ao botão. Sem dependência nova.

## Technical Context

Igual ao da 001: TypeScript estrito, React 19, Tailwind 4, Vitest + Testing Library (jsdom),
Playwright contra o servidor falso, axe. Nenhuma dependência nova (Princípio VI).

## Constitution Check

- **I. Cliente sem regra de negócio** — PASS. Tema é preferência de interface; nada vai à API.
- **III. Token fora do alcance do JavaScript** — PASS, com esclarecimento (constituição 2.0.1): o
  princípio proíbe guardar **token** no navegador; além do rascunho de formulário, o
  `localStorage` passa a conter `conecta:tema` (`claro`/`escuro`), que não identifica a pessoa nem
  dá acesso a nada e não é apagado ao sair. A regra de lint que restringe o armazenamento ganha
  `src/lib/tema.ts` como segunda exceção.
- **IV. Build estático** — PASS. O script de tema é um arquivo estático em `public/`, servido pela
  mesma origem; a CSP (`default-src 'self'`) continua sem `unsafe-inline` para scripts.
- **V. Design system e acessibilidade** — PASS. Tokens redefinidos no mesmo arquivo; contraste AA
  verificado por teste de unidade (tokens) e por axe nas telas (tema escuro).
- **VI. Dependências** — PASS. Nenhuma.

## Decisões

- **D-MN-1 — Tokens redefinidos, não variante `dark:`.** O Tailwind 4 emite os tokens de `@theme`
  como variáveis CSS; um bloco `html[data-tema='escuro'] { --color-…: … }` em `globals.css` troca
  todas de uma vez. Alternativa descartada: a variante `dark:` em cada classe, que espalharia o
  tema por ~600 classes e permitiria esquecer telas.
- **D-MN-2 — Tokens novos por papel.** Três cores tinham dois papéis que se separam no escuro:
  - `branco` é superfície (cartão, barra, campo) **e** texto sobre cor cheia. Novo token
    `sobre-cor` (`#ffffff` nos dois temas) para o texto sobre botão azul, avatar e painel navy.
  - `navy` é cor de título **e** fundo cheio (painel do login, avatar, filtro escolhido em
    Pedidos de acesso). Novo token `painel` (`#132a4e` claro, `#1c3560` escuro) para o fundo.
  - `azul` é texto/link **e** fundo do botão principal. Novos tokens `acao` e `acao-escura`
    (`#2563eb` e `#1d4ed8` nos dois temas) para o fundo do botão e o seu hover.
  - O texto claro do painel do login (`text-azul-100`) passa a `sobre-painel-suave` (`#dbe5fc`
    nos dois temas), porque `azul-100` vira cor de borda no escuro.
- **D-MN-3 — Paleta escura** (aprovada; todos os pares de texto ≥ 4,5:1, o pior é `tenue` sobre
  `azul-superficie`, 5,0:1):

  | token | claro | escuro | token | claro | escuro |
  |---|---|---|---|---|---|
  | fundo | `#f5f8fc` | `#0b1424` | alerta | `#b45309` | `#f5b149` |
  | branco (superfície) | `#ffffff` | `#121e34` | alerta-fundo | `#fdf4e6` | `#2d2312` |
  | linha | `#e4e9f2` | `#26344f` | sucesso | `#15803d` | `#5cc98a` |
  | linha-suave | `#eff2f7` | `#1b2842` | sucesso-fundo | `#e9f6ee` | `#122b1e` |
  | navy | `#132a4e` | `#e3eaf6` | perigo | `#b91c1c` | `#f58a8a` |
  | navy-suave | `#2a4374` | `#b4c3dd` | perigo-fundo | `#fcecec` | `#2e1719` |
  | tinta | `#0f1c33` | `#eef2f8` | perigo-borda | `#f3d5d5` | `#4d2226` |
  | texto-corpo | `#263a5b` | `#c9d4e6` | destino-todos | `#2f855a` | `#5cc98a` |
  | apagado | `#5b6b86` | `#9eacc4` | destino-todos-fundo | `#e8f3ec` | `#122b1e` |
  | tenue | `#646f80` | `#8c9ab1` | destino-semestre-fundo | `#edeff8` | `#1d2643` |
  | azul | `#2563eb` | `#6b9bff` | destino-docentes | `#c2770b` | `#f5b149` |
  | azul-escuro | `#1d4ed8` | `#93b6ff` | foco | azul 12% | `#6b9bff` 28% |
  | azul-superficie | `#eff4ff` | `#172a4d` | véu | tinta 45% | preto 60% |
  | azul-100 | `#dbe5fc` | `#2b4475` | painel *(novo)* | `#132a4e` | `#1c3560` |

  A seta própria do `select` (SVG em `data:`) ganha uma versão com o traço `apagado` do escuro.
- **D-MN-4 — Primeira pintura.** `public/tema-inicial.js`, carregado como script clássico no
  `<head>` antes do CSS, lê `conecta:tema` (com `try/catch`), cai em `prefers-color-scheme` e grava
  `data-tema` e `style.colorScheme` em `<html>`. É síncrono e minúsculo; por ser arquivo da mesma
  origem, respeita a CSP. A lógica fica duplicada só nessas ~10 linhas; o restante vive em
  `src/lib/tema.ts`, testado.
- **D-MN-5 — Estado no React.** `src/lib/tema.ts`: `lerEscolha()`, `temaEfetivo()`,
  `aplicarTema()` e `guardarEscolha()`, todos tolerantes a `localStorage`/`matchMedia` ausentes.
  `src/componentes/comum/botao-tema.tsx`: hook `useTema()` (estado local, `matchMedia` `change`
  enquanto não há escolha, evento `storage` para as outras abas) e o botão. Não há contexto
  global: o tema mora no `<html>`, e cada botão lê dele.
- **D-MN-6 — Onde fica o botão.** Na `BarraSuperior` (à direita, depois das ações da página), no
  login (canto superior direito de `<main>`, sobre o formulário) e em "Sem permissão" quando
  aberta fora da casca. Ícones `lua` e `sol` entram em `icones-svg.ts`, no mesmo traço dos demais.
- **D-MN-7 — Fecho e vazio do painel.** Componente `FimDaLista` (`componentes/comum/`): texto
  `text-tenue` centrado, `role="status"` não — é texto estático. Painel: o fecho aparece quando
  `p.total <= p.items.length`; os blocos vazios passam a usar `VazioDoBloco` (ícone + frase +
  atalho opcional), versão compacta do `EstadoVazio`.
- **D-MN-8 — Fecho da agenda.** Em Próximos, Realizados e Arquivados, na última página
  (`offset + items.length >= total`) com ao menos um evento: "Não há mais eventos." Na aba Mês o
  calendário já mostra os dias vazios.

## Testes

- **Unidade** (`tests/unit/tema.test.ts`): escolha guardada, valor inválido, sistema escuro/claro,
  sem `matchMedia`, `localStorage` que lança; `aplicarTema` grava `data-tema` e `colorScheme`.
- **Unidade** (`tests/unit/contraste-tema.test.ts`): lê os dois blocos de `globals.css` e confere
  os pares de texto × fundo usados (≥ 4,5:1) nos dois temas, e `sobre-cor` sobre `acao`/`painel`.
- **Componente** (`tests/componente/botao-tema.test.tsx`): ícone e nome por tema, `aria-pressed`,
  alternância grava a escolha e muda `<html>`, sistema mudando sem escolha, evento `storage`; o
  botão aparece na barra superior, no login e em "Sem permissão".
- **Componente**: fechos e vazios do painel e da agenda (`painel.test.tsx`,
  `agenda-lista.test.tsx`), inclusive a ausência do fecho quando há mais itens.
- **Ponta a ponta** (`e2e/tema.spec.ts`): alternar, recarregar e continuar escuro; primeiro quadro
  já escuro (`colorScheme: 'dark'` emulado e escolha guardada); texto digitado preservado.
- **Acessibilidade** (`e2e/acessibilidade.spec.ts`): as telas já verificadas com axe rodam também
  com a escolha `escuro`.
- **Cor solta** (`tests/unit/cores-so-no-tema.test.ts`, novo): nenhum `.tsx`/`.ts` de `src/` tem
  hexadecimal, `rgb(`, classe arbitrária de cor (`bg-[#…]`) ou cor da paleta padrão do Tailwind
  (`text-white`, `bg-gray-100`…), que escapariam da troca de tema.

## Riscos

- Telas com cor herdada do navegador (ex.: `<option>` de `select`): cobertas por `color-scheme`.
- Capturas de `design/web-escuro/` envelhecem com o código; ficam datadas no `design/README.md`.
