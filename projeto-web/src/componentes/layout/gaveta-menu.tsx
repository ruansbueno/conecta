// Gaveta de navegação abaixo de 1024 px (spec 003, RR-02 e RR-03): a mesma navegação da barra
// lateral, sobre o conteúdo, com foco preso; Esc, "Fechar menu" e o véu fecham.
import { useRef, type RefObject } from 'react'

import type { UsuarioSessao } from '../../api/schemas'
import { useFocoPreso } from '../comum/foco-preso'
import { Icone } from '../comum/icone'
import { NavegacaoLateral } from './navegacao-lateral'

interface Props {
  usuario: UsuarioSessao
  onSair: () => void
  contadores?: Record<string, number>
  onFechar: () => void
  /** O botão "Abrir menu": recebe o foco de volta ao fechar (RR-03). */
  retorno?: RefObject<HTMLElement | null>
}

export function GavetaMenu({ usuario, onSair, contadores, onFechar, retorno }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  useFocoPreso(caixa, onFechar, retorno)
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div data-testid="veu-menu" aria-hidden="true" onClick={onFechar} className="absolute inset-0 bg-veu" />
      <div
        ref={caixa}
        id="gaveta-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        // Escolher um item fecha a gaveta, inclusive o da página atual (aí a rota não muda).
        onClick={(e) => (e.target as HTMLElement).closest('a') && onFechar()}
        className="absolute inset-y-0 left-0 flex w-[300px] max-w-[calc(100%-48px)] flex-col overflow-y-auto border-r border-linha bg-branco px-3.5 pt-4 pb-4 shadow-2xl"
      >
        <NavegacaoLateral
          usuario={usuario}
          onSair={onSair}
          contadores={contadores}
          acaoDaMarca={
            <button type="button" aria-label="Fechar menu" onClick={onFechar} className="botao-icone">
              <Icone nome="x" tamanho={20} />
            </button>
          }
        />
      </div>
    </div>
  )
}
