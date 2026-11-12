# Tasks: Modo noturno e fim de lista (web)

**Input**: [plan.md](./plan.md), [spec.md](./spec.md).

**Tests**: escritos antes da implementação (falham primeiro). Unidade em `tests/unit/`, componente
em `tests/componente/`, fluxo e acessibilidade em `e2e/`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência incompleta)
- **[Story]**: US1 (alternar e guardar), US2 (ler no escuro), US3 (fim de lista)

## Fase 1: Tokens e tema escuro

- [ ] W001 [US2] Testes: `contraste-tema.test.ts` (pares texto × fundo ≥ 4,5:1 nos dois temas;
      `sobre-cor` sobre `acao` e `painel`) e `cores-so-no-tema.test.ts` (sem cor solta em `src/`)
- [ ] W002 [US2] `globals.css`: tokens `sobre-cor`, `sobre-painel-suave`, `painel`, `acao`,
      `acao-escura` (D-MN-2); bloco `html[data-tema='escuro']` com a paleta D-MN-3,
      `color-scheme` e a seta escura do `select`
- [ ] W003 [US2] Trocar os usos de dois papéis: `.botao-primario` (`bg-acao`, `text-sobre-cor`,
      `hover:bg-acao-escura`), avatar, painel do login e filtro de Pedidos de acesso (`bg-painel`,
      `text-sobre-cor`, `text-sobre-painel-suave`)

## Fase 2: Escolha, persistência e botão

- [ ] W004 [US1] Testes `tema.test.ts` (D-MN-5) e `botao-tema.test.tsx` (FR-001 a FR-006)
- [ ] W005 [US1] `src/lib/tema.ts` e `public/tema-inicial.js` + `<script>` no `index.html` (D-MN-4)
- [ ] W006 [US1] Ícones `lua` e `sol`; `componentes/comum/botao-tema.tsx` com `useTema()`
- [ ] W007 [US1] Botão na `BarraSuperior`, no login e em "Sem permissão" fora da casca (D-MN-6)

## Fase 3: Fim de lista e vazios amigáveis

- [ ] W008 [US3] Testes do painel (fecho de solicitações e de avisos recentes; vazios com ícone e
      atalho "Publicar aviso"; sem fecho quando há mais) e da agenda (fecho na última página das
      três abas; sem fecho com mais páginas, no carregamento e no erro)
- [ ] W009 [US3] `FimDaLista` e `VazioDoBloco` em `componentes/comum/`; aplicar no painel
      (D-MN-7) e na agenda (D-MN-8)

## Fase 4: Ponta a ponta, acessibilidade e registro

- [ ] W010 [US1] `e2e/tema.spec.ts`: alternar, recarregar, primeiro quadro escuro, texto mantido
- [ ] W011 [US2] `e2e/acessibilidade.spec.ts`: axe também no tema escuro, em todas as telas da
      suíte
- [ ] W012 Capturas em `design/web-escuro/` e seção "Tema escuro" em `design/README.md`
- [ ] W013 Registro datado em `evidencias/` (typecheck, lint, Vitest, Playwright 2×) e READMEs
