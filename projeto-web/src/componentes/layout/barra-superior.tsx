import type { ReactNode } from 'react'

import { BotaoTema } from '../comum/botao-tema'

/** Barra superior de 68 px (design `.topbar`): título da seção, ações da página e, no canto
 * direito, o botão do modo noturno (spec 002, D-MN-6). */
export function BarraSuperior({ titulo, subtitulo, acoes }: { titulo: string; subtitulo?: string; acoes?: ReactNode }) {
  return (
    <header className="flex h-[68px] shrink-0 items-center gap-4 border-b border-linha bg-branco px-7">
      <div>
        <p className="text-[17px] font-semibold tracking-[-0.012em] text-navy">{titulo}</p>
        {subtitulo && <p className="mt-0.5 text-xs text-tenue">{subtitulo}</p>}
      </div>
      <span className="grow" />
      {acoes}
      <BotaoTema />
    </header>
  )
}
