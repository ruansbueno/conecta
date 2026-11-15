# Implementation Plan: Provas e aulas do docente (API)

**Branch**: `043-docente-provas-e-aulas` | **Date**: 2026-11-14 |
**Spec**: [002](../002-agenda-horarios/spec.md) (emenda E3.1: RF-53, RF-54) |
**Tarefas**: [tasks.md](./tasks.md)

**Input**: o autor, testando o aplicativo com o perfil docente, pediu que (1) o docente veja só as
provas que são dele, também na visão de mês, e (2) a aba Horários mostre em quais turmas ele vai
estar, e não a grade de cada turma como se fosse aluno.

## Decisões do autor

| Pergunta | Decisão |
|---|---|
| Quais provas são "do docente"? | As que ele **criou** (autor). Provas de colegas ou da coordenação, mesmo em turmas em que ele leciona, não aparecem. |
| Onde a regra vale? | **Na API**, para qualquer cliente: lista, filtro de tipo, janela do mês e detalhe. |
| O que a aba Horários mostra ao docente? | **As aulas dele** em todas as turmas, por nova rota da API (`GET /horarios/minhas`). |

## Decisões de implementação

- **D-DP-1 — A regra das provas fica na consulta de eventos visíveis.**
  `EventoRepository._visiveis` acrescenta, para o perfil docente,
  `tipo <> 'prova' OR autor_id = docente`. A prova ainda precisa alcançá-lo (RF-37); como o
  docente só cria eventos para turmas em que leciona (RF-36), a prova dele o alcança enquanto ele
  estiver na turma. Detalhe de prova alheia: 404 `EVENTO_NAO_ENCONTRADO`, indistinguível de
  inexistente, como os demais casos fora do alcance.
- **D-DP-2 — Gestão inalterada.** `GET /gestao/eventos` já mostra ao docente só os eventos que
  ele criou; a plataforma web não muda.
- **D-DP-3 — `GET /horarios/minhas` só para o perfil docente.** Só quem tem perfil docente pode
  ser docente de uma aula (RF-47); os outros perfis recebem 403 `SEM_PERMISSAO`, em vez de uma
  lista sempre vazia.
- **D-DP-4 — Só turmas ativas, sem exigir vínculo.** Turma inativa não tem aula acontecendo,
  como nos conflitos (D-E3-9) e na consulta da grade (404 para turma inativa, D-E3-10). Basta ser
  o docente da aula: a coordenação pode indicá-lo na grade antes de vinculá-lo à turma.
- **D-DP-5 — O item é o da grade, com a turma** (`id`, `codigo`, `nome`), para o aplicativo
  dizer em qual turma é cada aula. `Horario` ganha a relação `turma` (`lazy="raise"`, carregada
  explicitamente); o banco não muda.

- **D-DP-6 — Consequência de D-DP-1 (a confirmar com o autor):** a prova do docente precisa alcançá-lo;
  se ele deixar a turma, ou se a coordenação trocar os destinos, ela sai do aplicativo dele e
  continua na gestão da web (onde o docente vê o que criou).

## Fora do escopo

- Outros tipos de evento: o docente continua vendo palestras, reuniões, bancas etc. que o
  alcançam, de qualquer autor.
- A grade da turma (`GET /turmas/{id}/horarios`) continua igual para todos os perfis.
