# Data Model: Agenda e Horários (Entrega 3)

**Feature**: [spec.md](./spec.md) | **Data**: 2026-10-13

Estende o modelo da E1 (`specs/001-auth-perfil-turmas-avisos/data-model.md`), do qual reaproveita
`Usuario`, `Turma`, `Vinculo` e, integralmente, o mecanismo de destino.

## Evento

| Campo | Tipo | Regras |
|---|---|---|
| `id` | UUID | |
| `titulo` | texto 3–150 | obrigatório |
| `descricao` | texto até 5000 | opcional |
| `tipo` | enum | `palestra`, `banca`, `reuniao`, `formatura`, `prova`, `data_importante`, `outro` |
| `inicio` | timestamp com fuso | obrigatório |
| `fim` | timestamp com fuso | opcional; maior que `inicio` |
| `local` | texto até 120 | opcional |
| `autor_id` | UUID → Usuario | obrigatório |
| `situacao` | enum | `ativo`, `arquivado`, `excluido` |
| `criado_em`, `editado_em`, `arquivado_em`, `excluido_em` | timestamp | auditoria |
| `versao_atual` | inteiro | começa em 1 |

Não há `publicar_em`: evento não tem agendamento de publicação (seção 2.1 da spec). Índices
previstos: `(situacao, inicio)` para a listagem e `(autor_id)` para a visão do docente.

## DestinoEvento

Mesma estrutura de `DestinoAviso`: `(evento_id, tipo, turma_id, semestre)`, com `tipo` em
`todos`, `turma`, `semestre`, `docentes`, restrição de 1 a 20 por evento e unicidade do par.
A regra de visibilidade é a mesma consulta da E1, trocando a tabela de origem — o que mantém uma
única definição de "quem é alcançado" no sistema.

## VersaoEvento

`(evento_id, versao)` com cópia completa de `titulo`, `descricao`, `tipo`, `inicio`, `fim`,
`local` e da lista de destinos, mais `criada_por` e `criada_em`. Nunca é alterada.

## HistoricoEvento

`(id, evento_id, tipo, usuario_id, ocorrido_em, versao, alteracoes)`, com `tipo` em `criado`,
`editado`, `arquivado`, `desarquivado`, `excluido`. `alteracoes` guarda, por campo, o valor
anterior e o novo. Imutável: sem update, sem delete.

## HorarioTurma

| Campo | Tipo | Regras |
|---|---|---|
| `id` | UUID | |
| `turma_id` | UUID → Turma | obrigatório; remoção em cascata com a turma |
| `dia_semana` | inteiro 1–7 | 1 = segunda |
| `inicio`, `fim` | hora local `HH:MM` | `fim` maior que `inicio` |
| `disciplina` | texto 2–120 | obrigatório |
| `local` | texto até 80 | opcional |
| `docente_id` | UUID → Usuario | opcional; perfil MUST ser `docente` |

Sem data de início e fim: a grade vale por todo o período letivo da turma (RF-46). Não há tabela
de exceções — mudança pontual é comunicada por aviso. Índice previsto: `(turma_id, dia_semana,
inicio)`.

`HorarioTurma` **não** tem versões nem histórico: é configuração da grade, não comunicação. A
remoção é física.

## Conflito (calculado, não armazenado)

Resultado da verificação feita ao criar ou editar um horário:

- **sala**: outro horário com `local` equivalente — comparação normalizada, sem acento, sem
  diferença de caixa e com espaços colapsados — no mesmo `dia_semana`, com sobreposição de
  intervalo, em turma ativa.
- **docente**: outro horário com o mesmo `docente_id`, mesmo `dia_semana` e sobreposição.

Sobreposição é `inicio_a < fim_b` e `inicio_b < fim_a` — encostar não é conflito. O resultado
acompanha a resposta de sucesso e nunca bloqueia a gravação (RF-44).
