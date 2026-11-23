import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'

import type { UsuarioSessao } from '../../api/schemas'
import { Avatar } from '../comum/avatar'
import { ContadorPendentes } from '../comum/contador-pendentes'
import { Icone, Marca } from '../comum/icone'
import { itemAtivo, navegacaoDoPerfil, ROTULO_PERFIL } from './navegacao'

interface Props {
  usuario: UsuarioSessao
  onSair: () => void
  /** Pendências por item (`para` → quantidade), ex.: solicitações esperando decisão. */
  contadores?: Record<string, number>
}

/** Miolo da navegação (marca, grupos do perfil, pessoa e Sair): o mesmo na barra lateral e na gaveta. */
export function NavegacaoLateral({ usuario, onSair, contadores = {}, acaoDaMarca }: Props & { acaoDaMarca?: ReactNode }) {
  // Link com aria-current próprio: o NavLink marcaria Turmas também na grade de uma turma.
  const { pathname } = useLocation()
  return (
    <>
      <div className="flex items-center gap-[9px] px-3 pt-1 pb-0.5 text-navy">
        <Marca />
        <span className="flex-1 text-[17px] font-extrabold tracking-[0.055em]">CONECTA</span>
        {acaoDaMarca}
      </div>
      <nav aria-label="Navegação principal" className="flex-1">
        {navegacaoDoPerfil(usuario.perfil).map((grupo) => (
          <div key={grupo.titulo} className="mt-[22px]">
            <p className="px-3 pb-2 text-[11.5px] font-semibold text-tenue">{grupo.titulo}</p>
            <ul>
              {grupo.itens.map((item) => (
                <li key={item.para}>
                  <Link
                    to={item.para}
                    aria-current={itemAtivo(item.para, pathname) ? 'page' : undefined}
                    className={
                      `flex h-10 items-center gap-[11px] rounded-[9px] px-3 text-[13.5px] ${
                        itemAtivo(item.para, pathname)
                          ? 'bg-azul-superficie font-semibold text-azul-escuro'
                          : 'font-medium text-navy-suave hover:bg-fundo'
                      }`}
                  >
                    <Icone nome={item.icone} tamanho={19} />
                    <span className="flex-1">{item.rotulo}</span>
                    <ContadorPendentes quantidade={contadores[item.para] ?? 0} />
                  </Link>
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
    </>
  )
}
