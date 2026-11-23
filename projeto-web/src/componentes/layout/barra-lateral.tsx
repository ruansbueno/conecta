import type { UsuarioSessao } from '../../api/schemas'
import { NavegacaoLateral } from './navegacao-lateral'

interface Props {
  usuario: UsuarioSessao
  onSair: () => void
  /** Pendências por item (`para` → quantidade), ex.: solicitações esperando decisão. */
  contadores?: Record<string, number>
}

/** Barra lateral de 252 px (design `.side`), agrupada por assunto e filtrada pelo perfil. Abaixo de
 * 1024 px some e a mesma navegação abre na gaveta (spec 003, RR-01). */
export function BarraLateral(props: Props) {
  return (
    <aside className="hidden w-[252px] shrink-0 flex-col border-r border-linha bg-branco px-3.5 pt-[22px] pb-4 lg:flex">
      <NavegacaoLateral {...props} />
    </aside>
  )
}
