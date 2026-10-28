// Encerramento único da sessão (RW-04, RW-05, RW-06, RW-09): avisa a API, limpa o estado local
// e entrega o motivo para a tela de login. Várias falhas juntas encerram uma vez só.
import { ApiError } from '../api/erros'
import { apagarTodosRascunhos } from '../lib/rascunho'

export type MotivoEncerramento = 'saida' | 'expirada' | 'inativo' | 'aluno'

export interface Encerramento {
  motivo: MotivoEncerramento
  mensagem?: string
}

const MENSAGENS: Partial<Record<MotivoEncerramento, string>> = {
  expirada: 'Sua sessão expirou. Entre de novo.',
  inativo: 'Este acesso está desativado. Procure a administração.',
}

interface Dependencias {
  encerrarNaApi: () => Promise<unknown>
  aoEncerrar: (encerramento: Encerramento) => void
}

export function criarEncerrador({ encerrarNaApi, aoEncerrar }: Dependencias) {
  let emAndamento: Promise<void> | null = null

  return function encerrar(motivo: MotivoEncerramento): Promise<void> {
    if (emAndamento) return emAndamento
    emAndamento = (async () => {
      try {
        await encerrarNaApi()
      } catch (e) {
        // Sessão já inválida na API: nada a apagar lá. Numa saída pedida, qualquer outra falha
        // deixaria o cookie vivo (computador compartilhado, RW-09): a sessão continua e quem
        // chamou mostra o erro. Na expiração, segue o encerramento local.
        const jaInvalida = e instanceof ApiError && (e.code === 'NAO_AUTENTICADO' || e.code === 'USUARIO_INATIVO')
        if (motivo === 'saida' && !jaInvalida) throw e
      }
      // Sessão expirada preserva o rascunho: quem reentra recupera o texto (edge case da spec).
      if (motivo !== 'expirada') apagarTodosRascunhos()
      aoEncerrar({ motivo, mensagem: MENSAGENS[motivo] })
    })().finally(() => {
      emAndamento = null
    })
    return emAndamento
  }
}
