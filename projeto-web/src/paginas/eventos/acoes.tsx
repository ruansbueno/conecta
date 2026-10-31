// Arquivar, desarquivar e excluir evento (RW-34): mesma política dos avisos — arquivar e excluir
// pedem confirmação explicando o efeito (RW-41); desarquivar vai direto.
import { useRef, useState } from 'react'

import { ApiError } from '../../api/erros'
import { arquivarEvento, desarquivarEvento, excluirEvento } from '../../api/recursos/eventos'
import type { EventoAgenda } from '../../api/schemas'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { mensagemDe } from '../comum'

export type AcaoEvento = 'arquivar' | 'desarquivar' | 'excluir'

const CONFIRMACAO = {
  arquivar: {
    titulo: 'Arquivar este evento?',
    consequencia: 'Ele sai da agenda do aplicativo e fica em Arquivados. Dá para desarquivar depois.',
    acao: 'Arquivar',
    destrutiva: false,
  },
  excluir: {
    titulo: 'Excluir este evento?',
    consequencia:
      'Ele some do aplicativo e da gestão para todos, e não dá para desfazer. O histórico e as versões continuam disponíveis para a coordenação e a administração.',
    acao: 'Excluir',
    destrutiva: true,
  },
}

export const MENSAGEM_FEITA: Record<AcaoEvento, string> = {
  arquivar: 'Evento arquivado.',
  desarquivar: 'Evento desarquivado.',
  excluir: 'Evento excluído.',
}

interface Retorno {
  /** Evento atualizado (`null` depois de excluir). */
  aoConcluir: (acao: AcaoEvento, evento: EventoAgenda | null) => void
  /** Mensagem já traduzida; `recarregar` quando a situação mudou por fora (409, 404). */
  aoFalhar: (mensagem: string, recarregar: boolean) => void
}

export function useAcoesDoEvento({ aoConcluir, aoFalhar }: Retorno) {
  const [pedido, setPedido] = useState<{ acao: 'arquivar' | 'excluir'; evento: EventoAgenda } | null>(null)
  // Uma ação por vez: clique duplo não manda a segunda (que voltaria 409 e mostraria erro falso).
  const emCurso = useRef(false)
  const [ocupado, setOcupado] = useState(false)

  async function executar(acao: AcaoEvento, evento: EventoAgenda) {
    if (emCurso.current) return
    emCurso.current = true
    setOcupado(true)
    try {
      if (acao === 'excluir') {
        await excluirEvento(evento.id)
        aoConcluir(acao, null)
      } else {
        aoConcluir(acao, await (acao === 'arquivar' ? arquivarEvento : desarquivarEvento)(evento.id))
      }
    } catch (e) {
      aoFalhar(mensagemDe(e), e instanceof ApiError && (e.efeito === 'recarrega' || e.efeito === 'voltaLista'))
    } finally {
      emCurso.current = false
      setOcupado(false)
    }
  }

  const pedir = (acao: AcaoEvento, evento: EventoAgenda) =>
    acao === 'desarquivar' ? void executar(acao, evento) : setPedido({ acao, evento })

  const dialogo = pedido && (
    <Confirmacao
      {...CONFIRMACAO[pedido.acao]}
      onCancelar={() => setPedido(null)}
      onConfirmar={() => {
        setPedido(null)
        void executar(pedido.acao, pedido.evento)
      }}
    />
  )

  return { pedir, dialogo, ocupado }
}
