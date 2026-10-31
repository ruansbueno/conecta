// Grade de horários das turmas na gestão (contracts E3 §10–13): só administração e coordenação.
import { requisitar } from '../cliente'
import { aulaComConflitosSchema, aulaSchema, paginaSchema } from '../schemas'

export interface DadosAula {
  diaSemana: number
  /** "HH:MM" */
  inicio: string
  fim: string
  disciplina: string
  /** Texto vazio: sem local. */
  local: string
  /** Texto vazio: sem docente. */
  docenteId: string
}

const caminho = (turmaId: string, aulaId?: string) =>
  `/gestao/turmas/${encodeURIComponent(turmaId)}/horarios${aulaId ? `/${encodeURIComponent(aulaId)}` : ''}`

/** A grade inteira numa chamada: uma turma tem poucas aulas por semana. */
export const gradeDaTurma = (turmaId: string) =>
  requisitar('GET', caminho(turmaId), { query: { limit: 100 }, esquema: paginaSchema(aulaSchema) })

export function criarAula(turmaId: string, a: DadosAula) {
  return requisitar('POST', caminho(turmaId), {
    corpo: {
      dia_semana: a.diaSemana,
      inicio: a.inicio,
      fim: a.fim,
      disciplina: a.disciplina,
      ...(a.local.trim() ? { local: a.local.trim() } : {}),
      ...(a.docenteId ? { docente_id: a.docenteId } : {}),
    },
    esquema: aulaComConflitosSchema,
  })
}

/** PATCH parcial; local e docente vazios viram `null` (tirar). */
export function editarAula(turmaId: string, aulaId: string, a: Partial<DadosAula>) {
  const corpo: Record<string, unknown> = {}
  if (a.diaSemana !== undefined) corpo.dia_semana = a.diaSemana
  if (a.inicio !== undefined) corpo.inicio = a.inicio
  if (a.fim !== undefined) corpo.fim = a.fim
  if (a.disciplina !== undefined) corpo.disciplina = a.disciplina
  if (a.local !== undefined) corpo.local = a.local.trim() || null
  if (a.docenteId !== undefined) corpo.docente_id = a.docenteId || null
  return requisitar('PATCH', caminho(turmaId, aulaId), { corpo, esquema: aulaComConflitosSchema })
}

export const removerAula = (turmaId: string, aulaId: string) =>
  requisitar('DELETE', caminho(turmaId, aulaId))
