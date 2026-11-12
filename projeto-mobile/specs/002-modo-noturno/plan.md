# Implementation Plan: Modo noturno e fim de lista (aplicativo)

**Branch**: `036-modo-noturno` | **Date**: 2026-11-11 | **Spec**: [spec.md](./spec.md)

**Input**: spec 002 do app; paleta escura aprovada pelo autor em 11/11/2026, com os botões
principais em `#2563eb` e texto branco também no escuro. A tabela completa da paleta está no
[plan da web](../../../projeto-web/specs/002-modo-noturno/plan.md) (D-MN-3); os nomes abaixo são
os do app.

## Summary

Hoje as cores são constantes de compilação (`Cores.navy`, cerca de 170 usos em 28 arquivos) e a
tipografia (`Tipografia.meta` etc.) já traz a cor embutida. Para o tema poder mudar em tempo de
execução, as cores e os estilos de texto passam a vir do tema ativo, por `ThemeExtension`, e as
telas os leem do `BuildContext`. A escolha fica num controlador pequeno, lido antes do primeiro
quadro. Sem dependência nova: `shared_preferences` e `provider` já estão no projeto.

## Technical Context

Igual ao da 001: Flutter 3.41.4, Dart 3, `provider`, `shared_preferences`, testes de unidade e de
widget com a API falsa (`AppFalso`). Nenhuma dependência nova (Princípio VI).

## Constitution Check

- **I. Cliente sem regra de negócio** — PASS. Nada vai à API.
- **III. Sessão e dados sensíveis** — PASS, com esclarecimento (constituição 1.0.1): a preferência
  de tema não é dado do usuário nem cache; fica em `shared_preferences` e sobrevive a sair da
  conta. O token continua só no armazenamento seguro.
- **IV. Camadas separadas e testáveis** — PASS. `PreferenciaTema` (serviço) e `TemaController`
  (estado) são testados sem widget.
- **V. Design system único** — PASS. As cores continuam só em `lib/theme/`; o teste existente de
  literal de cor é reforçado para proibir também `Cores.` fora de `lib/theme/` (cor fixa que não
  muda com o tema).
- **VI. Dependências** — PASS. Nenhuma.

## Decisões

- **D-AMN-1 — Cores como `ThemeExtension`.** `lib/theme/cores.dart` passa a ter
  `class CoresConecta extends ThemeExtension<CoresConecta>` com os mesmos nomes de hoje (`navy`,
  `azul`, `fundoPagina`…) e duas instâncias, `CoresConecta.claro` e `CoresConecta.escuro`. As
  cores de destino e de evento entram na mesma extensão (`destinoTodosPonto`…). Acesso:
  `context.cores.navy` (extensão de `BuildContext`). A classe `Cores` estática deixa de existir.
- **D-AMN-2 — Tipografia por tema.** `Tipografia` mantém família, tamanhos, pesos e entreletras;
  a cor sai das constantes. `class TiposConecta extends ThemeExtension<TiposConecta>` monta os
  estilos com a cor do tema (`TiposConecta.de(CoresConecta)`). Acesso: `context.tipos.meta`.
- **D-AMN-3 — Tokens novos por papel**, os mesmos da web: `sobreCor` (texto sobre cor cheia,
  branco nos dois temas), `painel` (fundo navy cheio: avatar, dia escolhido no mês, snackbar),
  `acao`/`acaoEscura` (`#2563eb`/`#1d4ed8`, fundo do botão principal).
- **D-AMN-4 — `temaConecta(CoresConecta)`.** O `ThemeData` passa a ser gerado a partir da paleta,
  com `ColorScheme` claro ou escuro (`brightness`), as duas extensões e os mesmos temas de
  componentes de hoje. `MaterialApp` recebe `theme`, `darkTheme` e `themeMode`.
- **D-AMN-5 — Escolha e persistência.** `lib/services/preferencia_tema.dart` lê e grava
  `conecta:tema` (`claro`/`escuro`; outro valor = sem escolha; falha ao gravar não propaga).
  `lib/state/tema_controller.dart` (`ChangeNotifier`) expõe `ThemeMode` (`system` sem escolha) e
  `alternar(Brightness efetivo)`, que grava o oposto do tema que está na tela. A preferência entra
  em `Dependencias`, lida em `dependenciasReais()` antes do `runApp` (FR-005).
- **D-AMN-6 — Botão.** `lib/ui/comum/botao_tema.dart`: `IconButton` com `Icons.dark_mode_outlined`
  (lua) ou `Icons.light_mode_outlined` (sol), conforme `Theme.of(context).brightness`, com
  `tooltip` e alvo de 48 dp. Entra como última ação de toda `AppBar` e, no login e em "Sem
  conexão", num `Align(topRight)` dentro de `SafeArea`.
- **D-AMN-7 — Fecho.** `FimDaLista` em `lib/ui/comum/` (texto `meta`, centrado). `RodapeLista`
  ganha o parâmetro opcional `fim`: quando a lista acabou (`!temMais`, sem carregamento e sem
  falha) e há itens, mostra `FimDaLista(fim)`. Avisos continua com o seu rodapé próprio.

## Testes

- **Unidade**: `preferencia_tema_test.dart` (ler, gravar, valor inválido, falha ao gravar),
  `tema_controller_test.dart` (sistema por padrão, alternar a partir do claro e do escuro efetivo,
  notifica), `tema_test.dart` estendido (os dois temas: brilho, extensões presentes, botão
  principal `#2563eb` com texto branco), `contraste_tema_test.dart` (pares de texto × fundo ≥ 4,5:1
  nos dois temas), `design_system_test.dart` estendido (sem `Cores.` fora de `lib/theme/`).
- **Widget** (`tema_app_test.dart`): sistema escuro sem escolha abre escuro; o botão existe no
  login, nas abas e nos detalhes; tocar alterna e grava; reabrir mantém; sair da conta mantém;
  texto digitado no login sobrevive à troca.
- **Widget**: fechos de agenda, turmas disponíveis, solicitações e horários, e a ausência deles com
  mais páginas.
- **Acessibilidade**: `acessibilidade_test.dart` repete as telas com o tema escuro.

## Riscos

- A troca de `Cores.x` por `context.cores.x` tira `const` de muitos widgets; o risco é de
  regressão visual, coberto pela suíte de widget atual (358 testes) e pelas capturas no emulador.
