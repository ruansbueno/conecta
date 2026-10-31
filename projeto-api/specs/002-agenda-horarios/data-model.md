# Data Model: Agenda e Horários (Entrega 3)

**Feature**: [spec.md](./spec.md) | **Data**: 2026-10-13

Estende o modelo da E1 (`specs/001-auth-perfil-turmas-avisos/data-model.md`), do qual reaproveita
`Usuario`, `Turma`, `Vinculo` e, integralmente, o mecanismo de destino.

> **Emenda (2026-10-31)**, das decisões do [plano](./plan.md): nomes físicos na nomenclatura do
> banco (D-E3-2, tabela no fim desta página); conflito de horário só entre turmas do **mesmo
> período letivo** (D-E3-9).

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
  intervalo, em turma ativa do mesmo período letivo.
- **docente**: outro horário com o mesmo `docente_id`, mesmo `dia_semana` e sobreposição, em turma
  ativa do mesmo período letivo.

Turmas de períodos diferentes não conflitam: a grade do período seguinte costuma ser montada antes
de a turma anterior ser desativada. Horário sem local não conflita por sala, e sem docente não
conflita por docente.

Sobreposição é `inicio_a < fim_b` e `inicio_b < fim_a` — encostar não é conflito. O resultado
acompanha a resposta de sucesso e nunca bloqueia a gravação (RF-44).

## Nomes físicos

Seguem a nomenclatura da E1 (`specs/001-auth-perfil-turmas-avisos/data-model.md`, "Nomes
físicos"). Nos models, os atributos usam os nomes do contrato.

| Tabela | Colunas (atributo → coluna) |
|---|---|
| `tb_evento` | `id` → `id_evento`, `titulo` → `nm_evento`, `descricao` → `txt_evento`, `tipo` → `tp_evento`, `inicio` → `dt_inicio`, `fim` → `dt_fim`, `local` → `nm_local`, `autor_id` → `id_usuario`, `situacao` → `st_evento`, `versao_atual` → `nr_versao`, `criado_em` → `dt_cadastro`, `editado_em` → `dt_edicao`, `arquivado_em` → `dt_arquivamento`, `excluido_em` → `dt_exclusao` |
| `tb_evento_destino` | `id` → `id_evento_destino`, `evento_id` → `id_evento`, `tipo` → `tp_destino`, `turma_id` → `id_turma`, `semestre` → `nr_semestre` |
| `tb_evento_versao` | `id` → `id_evento_versao`, `evento_id` → `id_evento`, `versao` → `nr_versao`, `titulo` → `nm_evento`, `descricao` → `txt_evento`, `tipo` → `tp_evento`, `inicio` → `dt_inicio`, `fim` → `dt_fim`, `local` → `nm_local`, `destinos` → `txt_destinos`, `criada_por` → `id_usuario`, `criada_em` → `dt_versao` |
| `tb_evento_historico` | `id` → `id_evento_historico`, `evento_id` → `id_evento`, `tipo` → `tp_operacao`, `usuario_id` → `id_usuario`, `ocorrido_em` → `dt_operacao`, `versao` → `nr_versao`, `alteracoes` → `txt_alteracoes` |
| `tb_horario` | `id` → `id_horario`, `turma_id` → `id_turma`, `dia_semana` → `nr_dia_semana`, `inicio` → `hr_inicio`, `fim` → `hr_fim`, `disciplina` → `nm_disciplina`, `local` → `nm_local`, `docente_id` → `id_usuario_docente` |
