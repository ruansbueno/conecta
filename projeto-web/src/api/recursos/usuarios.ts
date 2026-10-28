import { requisitar } from '../cliente'
import { paginaSchema, usuarioGestaoSchema } from '../schemas'

export interface FiltrosUsuarios {
  q?: string
  perfil?: string
  ativo?: boolean
  limit?: number
  offset?: number
}

export const listarUsuarios = (filtros: FiltrosUsuarios = {}) =>
  requisitar('GET', '/gestao/usuarios', { query: { ...filtros }, esquema: paginaSchema(usuarioGestaoSchema) })
