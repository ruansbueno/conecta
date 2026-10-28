import { requisitar } from '../cliente'
import { paginaSchema, turmaSchema } from '../schemas'

export interface FiltrosTurmas {
  ativa?: boolean
  semestre_curso?: number
  periodo_letivo?: string
  q?: string
  limit?: number
  offset?: number
}

/** Docente recebe só as turmas em que leciona: quem filtra é a API (plan-e2 D-E2-1). */
export const listarTurmas = (filtros: FiltrosTurmas = {}) =>
  requisitar('GET', '/gestao/turmas', { query: { ...filtros }, esquema: paginaSchema(turmaSchema) })
