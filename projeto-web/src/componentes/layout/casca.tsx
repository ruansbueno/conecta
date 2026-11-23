import { useEffect, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'

import type { UsuarioSessao } from '../../api/schemas'
import { BarraLateral } from './barra-lateral'
import { BarraSuperior } from './barra-superior'
import { GavetaMenu } from './gaveta-menu'
import { ROTULO_PERFIL } from './navegacao'

interface Props {
  usuario: UsuarioSessao
  secao: string
  onSair: () => void
  contadores?: Record<string, number>
  children: ReactNode
}

/** Onde a barra lateral aparece e a gaveta deixa de existir (spec 003, RR-01). */
const DESKTOP = '(min-width: 1024px)'

/** Casca da gestão: barra lateral (ou gaveta, abaixo de 1024 px) + barra superior + conteúdo. */
export function Casca({ usuario, secao, onSair, contadores, children }: Props) {
  const [menuAberto, setMenuAberto] = useState(false)
  const { pathname } = useLocation()

  // Qualquer troca de rota (voltar do navegador, link no conteúdo) fecha a gaveta: estado ajustado
  // durante a renderização, como recomenda o React, em vez de um efeito.
  const [rota, setRota] = useState(pathname)
  if (rota !== pathname) {
    setRota(pathname)
    setMenuAberto(false)
  }

  // Ao alargar a janela até o desktop (girar o tablet), a gaveta não fica presa sobre a barra lateral.
  useEffect(() => {
    const consulta = window.matchMedia?.(DESKTOP)
    if (!consulta) return
    const aoMudar = () => consulta.matches && setMenuAberto(false)
    consulta.addEventListener('change', aoMudar)
    return () => consulta.removeEventListener('change', aoMudar)
  }, [])

  return (
    <div className="flex h-screen bg-fundo">
      <BarraLateral usuario={usuario} onSair={onSair} contadores={contadores} />
      {menuAberto && <GavetaMenu usuario={usuario} onSair={onSair} contadores={contadores} onFechar={() => setMenuAberto(false)} />}
      <div className="flex min-w-0 flex-1 flex-col">
        <BarraSuperior
          titulo={secao}
          subtitulo={ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil}
          onAbrirMenu={() => setMenuAberto(true)}
          menuAberto={menuAberto}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-[26px]">{children}</main>
      </div>
    </div>
  )
}
