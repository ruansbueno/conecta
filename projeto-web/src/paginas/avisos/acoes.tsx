// Arquivar, desarquivar e excluir (RW-19): arquivar e excluir pedem confirmação explicando o efeito
// (RW-41); desarquivar desfaz o arquivamento e vai direto.
import { useState } from 'react'

import { ApiError } from '../../api/erros'
import { arquivarAviso, desarquivarAviso, excluirAviso } from '../../api/recursos/avisos'
import type { AvisoGestao } from '../../api/schemas'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { mensagemDe } from './comum'

export type AcaoAviso = 'arquivar' | 'desarquivar' | 'excluir'

const CONFIRMACAO = {
  arquivar: {
    titulo: 'Arquivar este aviso?',
    consequencia:
      'Ele sai dos avisos ativos do aplicativo e fica em Arquivados para quem o recebeu. Dá para desarquivar depois.',
    acao: 'Arquivar',
    destrutiva: false,
  },
  excluir: {
    titulo: 'Excluir este aviso?',
    consequencia:
      'Ele some do aplicativo e da gestão para todos, e não dá para desfazer. O histórico e as versões continuam disponíveis para a coordenação e a administração.',
    acao: 'Excluir',
    destrutiva: true,
  },
}

export const MENSAGEM_FEITA: Record<AcaoAviso, string> = {
  arquivar: 'Aviso arquivado.',
  desarquivar: 'Aviso desarquivado.',
  excluir: 'Aviso excluído.',
}

interface Retorno {
  /** Aviso atualizado (`null` depois de excluir). */
  aoConcluir: (acao: AcaoAviso, aviso: AvisoGestao | null) => void
  /** Mensagem já traduzida; `recarregar` quando a situação mudou por fora (409). */
  aoFalhar: (mensagem: string, recarregar: boolean) => void
}

export function useAcoesDoAviso({ aoConcluir, aoFalhar }: Retorno) {
  const [pedido, setPedido] = useState<{ acao: 'arquivar' | 'excluir'; aviso: AvisoGestao } | null>(null)

  async function executar(acao: AcaoAviso, aviso: AvisoGestao) {
    try {
      if (acao === 'excluir') {
        await excluirAviso(aviso.id)
        aoConcluir(acao, null)
      } else {
        aoConcluir(acao, await (acao === 'arquivar' ? arquivarAviso : desarquivarAviso)(aviso.id))
      }
    } catch (e) {
      aoFalhar(mensagemDe(e), e instanceof ApiError && (e.efeito === 'recarrega' || e.efeito === 'voltaLista'))
    }
  }

  const pedir = (acao: AcaoAviso, aviso: AvisoGestao) =>
    acao === 'desarquivar' ? void executar(acao, aviso) : setPedido({ acao, aviso })

  const dialogo = pedido && (
    <Confirmacao
      {...CONFIRMACAO[pedido.acao]}
      onCancelar={() => setPedido(null)}
      onConfirmar={() => {
        setPedido(null)
        void executar(pedido.acao, pedido.aviso)
      }}
    />
  )

  return { pedir, dialogo }
}
