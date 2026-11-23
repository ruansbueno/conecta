// Abas no padrão ARIA (RW-39): só a ativa no Tab; setas, Home e End trocam e levam o foco.
import type { KeyboardEvent } from 'react'

import { ContadorPendentes } from './contador-pendentes'

export interface Aba<T extends string> {
  id: T
  rotulo: string
  /** Pendências da aba (ex.: pedidos de acesso esperando), com a bolinha da barra lateral. */
  contador?: number
}

interface Props<T extends string> {
  rotulo: string
  /** Prefixo dos ids: a aba `x` tem id `${idBase}-x`, e o painel usa `${idBase}-painel`. */
  idBase: string
  abas: Aba<T>[]
  atual: T
  onMudar: (aba: T) => void
  /** Classes do contêiner e do texto das abas, para lugares mais compactos (ex.: dentro de um modal). */
  classe?: string
  classeAba?: string
}

export const idDaAba = (idBase: string, aba: string) => `${idBase}-${aba}`
export const idDoPainel = (idBase: string) => `${idBase}-painel`

export function Abas<T extends string>({
  rotulo,
  idBase,
  abas,
  atual,
  onMudar,
  classe = 'abas-rolaveis flex gap-7 border-b border-linha',
  classeAba = 'pb-3 text-[14.5px]',
}: Props<T>) {
  const teclar = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = abas.findIndex((a) => a.id === atual)
    const destino = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: abas.length - 1 }[e.key]
    if (destino === undefined) return
    e.preventDefault()
    const proxima = abas[(destino + abas.length) % abas.length].id
    onMudar(proxima)
    document.getElementById(idDaAba(idBase, proxima))?.focus()
  }

  return (
    <div role="tablist" aria-label={rotulo} onKeyDown={teclar} className={classe}>
      {abas.map((a) => (
        <button
          key={a.id}
          id={idDaAba(idBase, a.id)}
          type="button"
          role="tab"
          aria-selected={a.id === atual}
          aria-controls={idDoPainel(idBase)}
          tabIndex={a.id === atual ? 0 : -1}
          onClick={() => onMudar(a.id)}
          className={`${classeAba} shrink-0 whitespace-nowrap ${
            a.id === atual ? 'font-semibold text-navy shadow-[inset_0_-2px_0_var(--color-azul)]' : 'font-medium text-apagado'
          }`}
        >
          {a.rotulo}
          <ContadorPendentes quantidade={a.contador ?? 0} />
        </button>
      ))}
    </div>
  )
}
