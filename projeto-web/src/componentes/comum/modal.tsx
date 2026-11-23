// Modal acessível próprio (D12, RW-39): foco preso, Esc fecha, foco volta à origem.
import { useId, useRef, type ReactNode } from 'react'

import { useFocoPreso } from './foco-preso'
import { Icone } from './icone'

interface Props {
  titulo: string
  descricao?: string
  onFechar: () => void
  children: ReactNode
  rodape?: ReactNode
  papel?: 'dialog' | 'alertdialog'
  largura?: string
}

export function Modal({ titulo, descricao, onFechar, children, rodape, papel = 'dialog', largura = 'max-w-xl' }: Props) {
  const caixa = useRef<HTMLDivElement>(null)
  const idTitulo = useId()
  const idDescricao = useId()
  useFocoPreso(caixa, onFechar)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-veu p-6">
      <div
        ref={caixa}
        role={papel}
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        tabIndex={-1}
        className={`flex max-h-full w-full ${largura} flex-col rounded-2xl bg-branco shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-linha-suave px-6 pt-6 pb-4">
          <div>
            <h2 id={idTitulo} className="text-lg font-semibold tracking-[-0.015em] text-navy">
              {titulo}
            </h2>
            {descricao && (
              <p id={idDescricao} className="mt-1 text-[13.5px] text-apagado">
                {descricao}
              </p>
            )}
          </div>
          <button type="button" aria-label="Fechar" onClick={onFechar} className="botao-icone">
            <Icone nome="x" tamanho={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {rodape && <div className="flex items-center gap-3 border-t border-linha-suave bg-fundo px-6 py-4">{rodape}</div>}
      </div>
    </div>
  )
}
