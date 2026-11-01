# Implementation Plan: Plataforma web — Fase F2 (agenda e horários)

**Branch**: `023-web-f2-plano` (plano) | **Date**: 2026-10-31 | **Spec**: [spec.md](./spec.md)
(US7, RW-34 a RW-36, RW-46; telas T12 e T13) | **API**: E3 completa
([`projeto-api/specs/002-agenda-horarios`](../../../projeto-api/specs/002-agenda-horarios/), PRs #22
e #23)

**Input**: F1 implementada e integrada (77/77 tarefas, PR #13). A API da E3 está implementada:
eventos com destinos, versões e histórico, e grade de horários com conflitos. Este plano cobre a
F2 da plataforma: a agenda (T12, `w-12-agenda.png`) e a grade da turma (T13,
`w-13-horarios.png`). A F2 do aplicativo tem plano próprio.

## Summary

Duas áreas novas, sobre a mesma arquitetura da F1 (`api/` → `paginas/` → `componentes/`), sem
dependência nova:

- **Agenda** (`/eventos`): abas Próximos, Mês, Realizados e Arquivados; editor de evento com o
  mesmo seletor de destinos dos avisos; histórico e versões com a mesma linha do tempo; arquivar,
  desarquivar e excluir com confirmação.
- **Horários** (`/horarios` → `/turmas/[id]/horarios`): grade semanal da turma, modal de aula
  (criar, editar, remover), conflitos de sala e de docente mostrados como informação, e o convite
  para avisar a turma depois de mudar a grade.

Antes das telas, uma emenda pequena na API (D-F2-2) e a mudança de lugar dos componentes de
destino e de histórico, que deixam de ser "de aviso" (previsto no `plan.md`, seção "Fase F2").

## Technical Context

Igual ao da F1 ([plan.md](./plan.md)): TypeScript estrito, React 19, React Router 7, Tailwind 4,
`zod`, Vitest + Testing Library, Playwright contra o servidor falso (D13), axe para
acessibilidade. Nenhuma dependência nova: o calendário do mês e a grade semanal são montados com
CSS grid.

## Constitution Check

- **I. API como fonte da verdade** — PASS. Visibilidade, permissões, conflitos e histórico vêm da
  API; a interface só apresenta. A emenda D-F2-2 mantém a regra de "encerrado" no servidor, em vez
  de recalculá-la no navegador.
- **III. Sessão por cookie e CSRF** — PASS. Nada muda: as escritas novas passam pelo mesmo
  cliente.
- **IV. Nenhum segredo no build** — PASS.
- **Acessibilidade (RW-39, RW-40)** — PASS, com as mesmas verificações da F1 (axe por tela, só
  teclado, foco em modal e mensagens).

## Decisões da F2

- **D-F2-1 — Abas da agenda.** A w-12 traz Próximos, Mês e Realizados; acrescenta-se
  **Arquivados**, sem a qual não há como desarquivar (decisão de 31/10/2026). Mapeamento para
  `GET /gestao/eventos`:
  - Próximos: `situacao=ativo&quando=proximos` (não encerrados, início crescente);
  - Mês: `situacao=ativo&de=<dia 1>&ate=<dia 1 do mês seguinte>` — a janela da API pega todo
    evento que toca o mês, inclusive os de vários dias;
  - Realizados: `situacao=ativo&quando=realizados` (encerrados, mais recentes primeiro);
  - Arquivados: `situacao=arquivado`.

  A aba, o tipo, a busca, o mês e a página vivem na URL, como nas listas da F1
  (`paginas/lista-na-url.ts`). Excluídos não têm aba: a auditoria de um excluído continua
  acessível pelo histórico, para a gestão, a partir de um link direto.
- **D-F2-2 — Emenda na API: `quando`.** `GET /gestao/eventos` ganha
  `quando=proximos|realizados`. `proximos` é o mesmo "não encerrado" da consulta dos clientes
  (`COALESCE(fim, inicio) >= agora`, início crescente); `realizados` é o complemento, em início
  **decrescente**. Sem `quando`, nada muda. É emenda ao contrato da E3 (§5), com teste de
  contrato na API e espelho no servidor falso. Sem ela, Realizados abriria pelo evento mais
  antigo e repetiria os que estão em andamento (decisão de 31/10/2026).
- **D-F2-3 — Rotas.** `/eventos` (lista), `/eventos/novo`, `/eventos/[id]/editar`,
  `/eventos/[id]` (detalhe; `?aba=historico` abre o histórico e as versões, como no aviso); `/horarios` (escolha da turma) e `/turmas/[id]/horarios` (grade). O
  item "Horários" da barra lateral abre `/horarios`, que lista as turmas ativas e lembra a
  última escolhida (preferência local, sem dado sensível); o detalhe da turma (T08) ganha o link
  "Horários" (decisão de 31/10/2026).
- **D-F2-4 — Componentes comuns.** `seletor-destinos`, `destinos-docente` e `linha-do-tempo` saem de
  `componentes/avisos/` para `componentes/comum/`; o texto "aviso" vira parâmetro (`assunto`). A
  lista de versões fica em cada módulo: as versões do aviso e as do evento têm campos diferentes. A mudança vem antes das telas novas, sem alterar comportamento: os
  testes dos avisos continuam passando como estão.
- **D-F2-5 — Editor de evento.** Mesmo padrão do editor de aviso (T04/T15): campos título, tipo,
  início, fim (opcional), local (opcional), descrição (opcional) e destinos; rascunho local sem o
  token; nada digitado se perde em erro da API ou sem rede (RW-42); 422 marca o campo indicado
  pela API. Datas e horas são digitadas e exibidas no fuso do navegador e enviadas em ISO com
  fuso. O docente usa o seletor restrito às turmas em que leciona, como nos avisos.
- **D-F2-6 — Cartão do evento na lista.** Como na w-12: dia e mês à esquerda, tipo, título, faixa
  de horas, local e
  chips de destino. Evento sem fim mostra só a hora de início, e o do tipo "data importante" sem fim
  mostra "até HH:MM", lido como prazo (como no desenho); "dia todo" não existe na API. Evento de
  vários dias mostra "de 02/09 a 04/09". Ações: editar, arquivar (na
  aba Arquivados, desarquivar) e histórico; excluir fica no detalhe do evento, com confirmação.
- **D-F2-7 — Calendário do mês.** Tabela de 7 colunas (segunda a domingo) com navegação ‹ ›; cada
  dia é um botão com os títulos dos eventos que o tocam (até 3, depois "+N"), e o escolhido fica
  marcado (`aria-pressed`); escolher um dia filtra a lista abaixo do calendário. A consulta pede a
  janela da grade inteira, para os dias de outros meses também mostrarem seus eventos; acima de
  100 eventos, a página avisa que o mês está incompleto. Sem desenho próprio: segue os tokens e componentes da w-12.
- **D-F2-8 — Grade semanal.** Colunas de segunda a sexta sempre; sábado e domingo só quando houver
  aula neles. As linhas são os horários de início distintos da turma, em ordem, e cada cartão
  mostra disciplina, a faixa início–fim, local e docente (a linha é só o início; aulas da mesma
  linha podem terminar em horas diferentes). Cartão com aula abre a edição; célula vazia é um botão
  que abre a modal de nova aula já com o dia e o início daquela linha. O seletor da turma acima da
  grade volta a `/horarios` para trocar de turma. As faixas "Intervalo" do desenho não são
  geradas: a API não tem esse conceito (decisões de 01/11/2026).
- **D-F2-9 — Modal de aula.** Criar, editar e remover numa modal com dia, início, fim,
  disciplina, local e docente. O docente é escolhido entre os usuários de perfil docente
  (`GET /gestao/usuarios?perfil=docente`). Remover pede confirmação (é físico, sem histórico).
- **D-F2-10 — Conflitos (RW-46).** O 201/200 com `conflitos` não é erro: a aula fica salva, a
  modal fecha e a página mostra uma mensagem de atenção (não de erro) listando cada conflito —
  "Sala Lab 4 também ocupada por SI-3B, segunda 19:10–20:50" ou "Helena Prado também dá aula em
  …" —, com o foco nela, como as demais mensagens de ação da F1.
- **D-F2-11 — Avisar a turma (RW-36).** Depois de salvar ou remover uma aula, a mensagem de ação
  oferece "Criar aviso para a SI-3A", e o cartão fixo "Mudou alguma aula?" do desenho também. Os
  dois levam a `/avisos/novo?turma=<id>`, que abre o editor com essa turma como destino. A
  plataforma deixa claro que a mudança na grade não notifica ninguém sozinha.
- **D-F2-12 — "Docentes nesta grade".** Derivado das aulas da turma: cada docente com as
  disciplinas que dá nela.
- **D-F2-13 — Perfis.** Agenda: administração, coordenação e docente (o docente vê e gere só os
  eventos que criou, como na API). Horários: só administração e coordenação; o item não aparece
  para o docente, que consulta a grade pelo aplicativo. Rota fora do perfil leva à tela de sem
  permissão (T16), como na F1.
- **D-F2-14 — Diferenças deliberadas em relação ao desenho.** Sem a legenda "Aula prática / Aula
  teórica" e sem "Grade atualizada em … por …": a API não guarda tipo de aula nem autoria da
  grade (horário não tem histórico, D-E3-12). Sem as faixas "Intervalo" (D-F2-8). Aba Arquivados
  a mais (D-F2-1). Registradas também nas evidências da F2.
- **D-F2-15 — Servidor falso.** O servidor do Playwright passa a implementar `/gestao/eventos`
  (com `quando`, janela por sobreposição, versões e histórico) e `/gestao/turmas/{id}/horarios`
  (com conflitos), fiel ao contrato da E3, e sabe forçar as mesmas falhas da F1.

## Project Structure (acréscimos)

```text
src/
├── api/recursos/eventos.ts · horarios.ts     # chamadas e esquemas zod da E3
├── componentes/
│   ├── comum/                                # seletor de destinos e linha do tempo (D-F2-4)
│   ├── eventos/  cartao-evento · calendario-mes · formulario-evento
│   └── horarios/ grade-semanal · modal-aula · conflitos · docentes-da-grade
├── lib/formulario-evento.ts · grade.ts       # regras puras (validação, montagem da grade)
└── paginas/
    ├── eventos/  lista · novo · editar · historico · acoes
    └── horarios/ escolher-turma · grade
e2e/
├── servidor-falso/   eventos e horários (D-F2-15)
├── agenda.spec.ts · horarios.spec.ts
tests/unit · tests/componente                  # um arquivo por regra e por componente novo
```

## Testes

Mesma estratégia da F1, com os testes escritos antes do código: unidade para as regras puras
(montagem da grade, validação do formulário, mapeamento das abas), componente para cada tela e
modal, Playwright para os fluxos completos contra o servidor falso, axe e teclado em cada tela
nova, e validação visual com Chrome headless contra a API local real, comparada aos PNGs.

## Fora deste plano

- F2 do aplicativo (m-10 a m-12).
- Aba de excluídos na agenda (o histórico de um excluído segue acessível à gestão por link).
- Próximos eventos no painel (não está na spec).

## Complexity Tracking

Sem violações. A emenda D-F2-2 é a única mudança fora da web e existe para a regra de
"encerrado" continuar no servidor.
