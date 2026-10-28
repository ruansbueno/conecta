// Vínculos de uma turma (contrato §12).
import { requisitar } from '../cliente'
import { paginaSchema, vinculoSchema } from '../schemas'

export type Papel = 'docente' | 'aluno'

const caminho = (turmaId: string) => `/gestao/turmas/${encodeURIComponent(turmaId)}/vinculos`

export const listarVinculos = (turmaId: string, filtros: { papel?: Papel; limit?: number; offset?: number } = {}) =>
  requisitar('GET', caminho(turmaId), { query: { ...filtros }, esquema: paginaSchema(vinculoSchema) })

/** O papel precisa corresponder ao perfil da pessoa; a API recusa com PERFIL_INCOMPATIVEL. */
export const vincular = (turmaId: string, usuarioId: string, papel: Papel) =>
  requisitar('POST', caminho(turmaId), { corpo: { usuario_id: usuarioId, papel }, esquema: vinculoSchema })

/** A pessoa perde na hora o acesso aos avisos da turma. */
export const desvincular = (turmaId: string, usuarioId: string) =>
  requisitar('DELETE', `${caminho(turmaId)}/${encodeURIComponent(usuarioId)}`)
