# Implementation Plan: Aplicativo CONECTA — Fase F2 (agenda e horários)

**Branch**: `026-app-f2-plano` | **Date**: 2026-11-01 | **Spec**: [spec.md](./spec.md) (US6, RM-24 a
RM-27) | **API**: [`projeto-api/specs/002-agenda-horarios`](../../../projeto-api/specs/002-agenda-horarios)
(E3, completa na API) | **Plano da F1**: [plan.md](./plan.md)

## Summary

A F2 traz para o app as telas T10 a T13 (`design/mobile/m-10-agenda.png`, `m-10b-agenda-mes.png`,
`m-11-evento-detalhe.png`, `m-12-horarios.png`):

- **Agenda**: lista dos próximos eventos, atalho para as provas, filtro por tipo e visão de mês;
- **Evento**: o detalhe;
- **Horários**: a grade semanal da turma.

Consome três chamadas de leitura da E3: `GET /eventos`, `GET /eventos/{id}` e
`GET /turmas/{id}/horarios`. Nenhuma escrita: quem cria eventos e monta a grade é a gestão, na web.

As camadas da F1 continuam como estão. A F2 acrescenta:

- dois modelos (`Evento` e `Aula`);
- dois repositórios;
- três controllers;
- quatro telas;
- duas abas.

Não muda nada em sessão e rede. O cache ganha recursos novos, mas com o mesmo formato. Isso confirma
a previsão do fim do [plan.md](./plan.md).

## Technical Context

Igual ao da F1: Dart 3, Flutter estável, `provider`, `http`, `flutter_secure_storage`,
`shared_preferences` e `intl`. **Nenhuma dependência nova.** O calendário do mês é um widget
próprio de 7 colunas: um pacote de calendário traria tema e acessibilidade alheios ao design
system (Princípios V e VI).

**Escopo**: 4 telas, 3 endpoints e 2 abas, para todos os perfis. Coordenação e administração quase
nunca têm vínculo com turma, então em Horários veem o estado vazio. O app não decide isso: mostra o
que `GET /turmas/minhas` devolve.

## Constitution Check

| Princípio | Como a F2 atende |
|---|---|
| I. Cliente sem regra de negócio | Quem diz quais eventos alcançam a pessoa é a API (`alcanca()`); o app só agrupa e desenha. A janela do mês vai à API, e o app não filtra encerrados nem destinos |
| II. Contrato como fonte da verdade | Modelos espelham `EventoSaida` e `HorarioSaida` (contracts E3 §1–3); `EVENTO_NAO_ENCONTRADO` e `TURMA_NAO_ENCONTRADA` entram no mapa único de falhas |
| III. Sessão e dados sensíveis | O cache novo segue a chave `cache:{usuario}:…` e sai no logout, como o da F1; a turma escolhida em Horários é só um id |
| IV. Camadas separadas | `models / repositories / state / ui`, como na F1; as regras puras de calendário e agrupamento ficam em `ui/agenda/calendario.dart`, testadas sem widget |
| V. Design system único | Cores por tipo de evento em `theme/`, no mesmo esquema dos chips de destino |
| VI. Simplicidade | Sem dependência nova |

**Resultado**: conforme.

## Decisões

- **D-AF2-1 — Abas.**
  - A barra passa a ter cinco abas, como na spec §3: Avisos · Agenda · Turmas · Horários · Perfil.
  - Valem para todos os perfis.
  - Cada aba mantém seu estado no `IndexedStack`, como as da F1.

- **D-AF2-2 — Chips da agenda (decisão de 01/11/2026).**
  - Os chips são **Próximos · Provas · Mês**, como no desenho.
  - **Próximos** chama `GET /eventos` sem janela: os não encerrados, em ordem de início, 20 por
    página, com rolagem infinita sobre `ControllerDeLista`.
  - **Provas** é a mesma lista com `tipo=prova`.
  - O ícone de filtro no topo abre uma folha com os tipos: Todos, Palestra, Banca, Reunião,
    Formatura, Prova, Data importante e Outro.
  - O tipo escolhido vale para Próximos e Mês; no chip Provas, a folha fica desabilitada.
  - Com filtro ativo, o ícone fica destacado e o título ganha o tipo ("Agenda · Banca"); em Provas, o título não o mostra, e o nome do botão diz o tipo escolhido.

- **D-AF2-3 — Cartão do evento na lista.** Como na m-10:
  - **Coluna da data:** dia e mês, só no primeiro evento de cada dia. Os seguintes do mesmo dia
    ficam sem a coluna, e é isso que agrupa por data (RM-24).
  - **Rótulo do tipo:** colorido.
  - **Título.**
  - **Horas:** "19:10 – 20:50", "até 23:59" para data importante sem fim, ou só a hora de início
    para os outros tipos sem fim. Evento de vários dias mostra "de 02/09 a 04/09".
  - **Local.**
  - **Chips de destino:** os da F1.
  - **Toque:** abre o detalhe.

- **D-AF2-4 — Visão de mês (semana começando no domingo, decisão de 01/11/2026).**
  - **Grade:** 7 colunas D S T Q Q S S, com ‹ › para trocar de mês.
  - **Consulta:** `GET /eventos?de=<1º dia da grade>&ate=<dia seguinte ao último da
    grade>&incluir_encerrados=true&limit=100`. A janela é a da grade inteira, para os dias de
    outros meses também mostrarem seus eventos.
  - **Encerrados:** sem `incluir_encerrados`, os dias que já passaram viriam vazios. É o mesmo
    pedido que a web faz.
  - **Marcadores por dia:**
    - até 3 pontos, com a cor do tipo;
    - o evento de vários dias marca cada dia que toca.
  - **Hoje:** número em azul.
  - **Dia escolhido:** círculo navy.
    - Ao abrir, o dia escolhido é hoje, se estiver no mês; senão, o dia 1.
  - **Lista do dia escolhido:**
    - **Cabeçalho:** "Sexta, 16 de outubro" e "N atividades".
    - **Coluna de horário:**
      - a hora de início, no dia em que o evento começa;
      - "até HH:MM", no último dia de um evento de vários dias;
      - "o dia todo", nos dias do meio.
    - **Dia sem evento:** "Nenhuma atividade neste dia" (cenário 3 da US6).
  - **Acima de 100 eventos na janela:** faixa "Mostrando 100 de N atividades deste mês".
  - **Acessibilidade:** cada dia é um botão. O nome começa pelo número visível, segue com a data
    por extenso e a quantidade ("16, sexta, 16 de outubro, 2 atividades") e marca o dia escolhido
    como selecionado.

- **D-AF2-5 — Detalhe do evento (m-11).** Mostra:
  - o selo do tipo;
  - o título;
  - o cartão de data e hora (vários dias: "De 02/09, 19:00, a 04/09, 18:00");
  - o cartão de local (só se houver);
  - a descrição;
  - "Para quem é", com os chips;
  - o autor com avatar.
  - Abre com o evento que veio da lista e revalida por `GET /eventos/{id}`. Sem rede, fica o que
    veio da lista, com a faixa de cache.
  - Um 404 `EVENTO_NAO_ENCONTRADO` mostra a mensagem, volta à agenda e a recarrega (mesmo padrão do
    aviso, `voltaLista`).
  - Aberto de fora da lista (link direto), mostra o esqueleto até a resposta.

- **D-AF2-6 — Horários (m-12).**
  - **Turmas:** vêm de `GET /turmas/minhas`, do cache da aba Turmas. Só a primeira página (20 turmas): limite conhecido, folgado para aluno e docente do curso.
  - **Sem vínculo:** estado vazio "A grade aparece depois do vínculo com uma turma." (cenário 5 da
    US6).
  - **Com um vínculo:** o código da turma aparece como texto.
  - **Com mais de um:** o botão "Turma SI-3A →" abre uma folha com as turmas (RM-27).
  - **Turma escolhida:** fica lembrada por usuário, só o id. Se o vínculo sumiu, volta à primeira.
  - **Subtítulo:** o nome da turma.
  - **Grade:**
    - agrupada por dia da semana, só os dias com aula;
    - cada linha mostra a disciplina, "19:10–20:50 · Lab 4" e o docente;
    - vem por `GET /turmas/{id}/horarios?limit=100`, sem paginação, porque uma turma tem poucas
      aulas.

- **D-AF2-7 — Falhas da grade.**
  - **Sem vínculo** (403 `SEM_PERMISSAO`, vínculo removido depois que a lista foi carregada): "Você
    não está mais nesta turma." e recarrega as turmas.
  - **Turma inativa ou inexistente** (404 `TURMA_NAO_ENCONTRADA`): "Esta turma não está mais
    disponível." e recarrega as turmas.
  - Nos dois casos a turma lembrada é esquecida.
  - As duas mensagens são próprias da tela, não as genéricas do mapa: o `SEM_PERMISSAO` genérico
    fala de perfil, e aqui o motivo é o vínculo.

- **D-AF2-8 — Cache (decisão de 01/11/2026).**
  - **O que fica guardado**, no mesmo formato da F1:
    - a primeira página de Próximos (sem filtro);
    - o mês corrente (o que abre por padrão);
    - a grade de cada turma aberta, sob a chave `horarios:{turmaId}`.
  - **O que não fica guardado:** Provas, outros meses e listas com filtro de tipo, que são
    consultas do momento.
  - **O detalhe** usa o evento da lista (D-AF2-5).
  - **Mudança técnica:** `RecursoCache` passa a aceitar sufixo para a grade por turma.
  - **No logout,** o `apagarUsuario` continua removendo tudo pelo prefixo.
  - **Sem rede, com cache:** a faixa "Mostrando dados de {data/hora}" e "tentar de novo", como nos
    avisos.

- **D-AF2-9 — Datas e horas.**
  - **Fuso:** os eventos vêm em ISO com fuso e são exibidos no fuso do aparelho, com os helpers de
    `ui/comum/datas.dart`.
  - **Janela do mês:** é montada em hora local e enviada em UTC.
  - **Horas da grade:** chegam em `HH:MM` local, sem data, e não são convertidas (contracts E3 §3).

- **D-AF2-10 — Cores por tipo.**
  - **Prova:** âmbar.
  - **Data importante:** navy.
  - **Os demais:** azul.
  - **Onde valem:** a barra do cartão e os pontos do mês, com o rótulo do tipo na mesma cor. É o
    que data-model.md já previa.
  - **Sem desenho, só as do esquema:** o selo do detalhe e as barras da grade. As barras da grade
    usam azul só, porque a API não tem tipo de aula.

- **D-AF2-11 — Diferenças deliberadas em relação ao desenho.** Ficam registradas nas evidências:
  - **Detalhe sem o subtítulo do local** ("Prédio B, térreo") **e sem "Publicado em":** a API tem um
    só campo de local e não informa a data de criação ao cliente. Mostra "editado em …" quando
    houver.
  - **Horários sem o turno** ("noturno"): a API não tem esse dado.
  - **Grade com o fim da aula e o docente,** que o desenho omite e a US6 pede (cenário 4).
  - **Barras da grade numa cor só.**

- **D-AF2-12 — Servidor falso de integração.**
  - `integration_test/servidor_falso.dart` passa a responder `GET /eventos` (janela por
    sobreposição, `incluir_encerrados`, `tipo`), `GET /eventos/{id}` e
    `GET /turmas/{id}/horarios`.
  - Segue o contrato da E3, com as falhas forçáveis da F1.

## Project Structure (acréscimos)

```text
lib/
├── models/evento.dart · aula.dart
├── repositories/eventos_repository.dart · horarios_repository.dart
├── services/cache_local.dart          # recursos da agenda e da grade (D-AF2-8)
├── state/agenda_controller.dart       # Próximos e Provas, sobre ControllerDeLista
│         mes_controller.dart          # janela, marcadores e dia escolhido
│         horarios_controller.dart     # turma escolhida e grade
├── theme/cores.dart                   # cores por tipo de evento (D-AF2-10)
└── ui/
    ├── agenda/agenda_page.dart · evento_card.dart · mes_view.dart · calendario.dart
    │          detalhe_page.dart · folha_tipos.dart
    ├── horarios/horarios_page.dart · folha_turmas.dart
    └── casca/casca_abas.dart          # cinco abas (D-AF2-1)

test/unit/        evento_test · aula_test · calendario_test · repositorios da F2 · controllers
test/widget/      agenda_page · mes_view · detalhe_evento · horarios_page
integration_test/ agenda_test · horarios_test · offline_test (acréscimos)
```

## Entregas (decisão de 01/11/2026)

1. **Este PR:** o plano, as tarefas e as emendas de [`contracts/consumo-api.md`](./contracts/consumo-api.md)
   e [`data-model.md`](./data-model.md).
2. **Agenda:** fases 9 e 10 ([tasks-f2.md](./tasks-f2.md)): fundação, lista, Provas, filtro, mês e
   detalhe.
3. **Horários e polimento:** fases 11 e 12: grade, testes de integração no emulador, acessibilidade,
   validação visual e evidências.
