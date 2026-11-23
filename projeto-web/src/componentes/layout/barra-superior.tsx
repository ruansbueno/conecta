import type { ReactNode } from 'react'

import { BotaoTema } from '../comum/botao-tema'
import { Icone } from '../comum/icone'

interface Props {
  titulo: string
  subtitulo?: string
  acoes?: ReactNode
  /** Abaixo de 1024 px a barra lateral some e este botão abre a gaveta (spec 003, RR-01). */
  onAbrirMenu?: () => void
  menuAberto?: boolean
}

/** Barra superior (design `.topbar`): título da seção, ações da página e, no canto direito, o botão
 * do modo noturno (spec 002, D-MN-6). 60 px no celular e 68 px a partir de 640 px (spec 003, RR-04). */
export function BarraSuperior({ titulo, subtitulo, acoes, onAbrirMenu, menuAberto = false }: Props) {
  return (
    <header className="flex h-[60px] shrink-0 items-center gap-2 border-b border-linha bg-branco px-2 sm:h-[68px] sm:gap-4 sm:px-7">
      {onAbrirMenu && (
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={menuAberto}
          aria-controls="gaveta-menu"
          onClick={onAbrirMenu}
          className="botao-icone lg:hidden"
        >
          <Icone nome="menu" tamanho={22} />
        </button>
      )}
      <div className="min-w-0">
        <p className="truncate text-base font-semibold tracking-[-0.012em] text-navy sm:text-[17px]">{titulo}</p>
        {subtitulo && <p className="mt-0.5 text-xs text-tenue">{subtitulo}</p>}
      </div>
      <span className="grow" />
      {acoes}
      <BotaoTema />
    </header>
  )
}
