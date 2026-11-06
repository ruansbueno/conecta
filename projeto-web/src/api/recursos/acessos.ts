// Pedidos de acesso de servidores (contrato §10a; emenda v2.3). Listar e recusar pendentes:
// administração e coordenação. Aprovar: a administração com qualquer perfil (também recusados); a
// coordenação só pendentes, com docente ou coordenação — quem recusa o resto é a API.
import { requisitar } from '../cliente'
import { acessoSchema, paginaSchema } from '../schemas'
import type { Perfil } from './usuarios'

export type SituacaoPedido = 'pendente' | 'recusado'

const caminho = (id: string, acao: 'aprovar' | 'recusar') => `/gestao/acessos/${encodeURIComponent(id)}/${acao}`

export const listarAcessos = (filtros: { situacao?: SituacaoPedido; limit?: number; offset?: number } = {}) =>
  requisitar('GET', '/gestao/acessos', { query: { ...filtros }, esquema: paginaSchema(acessoSchema) })

export const aprovarAcesso = (id: string, perfil: Perfil) =>
  requisitar('POST', caminho(id, 'aprovar'), { corpo: { perfil }, esquema: acessoSchema })

export const recusarAcesso = (id: string) => requisitar('POST', caminho(id, 'recusar'), { esquema: acessoSchema })
