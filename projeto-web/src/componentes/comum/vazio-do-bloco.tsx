import type { ReactNode } from 'react'

import { Icone } from './icone'
import type { NomeIcone } from './icones-svg'

/** Versão compacta do `EstadoVazio` para os blocos do painel (spec 002, D-MN-7). */
export function VazioDoBloco({
  icone,
  texto,
  acao,
}: {
  icone: NomeIcone
  texto: string
  acao?: ReactNode
}) {
  return (
    <div data-vazio className="flex flex-col items-center px-6 py-8 text-center">
      <span className="flex size-11 items-center justify-center rounded-xl border border-linha bg-fundo text-tenue">
        <Icone nome={icone} tamanho={20} />
      </span>
      <p className="mt-3 text-[13px] text-apagado">{texto}</p>
      {acao}
    </div>
  )
}
