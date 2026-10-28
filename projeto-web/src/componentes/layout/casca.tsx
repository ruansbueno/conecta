import type { ReactNode } from 'react'

import type { UsuarioSessao } from '../../api/schemas'
import { BarraLateral } from './barra-lateral'
import { BarraSuperior } from './barra-superior'
import { ROTULO_PERFIL } from './navegacao'

interface Props {
  usuario: UsuarioSessao
  secao: string
  onSair: () => void
  contadores?: Record<string, number>
  children: ReactNode
}

/** Casca da gestão: barra lateral + barra superior + conteúdo com 28 px de margem. */
export function Casca({ usuario, secao, onSair, contadores, children }: Props) {
  return (
    <div className="flex h-screen bg-fundo">
      <BarraLateral usuario={usuario} onSair={onSair} contadores={contadores} />
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior titulo={secao} subtitulo={ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil} />
        <main className="min-h-0 flex-1 overflow-y-auto px-7 py-[26px]">{children}</main>
      </div>
    </div>
  )
}
