// Eventos da agenda na gestão (contracts E3 §4–9). Só este módulo conhece os caminhos de evento.
import { requisitar } from '../cliente'
import {
  eventoAgendaSchema,
  eventoSchema,
  paginaSchema,
  versaoEventoSchema,
  type DestinoEscolhido,
} from '../schemas'

export interface NovoEvento {
  titulo: string
  tipo: string
  inicio: Date
  /** `null`: evento pontual. */
  fim: Date | null
  /** Texto vazio: sem local. */
  local: string
  /** Texto vazio: sem descrição. */
  descricao: string
  destinos: DestinoEscolhido[]
}

export type EdicaoEvento = Partial<NovoEvento>

export interface FiltrosEventos {
  situacao?: string
  quando?: 'proximos' | 'realizados'
  tipo?: string
  q?: string
  de?: Date
  ate?: Date
  limit?: number
  offset?: number
}

const paraContrato = (d: DestinoEscolhido) => ({
  tipo: d.tipo,
  ...(d.turmaId ? { turma_id: d.turmaId } : {}),
  ...(d.semestre !== undefined ? { semestre: d.semestre } : {}),
})

const caminho = (id: string, resto = '') => `/gestao/eventos/${encodeURIComponent(id)}${resto}`

export function listarEventos({ de, ate, ...filtros }: FiltrosEventos = {}) {
  const query: Record<string, unknown> = { ...filtros }
  if (de) query.de = de.toISOString()
  if (ate) query.ate = ate.toISOString()
  return requisitar('GET', '/gestao/eventos', { query, esquema: paginaSchema(eventoAgendaSchema) })
}

export const obterEvento = (id: string) => requisitar('GET', caminho(id), { esquema: eventoAgendaSchema })

export function criarEvento(e: NovoEvento) {
  return requisitar('POST', '/gestao/eventos', {
    corpo: {
      titulo: e.titulo,
      tipo: e.tipo,
      inicio: e.inicio.toISOString(),
      ...(e.fim ? { fim: e.fim.toISOString() } : {}),
      ...(e.local.trim() ? { local: e.local.trim() } : {}),
      ...(e.descricao.trim() ? { descricao: e.descricao.trim() } : {}),
      destinos: e.destinos.map(paraContrato),
    },
    esquema: eventoAgendaSchema,
  })
}

/** PATCH parcial: só os campos dados. Fim, local e descrição vazios viram `null` (limpar). */
export function editarEvento(id: string, edicao: EdicaoEvento) {
  const corpo: Record<string, unknown> = {}
  if (edicao.titulo !== undefined) corpo.titulo = edicao.titulo
  if (edicao.tipo !== undefined) corpo.tipo = edicao.tipo
  if (edicao.inicio !== undefined) corpo.inicio = edicao.inicio.toISOString()
  if (edicao.fim !== undefined) corpo.fim = edicao.fim?.toISOString() ?? null
  if (edicao.local !== undefined) corpo.local = edicao.local.trim() || null
  if (edicao.descricao !== undefined) corpo.descricao = edicao.descricao.trim() || null
  if (edicao.destinos !== undefined) corpo.destinos = edicao.destinos.map(paraContrato)
  return requisitar('PATCH', caminho(id), { corpo, esquema: eventoAgendaSchema })
}

const acao = (id: string, nome: 'arquivar' | 'desarquivar') =>
  requisitar('POST', caminho(id, `/${nome}`), { esquema: eventoAgendaSchema })

export const arquivarEvento = (id: string) => acao(id, 'arquivar')
export const desarquivarEvento = (id: string) => acao(id, 'desarquivar')
export const excluirEvento = (id: string) => requisitar('DELETE', caminho(id))

export const versoesDoEvento = (id: string, pagina: { limit?: number; offset?: number } = {}) =>
  requisitar('GET', caminho(id, '/versoes'), { query: pagina, esquema: paginaSchema(versaoEventoSchema) })

export const historicoDoEvento = (id: string, pagina: { limit?: number; offset?: number } = {}) =>
  requisitar('GET', caminho(id, '/historico'), { query: pagina, esquema: paginaSchema(eventoSchema) })
