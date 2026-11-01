// Modal acessível próprio (D12, RW-39): foco preso, Esc fecha, foco volta à origem.
import { useEffect, useId, useRef, type ReactNode } from 'react'

import { Icone } from './icone'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Modais abertos, do mais antigo ao mais recente: só o de cima responde a Esc e a Tab. */
const abertos: symbol[] = []

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
  // Em ref: o pai costuma passar uma função nova a cada renderização, e refazer o efeito
  // devolveria o foco à origem e o puxaria de novo para o primeiro botão.
  const fechar = useRef(onFechar)
  useEffect(() => {
    fechar.current = onFechar
  }, [onFechar])

  useEffect(() => {
    const origem = document.activeElement as HTMLElement | null
    const focaveis = () => [...(caixa.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])]
    ;(focaveis()[0] ?? caixa.current)?.focus()

    const eu = Symbol()
    abertos.push(eu)
    const aoTeclar = (e: KeyboardEvent) => {
      // Uma confirmação aberta sobre outro modal: Esc fecha só ela.
      if (abertos.at(-1) !== eu) return
      if (e.key === 'Escape') {
        e.preventDefault()
        fechar.current()
        return
      }
      if (e.key !== 'Tab') return
      const lista = focaveis()
      if (lista.length === 0) return e.preventDefault()
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      abertos.splice(abertos.indexOf(eu), 1)
      origem?.focus()
    }
  }, [])

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
