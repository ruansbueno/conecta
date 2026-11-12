# Tasks: Modo noturno e fim de lista (aplicativo)

**Input**: [plan.md](./plan.md), [spec.md](./spec.md).

**Tests**: escritos antes da implementação (falham primeiro). Unidade em `test/unit/`, widget em
`test/widget/`. Formatação com `dart format -l 100`.

## Format: `[ID] [P?] [Story] Description`

- **[Story]**: US1 (alternar e guardar), US2 (ler no escuro), US3 (fim de lista)

## Fase 1: Tema a partir da paleta

- [x] M001 [US2] Testes: `contraste_tema_test.dart`, `tema_test.dart` estendido e
      `design_system_test.dart` estendido (sem `Cores.` fora de `lib/theme/`)
- [x] M002 [US2] `CoresConecta` (claro e escuro, tokens novos de D-AMN-3), `TiposConecta`,
      extensões `context.cores`/`context.tipos` e `temaConecta(CoresConecta)`
- [x] M003 [US2] Trocar `Cores.`/`Tipografia.` com cor nas 28 telas por `context.cores`/
      `context.tipos`; a suíte atual continua verde

## Fase 2: Escolha, persistência e botão

- [x] M004 [US1] Testes `preferencia_tema_test.dart`, `tema_controller_test.dart` e
      `tema_app_test.dart`
- [x] M005 [US1] `PreferenciaTema`, `TemaController`, `Dependencias.preferencias`, `MaterialApp`
      com `theme`/`darkTheme`/`themeMode`
- [x] M006 [US1] `BotaoTema` em todas as `AppBar`, no login e em "Sem conexão"

## Fase 3: Fim de lista

- [ ] M007 [US3] Testes dos fechos (agenda por vir e provas, turmas disponíveis, solicitações,
      horários) e da ausência com mais páginas
- [ ] M008 [US3] `FimDaLista`, parâmetro `fim` no `RodapeLista` e aplicação nas quatro telas

## Fase 4: Acessibilidade e registro

- [ ] M009 [US2] `acessibilidade_test.dart` também no tema escuro
- [ ] M010 Capturas do emulador em `design/mobile-escuro/`
- [ ] M011 Registro datado em `evidencias/` (analyze e suíte completa) e READMEs
