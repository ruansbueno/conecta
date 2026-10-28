// Usuários e perfis (contrato §10). Listar e obter: administração e coordenação; alterar perfil e
// situação: só administração. A mudança vale na requisição seguinte da pessoa.
import { requisitar } from '../cliente'
import { paginaSchema, usuarioDetalheSchema, usuarioGestaoSchema } from '../schemas'

export type Perfil = 'administrador' | 'coordenacao' | 'docente' | 'aluno'

export interface FiltrosUsuarios {
  q?: string
  perfil?: string
  ativo?: boolean
  limit?: number
  offset?: number
}

const caminho = (id: string) => `/gestao/usuarios/${encodeURIComponent(id)}`

export const listarUsuarios = (filtros: FiltrosUsuarios = {}) =>
  requisitar('GET', '/gestao/usuarios', { query: { ...filtros }, esquema: paginaSchema(usuarioGestaoSchema) })

export const obterUsuario = (id: string) => requisitar('GET', caminho(id), { esquema: usuarioDetalheSchema })

/** PATCH parcial: só perfil, só situação, ou os dois. */
export const alterarUsuario = (id: string, mudanca: { perfil?: Perfil; ativo?: boolean }) =>
  requisitar('PATCH', caminho(id), { corpo: { ...mudanca }, esquema: usuarioGestaoSchema })
