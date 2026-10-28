// Avisos de gestão (contrato §14 e §15). Só este módulo conhece os caminhos de aviso.
import { requisitar } from '../cliente'
import {
  avisoGestaoSchema,
  eventoSchema,
  paginaSchema,
  versaoSchema,
  type DestinoEscolhido,
} from '../schemas'

export type { DestinoEscolhido }

export interface NovoAviso {
  titulo: string
  conteudo: string
  /** `null`: publica na hora. */
  publicarEm: Date | null
  destinos: DestinoEscolhido[]
}

export type EdicaoAviso = Partial<NovoAviso>

const paraContrato = (d: DestinoEscolhido) => ({
  tipo: d.tipo,
  ...(d.turmaId ? { turma_id: d.turmaId } : {}),
  ...(d.semestre !== undefined ? { semestre: d.semestre } : {}),
})

export interface FiltrosAvisos {
  situacao?: string
  autor_id?: string
  turma_id?: string
  q?: string
  limit?: number
  offset?: number
}

export const listarAvisos = (filtros: FiltrosAvisos = {}) =>
  requisitar('GET', '/gestao/avisos', { query: { ...filtros }, esquema: paginaSchema(avisoGestaoSchema) })

export const obterAviso = (id: string) =>
  requisitar('GET', `/gestao/avisos/${encodeURIComponent(id)}`, { esquema: avisoGestaoSchema })

export function criarAviso({ titulo, conteudo, publicarEm, destinos }: NovoAviso) {
  return requisitar('POST', '/gestao/avisos', {
    corpo: {
      titulo,
      conteudo,
      ...(publicarEm ? { publicar_em: publicarEm.toISOString() } : {}),
      destinos: destinos.map(paraContrato),
    },
    esquema: avisoGestaoSchema,
  })
}

/** PATCH parcial: só os campos dados; `destinos`, se dado, substitui a lista inteira (RW-18). */
export function editarAviso(id: string, edicao: EdicaoAviso) {
  const corpo: Record<string, unknown> = {}
  if (edicao.titulo !== undefined) corpo.titulo = edicao.titulo
  if (edicao.conteudo !== undefined) corpo.conteudo = edicao.conteudo
  if (edicao.publicarEm !== undefined) corpo.publicar_em = edicao.publicarEm?.toISOString() ?? null
  if (edicao.destinos !== undefined) corpo.destinos = edicao.destinos.map(paraContrato)
  return requisitar('PATCH', `/gestao/avisos/${encodeURIComponent(id)}`, { corpo, esquema: avisoGestaoSchema })
}

const acao = (id: string, nome: 'arquivar' | 'desarquivar') =>
  requisitar('POST', `/gestao/avisos/${encodeURIComponent(id)}/${nome}`, { esquema: avisoGestaoSchema })

export const arquivarAviso = (id: string) => acao(id, 'arquivar')
export const desarquivarAviso = (id: string) => acao(id, 'desarquivar')
export const excluirAviso = (id: string) => requisitar('DELETE', `/gestao/avisos/${encodeURIComponent(id)}`)

export const versoesDoAviso = (id: string, pagina: { limit?: number; offset?: number } = {}) =>
  requisitar('GET', `/gestao/avisos/${encodeURIComponent(id)}/versoes`, {
    query: pagina,
    esquema: paginaSchema(versaoSchema),
  })

export const historicoDoAviso = (id: string, pagina: { limit?: number; offset?: number } = {}) =>
  requisitar('GET', `/gestao/avisos/${encodeURIComponent(id)}/historico`, {
    query: pagina,
    esquema: paginaSchema(eventoSchema),
  })
