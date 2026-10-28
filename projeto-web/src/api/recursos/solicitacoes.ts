// Solicitações de inscrição na gestão (contrato §13). O docente recebe só as das turmas em que
// leciona e só decide essas: quem filtra e recusa é a API.
import { requisitar } from '../cliente'
import { paginaSchema, solicitacaoGestaoSchema } from '../schemas'

export type StatusSolicitacao = 'pendente' | 'aprovada' | 'recusada' | 'cancelada'

export interface FiltrosSolicitacoes {
  status?: StatusSolicitacao
  turma_id?: string
  limit?: number
  offset?: number
}

const caminho = (id: string, acao: 'aprovar' | 'recusar') => `/gestao/solicitacoes/${encodeURIComponent(id)}/${acao}`

export const listarSolicitacoes = (filtros: FiltrosSolicitacoes = {}) =>
  requisitar('GET', '/gestao/solicitacoes', { query: { ...filtros }, esquema: paginaSchema(solicitacaoGestaoSchema) })

/** Aprovar cria o vínculo do aluno com a turma na mesma transação. */
export const aprovarSolicitacao = (id: string) => requisitar('POST', caminho(id, 'aprovar'), { esquema: solicitacaoGestaoSchema })

/** Motivo opcional, até 300 caracteres; o aluno o vê no aplicativo. */
export function recusarSolicitacao(id: string, motivo?: string) {
  const texto = motivo?.trim()
  return requisitar('POST', caminho(id, 'recusar'), {
    ...(texto ? { corpo: { motivo: texto } } : {}),
    esquema: solicitacaoGestaoSchema,
  })
}
