// Turmas de gestão (contrato §11). Só este módulo conhece os caminhos de turma.
import { requisitar } from '../cliente'
import { paginaSchema, turmaSchema, type DadosTurma } from '../schemas'

export type { DadosTurma }

export interface FiltrosTurmas {
  ativa?: boolean
  semestre_curso?: number
  periodo_letivo?: string
  q?: string
  limit?: number
  offset?: number
}

/** PATCH parcial; `ativa: true` reativa uma turma desativada. */
export type EdicaoTurma = Partial<DadosTurma> & { ativa?: boolean }

const paraContrato = (d: EdicaoTurma) => {
  const corpo: Record<string, unknown> = {}
  if (d.codigo !== undefined) corpo.codigo = d.codigo
  if (d.nome !== undefined) corpo.nome = d.nome
  if (d.semestreCurso !== undefined) corpo.semestre_curso = d.semestreCurso
  if (d.periodoLetivo !== undefined) corpo.periodo_letivo = d.periodoLetivo
  if (d.inscricoesAbertas !== undefined) corpo.inscricoes_abertas = d.inscricoesAbertas
  if (d.ativa !== undefined) corpo.ativa = d.ativa
  return corpo
}

const caminho = (id: string) => `/gestao/turmas/${encodeURIComponent(id)}`

/** Docente recebe só as turmas em que leciona: quem filtra é a API (plan-e2 D-E2-1). */
export const listarTurmas = (filtros: FiltrosTurmas = {}) =>
  requisitar('GET', '/gestao/turmas', { query: { ...filtros }, esquema: paginaSchema(turmaSchema) })

export const obterTurma = (id: string) => requisitar('GET', caminho(id), { esquema: turmaSchema })

export const criarTurma = (dados: DadosTurma) =>
  requisitar('POST', '/gestao/turmas', { corpo: paraContrato(dados), esquema: turmaSchema })

export const editarTurma = (id: string, edicao: EdicaoTurma) =>
  requisitar('PATCH', caminho(id), { corpo: paraContrato(edicao), esquema: turmaSchema })

/** Desativação lógica: vínculos ficam; a turma sai das inscrições e deixa de receber avisos. */
export const desativarTurma = (id: string) => requisitar('DELETE', caminho(id))
