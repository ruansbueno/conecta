import { NavLink } from 'react-router'

import type { UsuarioSessao } from '../../api/schemas'
import { Avatar } from '../comum/avatar'
import { Icone, Marca } from '../comum/icone'
import { navegacaoDoPerfil, ROTULO_PERFIL } from './navegacao'

interface Props {
  usuario: UsuarioSessao
  onSair: () => void
  /** Pendências por item (`para` → quantidade), ex.: solicitações esperando decisão. */
  contadores?: Record<string, number>
}

/** Barra lateral de 252 px (design `.side`), agrupada por assunto e filtrada pelo perfil. */
export function BarraLateral({ usuario, onSair, contadores = {} }: Props) {
  return (
    <aside className="flex w-[252px] shrink-0 flex-col border-r border-linha bg-branco px-3.5 pt-[22px] pb-4">
      <div className="flex items-center gap-[9px] px-3 pt-1 pb-0.5 text-navy">
        <Marca />
        <span className="text-[17px] font-extrabold tracking-[0.055em]">CONECTA</span>
      </div>
      <nav aria-label="Navegação principal" className="flex-1">
        {navegacaoDoPerfil(usuario.perfil).map((grupo) => (
          <div key={grupo.titulo} className="mt-[22px]">
            <p className="px-3 pb-2 text-[11.5px] font-semibold text-tenue">{grupo.titulo}</p>
            <ul>
              {grupo.itens.map((item) => (
                <li key={item.para}>
                  <NavLink
                    to={item.para}
                    aria-label={(contadores[item.para] ?? 0) > 0 ? `${item.rotulo}, ${contadores[item.para]} pendentes` : undefined}
                    className={({ isActive }) =>
                      `flex h-10 items-center gap-[11px] rounded-[9px] px-3 text-[13.5px] ${
                        isActive
                          ? 'bg-azul-superficie font-semibold text-azul-escuro'
                          : 'font-medium text-navy-suave hover:bg-fundo'
                      }`
                    }
                  >
                    <Icone nome={item.icone} tamanho={19} />
                    <span className="flex-1">{item.rotulo}</span>
                    {(contadores[item.para] ?? 0) > 0 && (
                      <span
                        aria-hidden="true"
                        className="flex size-[22px] items-center justify-center rounded-full bg-alerta-fundo text-[11.5px] font-semibold text-alerta"
                      >
                        {contadores[item.para]}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="mx-3 border-t border-linha-suave" />
      <div className="flex items-center gap-2.5 px-3 pt-3.5 pb-0.5">
        <Avatar nome={usuario.nome} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-navy">{usuario.nome}</p>
          <p className="text-xs text-tenue">{ROTULO_PERFIL[usuario.perfil] ?? usuario.perfil}</p>
        </div>
        <button type="button" aria-label="Sair" onClick={onSair} className="botao-icone text-tenue">
          <Icone nome="sair" tamanho={18} />
        </button>
      </div>
    </aside>
  )
}
