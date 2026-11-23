# Responsividade da plataforma web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Branch**: `049-responsividade-web` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

**Goal:** Fazer todas as telas da gestão funcionarem em celular (360 px ou mais) e tablet, nos dois
temas, sem mudar regra, texto nem o desktop.

**Architecture:** Só classes do Tailwind e duas peças novas de React. A primeira é uma gaveta de
navegação, que reaproveita o miolo da barra lateral. A segunda é um hook de foco preso, extraído
do `Modal`. As tabelas passam a rolar dentro do componente `Tabela`, que ganha a primeira coluna
presa. Pontos de quebra: `sm` (640 px) e `lg` (1024 px), sem pontos novos.

**Tech Stack:** React 19, TypeScript estrito, Tailwind 4, Vitest + Testing Library (jsdom),
Playwright contra o servidor falso, axe. Nenhuma dependência nova.

**Constitution Check:** I (sem regra de negócio) — PASS, só layout. II e III — não tocados.
IV — PASS, nada de servidor. V (design system e acessibilidade) — PASS: os tokens não mudam e o axe
roda também em 390 px. VI — PASS, sem dependência.

## Global Constraints

- Desktop (≥ 1024 px) idêntico ao atual; nenhum texto, rótulo, `aria-*` existente ou rota muda.
- Pontos de quebra: abaixo de `sm` (640 px) = celular; abaixo de `lg` (1024 px) = menu recolhido.
- Cores só por tokens (`tests/unit/cores-so-no-tema.test.ts` continua passando).
- Gaveta: 300 px, véu `bg-veu`, nome acessível "Menu"; botões "Abrir menu" / "Fechar menu".
- Barra superior: `h-[60px]` abaixo de `sm`, `h-[68px]` a partir de `sm`; conteúdo `px-4` abaixo
  de `sm`, `px-7` a partir de `sm`.
- Título de página: `text-[24px]` abaixo de `sm`, `sm:text-[28px]`.
- Botões de decisão das solicitações abaixo de `sm`: empilhados, `h-8` (32 px), `text-[13px]`.
- Modais abaixo de `sm`: margem de 12 px (`p-3`), rodapé em 2 colunas.
- Commits em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`;
  nunca `git add` de pasta (há arquivos não rastreados de outras sessões); nunca `tcc/` nem `.vscode/`.
- Rodar o Playwright com `caffeinate -i` e duas vezes seguidas antes de dar por pronto.

## Review Focus

1. **Desktop entre 1024 e 1279 px**: a barra lateral aparece e o botão "Abrir menu" some exatamente
   em 1024 px. Nada de faixa sem navegação (teste na Task 1: 1023 e 1024 px).
2. **Menu aberto quando a tela cresce** (girar o tablet): a gaveta não pode ficar presa sobre a barra
   lateral. Ao chegar em 1024 px ela fecha sozinha (teste na Task 1).
3. **Foco e leitor de tela com o menu aberto**: o conteúdo atrás não recebe Tab e o foco volta ao
   botão ao fechar, inclusive quando o fechamento vem da navegação (teste na Task 1).
4. **Nome longo na coluna presa** (aluno com nome grande): a coluna presa não pode esconder os
   botões de decisão em 360 px (teste na Task 3, com o nome mais longo do servidor falso).
5. **Rascunho do editor ao abrir o menu**: abrir e fechar a gaveta no editor de aviso não pode
   perder o texto digitado (teste na Task 5).

---

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `src/componentes/comum/foco-preso.ts` (novo) | `useFocoPreso`: foco inicial, Tab preso, Esc, foco de volta à origem |
| `src/componentes/comum/modal.tsx` | Passa a usar `useFocoPreso`; layout de celular (RR-21) |
| `src/componentes/layout/navegacao-lateral.tsx` (novo) | Miolo da barra lateral (marca, grupos, pessoa, Sair) |
| `src/componentes/layout/barra-lateral.tsx` | `aside` de 252 px, `hidden lg:flex`, com `NavegacaoLateral` |
| `src/componentes/layout/gaveta-menu.tsx` (novo) | Gaveta abaixo de `lg` com `NavegacaoLateral` |
| `src/componentes/layout/barra-superior.tsx` | Botão "Abrir menu", alturas e margens responsivas |
| `src/componentes/layout/casca.tsx` | Estado do menu; fecha ao navegar e ao chegar em `lg` |
| `src/estilos/globals.css` | Classes `.titulo-pagina`, `.acao-pagina`, `.botoes-cabecalho`, `.abas-rolaveis`, `.rodape-lista` |
| `src/componentes/comum/tabela.tsx` | Rolagem dentro da tabela, primeira coluna presa, esmaecido |
| `e2e/responsivo.spec.ts` (novo) | Comportamento em 360/390/768/1024 px, nos dois temas |

---

### Task 1: Casca responsiva — gaveta de navegação (RR-01 a RR-05)

**Files:**
- Create: `src/componentes/comum/foco-preso.ts`, `src/componentes/layout/navegacao-lateral.tsx`, `src/componentes/layout/gaveta-menu.tsx`, `e2e/responsivo.spec.ts`
- Modify: `src/componentes/comum/modal.tsx`, `src/componentes/layout/barra-lateral.tsx`, `src/componentes/layout/barra-superior.tsx`, `src/componentes/layout/casca.tsx`
- Test: `tests/componente/layout.test.tsx`, `e2e/responsivo.spec.ts`

**Interfaces:**
- Produces:
  - `useFocoPreso(caixa: RefObject<HTMLElement | null>, onFechar: () => void): void`. Tem o mesmo
    comportamento do efeito atual do `Modal`, inclusive a pilha `abertos`, para que só o de cima
    responda.
  - `NavegacaoLateral(props: { usuario: UsuarioSessao; onSair: () => void; contadores?: Record<string, number> }): JSX.Element`
  - `GavetaMenu(props: { usuario: UsuarioSessao; onSair: () => void; contadores?: Record<string, number>; onFechar: () => void }): JSX.Element`.
    É renderizada só quando aberta, com `role="dialog"`, `aria-modal="true"`, `aria-label="Menu"`
    e `id="gaveta-menu"`.
  - `BarraSuperior` ganha `onAbrirMenu?: () => void` e `menuAberto?: boolean`. O botão
    "Abrir menu" (`lg:hidden`) leva `aria-expanded` e `aria-controls="gaveta-menu"`.
  - `e2e/responsivo.spec.ts` exporta, para as tasks seguintes, `const LARGURAS = { celular: 390, estreito: 360, tablet: 768 }`
    e `async function semRolagemLateral(page: Page): Promise<void>`. Esta confere que
    `document.documentElement.scrollWidth <= innerWidth`.

- [ ] **Step 1: Testes que falham (Vitest, `layout.test.tsx`)**, renderizando `Casca` dentro de `MemoryRouter`:
  - `'"Abrir menu" abre a gaveta com a mesma navegação do perfil'`: clicar em "Abrir menu" →
    `getByRole('dialog', { name: 'Menu' })` contém os links `['Painel', 'Avisos', 'Agenda', 'Turmas', 'Horários', 'Solicitações', 'Usuários']`
    para a coordenação. O botão fica com `aria-expanded="true"`.
  - `'Esc fecha a gaveta e devolve o foco ao botão'`
  - `'escolher um item fecha a gaveta e navega'`: clicar em "Turmas" → sem dialog e rota `/turmas`.
  - `'tocar no véu fecha a gaveta'`
  - `'Tab não sai da gaveta'`: com o foco no último focável ("Sair"), Tab leva a "Fechar menu".
  - Os testes atuais de `BarraLateral` continuam verdes sem mudança.
- [ ] **Step 2: Rodar** `npx vitest run tests/componente/layout.test.tsx` → FAIL ("Abrir menu" não existe).
- [ ] **Step 3: Implementar.**
  - Extrair `useFocoPreso` do `Modal`, que passa a chamá-lo.
  - Extrair `NavegacaoLateral` da `BarraLateral`, que fica com `hidden lg:flex`.
  - Escrever a `GavetaMenu`: `fixed inset-0 z-40`, véu clicável, painel `w-[300px]` à esquerda,
    "Fechar menu" ao lado da marca.
  - Na `Casca`: `useState(false)`. Fechar com `useEffect` sobre o `pathname` e com um
    `matchMedia('(min-width: 1024px)')` que fecha ao passar a valer.
  - Na `BarraSuperior`: `h-[60px] px-2 sm:h-[68px] sm:px-7 lg:px-7`.
  - No `main` da casca: `px-4 py-5 sm:px-7 sm:py-[26px]`.
- [ ] **Step 4: Rodar** `npx vitest run` → PASS (todos, inclusive os do `Modal`).
- [ ] **Step 5: Testes e2e que falham** em `e2e/responsivo.spec.ts`, nos temas claro e escuro, como em `acessibilidade.spec.ts`:
  - `'390 px: menu abre, navega para Turmas e fecha'`, entrando como `coord.teste`.
  - `'1023 px mostra "Abrir menu" e esconde a barra lateral; 1024 px o contrário'`.
  - `'gaveta aberta fecha ao alargar a janela para 1024 px'` (`page.setViewportSize`).
  - `'painel em 390 px sem rolagem lateral'` (`semRolagemLateral`).
- [ ] **Step 6: Rodar** `caffeinate -i npx playwright test e2e/responsivo.spec.ts` → PASS. Rodar `npx tsc -b --noEmit && npx eslint .` → limpos.
- [ ] **Step 7: Commit** "Casca responsiva: gaveta de navegação abaixo de 1024 px", com os arquivos listados um a um.

### Task 2: Cabeçalhos, abas, filtros e rodapés de lista (RR-06 a RR-10, RR-13)

**Files:**
- Modify: `src/estilos/globals.css`, `src/paginas/{painel,usuarios,solicitacoes}.tsx`, `src/paginas/avisos/{lista,historico}.tsx`, `src/paginas/eventos/{lista,historico}.tsx`, `src/paginas/turmas/{lista,detalhe}.tsx`, `src/paginas/horarios/{grade,escolher-turma}.tsx`, `src/paginas/pedidos-de-acesso.tsx`, `src/componentes/avisos/editor.tsx`, `src/componentes/eventos/formulario-evento.tsx`, `src/componentes/comum/abas.tsx`
- Test: `e2e/responsivo.spec.ts`

**Interfaces:**
- Consumes: `LARGURAS`, `semRolagemLateral` (Task 1).
- Produces (em `@layer components` do `globals.css`, para as tasks seguintes):
  - `.titulo-pagina`: `text-[24px] sm:text-[28px]`, mais o resto das classes atuais do `h1`.
  - `.acao-pagina`: `w-full sm:w-auto`, junto de `botao-primario`.
  - `.botoes-cabecalho`: `grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap`. Com 3
    filhos, o modificador `.botoes-cabecalho-3` usa `grid-cols-3`.
  - `.abas-rolaveis`: `overflow-x-auto [scrollbar-width:none]`, que entra na `classe` padrão de `Abas`.
  - `.rodape-lista`: `flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-4`.

- [ ] **Step 1: Testes e2e que falham**, em 390 px, nos dois temas:
  - `'ação principal ocupa a largura do conteúdo no celular'`: em `/avisos`, `/eventos`,
    `/turmas` e `/horarios/<turma>`, a largura do botão principal é a do `main` menos 32 px
    (±1). Em 768 px ele fica na mesma linha do `h1` (mesmo `y`, ±8).
  - `'botões do cabeçalho viram grade no celular'`: no histórico do aviso, "Arquivar", "Editar" e
    "Excluir" ficam no mesmo `y` e com larguras iguais (±1). No detalhe da turma, os 4 botões
    formam 2 linhas.
  - `'abas de Usuários rolam sem empurrar a página'`: `semRolagemLateral` e
    "Aguardando acesso" alcançável com `scrollIntoViewIfNeeded`.
  - `'busca ocupa a largura toda no celular'`: em `/avisos`, `/eventos`, `/turmas`, `/usuarios`
    e no detalhe da turma, a largura da busca é igual à do `main` menos 32 px.
  - `'rodapé de paginação quebra sem cortar'`: em `/usuarios`, o texto "Mostrando" e a
    navegação "Paginação" ficam inteiros dentro do cartão.
  - `'botões de ícone com 40 px no celular'` (RR-23): "Abrir menu", "Modo noturno" e
    "Alterar perfil" (em `/usuarios`) medem pelo menos 40×40. Em 1440 px, "Alterar perfil"
    continua com 36 px, porque o desktop não muda.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.**
  - Criar as classes acima.
  - Trocar, nas páginas listadas, o `text-[28px]` do `h1` por `.titulo-pagina`.
  - Pôr `.acao-pagina` no botão principal e `.botoes-cabecalho` nos grupos de botões dos
    cabeçalhos com voltar.
  - Trocar `w-[300px]` e `w-[280px]` por `w-full sm:w-[300px]` (ou `sm:w-[280px]`).
  - Pôr `.rodape-lista` nos 6 rodapés `justify-between border-t ... px-6 py-4`.
  - Em `.botao-icone`, trocar `size-9` por `size-10 lg:size-9`.
- [ ] **Step 4: Rodar** `npx playwright test e2e/responsivo.spec.ts` e `npx vitest run` → PASS.
- [ ] **Step 5: Commit** "Cabeçalhos, abas, filtros e rodapés no celular".

### Task 3: Tabelas que rolam com a primeira coluna presa (RR-11, RR-12)

**Files:**
- Modify: `src/componentes/comum/tabela.tsx`, `src/componentes/solicitacoes/tabela.tsx`, `src/paginas/{usuarios,solicitacoes,pedidos-de-acesso}.tsx`, `src/paginas/avisos/lista.tsx`, `src/paginas/turmas/{lista,detalhe}.tsx`
- Test: `tests/componente/comum.test.tsx`, `e2e/responsivo.spec.ts`

**Interfaces:**
- Produces:
  - `Tabela` passa a ter o próprio contêiner de rolagem (`div` com `overflow-x-auto`, que tem
    `role="region"`, `aria-label={legenda}` e `tabIndex={0}`, para rolar pelo teclado).
  - Primeira coluna com `sticky left-0 bg-branco`.
  - Esmaecido decorativo (`aria-hidden`) na borda direita, visível só quando há rolagem.
  - As páginas removem o próprio `<div className="overflow-x-auto px-3 pt-4">` e mantêm o
    `px-3 pt-4` num `div` sem rolagem.

- [ ] **Step 1: Testes que falham.**
  - Vitest em `comum.test.tsx`: `'Tabela rola dentro de uma região nomeada pela legenda'` →
    `getByRole('region', { name: 'Usuários — Todos' })` contém a tabela.
  - E2E em 360 px:
    - `'coluna do aluno fica presa e Aprovar e Recusar aparecem inteiros'`: em `/solicitacoes`,
      rolar a região até o fim; a célula do aluno mais longo ("Aluno Dois de Teste") continua
      dentro da região. "Aprovar" e "Recusar" da primeira linha ficam inteiros dentro dela, um
      acima do outro, com altura de 32 px (±1).
    - `semRolagemLateral` em `/avisos`, `/turmas`, `/usuarios`, `/usuarios?aba=aguardando` e
      no detalhe da turma.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar** a rolagem no `Tabela`.
  - O esmaecido aparece por um `onScroll` + `ResizeObserver` que compara `scrollLeft + clientWidth < scrollWidth`.
  - Na coluna de decisão de `componentes/solicitacoes/tabela.tsx`, usar
    `flex flex-col gap-1.5 sm:flex-row sm:gap-2`. Os botões levam
    `h-8 px-2.5 text-[13px] sm:h-[42px] sm:px-[18px] sm:text-sm`.
- [ ] **Step 4: Rodar** Vitest e e2e → PASS. Rodar `e2e/acessibilidade.spec.ts` → PASS: a região
  com `tabIndex` não pode gerar violação.
- [ ] **Step 5: Commit** "Tabelas rolam dentro do cartão com a primeira coluna presa".

### Task 4: Painel e agenda (RR-14 a RR-16)

**Files:**
- Modify: `src/paginas/painel.tsx`, `src/componentes/eventos/cartao-evento.tsx`, `src/componentes/eventos/calendario-mes.tsx`
- Test: `tests/componente/calendario-mes.test.tsx`, `e2e/responsivo.spec.ts`

- [ ] **Step 1: Testes que falham.**
  - Vitest: `'cada dia com eventos mostra a quantidade para o celular'` → no dia 26 de novembro de
    2026 há um elemento `aria-hidden` com o texto "1" e a classe `sm:hidden`. Os títulos dos
    eventos ganham `hidden sm:block`. O nome acessível do botão do dia não muda.
  - E2E, em 390 px:
    - `'contadores do painel em 2 colunas'`: "Avisos ativos" e "Avisos agendados" ficam no mesmo `y`.
    - `'avisos recentes: destinos e situação abaixo do título'`.
    - `'calendário cabe sem rolar'`: a largura da tabela do mês é menor ou igual à do cartão.
    - `'tocar num dia filtra a lista'`: tocar no dia 26 → a lista mostra só "Prova de Banco de Dados II".
    - `'evento: destino e ações abaixo do título'`.
    - `semRolagemLateral` em `/painel` (coordenação e docente) e `/eventos` nas abas Próximos e Mês.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar** as mudanças, só com classes:
  - Contadores: `grid-cols-2 xl:grid-cols-4`.
  - Itens do painel e cartão de evento: `flex-col sm:flex-row` nos trechos de destinos e ações.
  - Calendário: células `h-[52px] sm:h-[104px]`, com a quantidade `sm:hidden`.
- [ ] **Step 4: Rodar** Vitest e e2e → PASS.
- [ ] **Step 5: Commit** "Painel e agenda no celular".

### Task 5: Grade, editores, detalhe da turma e login (RR-17 a RR-20)

**Files:**
- Modify: `src/paginas/horarios/grade.tsx`, `src/componentes/horarios/grade-semanal.tsx`, `src/componentes/avisos/editor.tsx`, `src/componentes/eventos/formulario-evento.tsx`, `src/paginas/turmas/detalhe.tsx`, `src/paginas/login.tsx`
- Test: `tests/componente/editor.test.tsx`, `tests/componente/login.test.tsx`, `e2e/responsivo.spec.ts`

- [ ] **Step 1: Testes que falham.**
  - Vitest (editor): `'ordem de leitura: campos, destinos, publicação, prévia'`. A ordem no DOM dos
    títulos "Quem vai receber", "Publicação" e "Como aparece no aplicativo" é essa. A coluna da
    direita continua à direita a partir de `lg`, com `lg:col-start-2 lg:row-start-1` nos
    cartões e `lg:row-span-2` onde precisar.
  - Vitest (login): `'a marca CONECTA aparece no topo do formulário fora do desktop'` → há duas
    marcas, e a do topo tem a classe `lg:hidden`.
  - E2E, em 390 px:
    - `'grade rola dentro do cartão'`: `semRolagemLateral`, e a região da grade tem `scrollWidth > clientWidth`.
    - `'Início e Fim do evento empilham'`.
    - `'dados da turma em 2 colunas'`.
    - `'abrir e fechar o menu no editor não perde o rascunho'`: digitar no título, abrir e fechar
      o menu, e o texto continua no campo (Review Focus 5).
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar.**
  - Reordenar no DOM os cartões do editor de aviso e do formulário de evento, posicionando-os
    no grid `lg` para que o desktop fique igual.
  - Grade: "Docentes nesta grade" e "Mudou alguma aula?" com `grid gap-6 lg:grid-cols-[...]`, como já é.
  - Turma: `dl` com `grid-cols-2 sm:grid-cols-3 lg:grid-cols-6`.
  - Login: `div.lg:hidden` com marca, `Marca` e "CONECTA", acima do formulário, e `px-5 sm:px-8`.
- [ ] **Step 4: Rodar** Vitest e e2e. Rodar também `e2e/teclado.spec.ts`, porque a ordem de foco
  no desktop não pode mudar → PASS.
- [ ] **Step 5: Commit** "Grade, editores, turma e login no celular".

### Task 6: Modais no celular (RR-21)

**Files:**
- Modify: `src/componentes/comum/modal.tsx`, e os rodapés dos modais que montam botões soltos: `confirmacao.tsx`, `seletor-destinos.tsx`, `modal-aula.tsx`, `recusar-modal.tsx`, `form-turma.tsx`, `form-vinculo.tsx`, `alterar-perfil-modal.tsx`, `pedidos-de-acesso.tsx`
- Test: `e2e/responsivo.spec.ts`

- [ ] **Step 1: Testes e2e que falham**, em 390 px:
  - `'modal ocupa a largura menos 12 px de cada lado'`: "Nova turma" e "Recusar solicitação" →
    largura do dialog = 366 (±1).
  - `'botões do rodapé dividem a largura'`: em "Nova turma", "Cancelar" e "Criar turma" têm a
    mesma largura (±1) e estão no mesmo `y`.
  - `'modal alto rola por dentro'`: "Alterar perfil" em 390×700 → o dialog cabe na janela e o
    miolo tem `scrollHeight > clientHeight`.
- [ ] **Step 2: Rodar** → FAIL.
- [ ] **Step 3: Implementar** no `Modal`:
  - Véu `p-3 sm:p-6`.
  - Caixa `max-h-full`, como já é.
  - Rodapé `grid grid-cols-2 sm:flex sm:justify-end`. Rodapé com um único botão continua em uma coluna.
  - Cabeçalho e miolo com `px-4 sm:px-6`.
  - Ajustar os rodapés listados que dependem de `ml-auto` ou de espaçadores.
- [ ] **Step 4: Rodar** e2e e Vitest → PASS.
- [ ] **Step 5: Commit** "Modais no celular".

### Task 7: Varredura, acessibilidade e registro (RR-22 a RR-24)

**Files:**
- Modify: `e2e/responsivo.spec.ts`, `e2e/acessibilidade.spec.ts`, `specs/003-responsividade/tasks.md`, `README.md` (raiz e `projeto-web/`)
- Create: `evidencias/testes-web-final-<data>.txt`, `evidencias/telas-responsivas/*.png`

- [ ] **Step 1: Testes.**
  - `'nenhuma tela rola na horizontal'`: todas as rotas da gestão, como coordenação e como
    docente, mais login e sem permissão, em 360, 390, 768 e 1024 px, nos dois temas.
  - Em `acessibilidade.spec.ts`, repetir as auditorias existentes também em 390 px, incluindo a
    gaveta aberta.
- [ ] **Step 2: Rodar** e corrigir o que aparecer, com teste e correção no mesmo commit.
- [ ] **Step 3: Verificação completa.** Rodar `npx tsc -b --noEmit`, `npx eslint .`,
  `npx vitest run` e `caffeinate -i npx playwright test` duas vezes seguidas. Guardar a saída
  em `evidencias/testes-web-final-<data>.txt`.
- [ ] **Step 4: Capturas e conferência visual.** Capturar as telas reais em 390 e 768 px, nos dois
  temas, em `evidencias/telas-responsivas/`, e comparar com o canvas aprovado.
- [ ] **Step 5:** Marcar `tasks.md` e atualizar o andamento nos READMEs. Commit
  "Responsividade: varredura, acessibilidade e registro".
