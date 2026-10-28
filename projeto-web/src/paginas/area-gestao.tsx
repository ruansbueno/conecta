import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { ApiError } from '../api/erros'
import { Casca } from '../componentes/layout/casca'
import { navegacaoDoPerfil } from '../componentes/layout/navegacao'
import { useSessao } from '../sessao/contexto'

/** Título da seção: o mesmo rótulo da navegação do perfil ("Meus avisos" para docente). */
const tituloDaSecao = (perfil: string, caminho: string) =>
  navegacaoDoPerfil(perfil)
    .flatMap((g) => g.itens)
    .find((item) => caminho.startsWith(item.para))?.rotulo ?? 'CONECTA'

/** Rotas autenticadas da gestão dentro da casca (a guarda ExigirSessao fica por fora). */
export default function AreaGestao() {
  const { usuario, encerrar } = useSessao()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const [falhaAoSair, setFalhaAoSair] = useState<string>()
  if (!usuario) return null
  const secao = tituloDaSecao(usuario.perfil, pathname)
  return (
    <Casca
      usuario={usuario}
      secao={secao}
      onSair={async () => {
        setFalhaAoSair(undefined)
        try {
          await encerrar('saida')
          navegar('/login', { replace: true })
        } catch (e) {
          // A API não confirmou a saída: o cookie segue válido, então a sessão também (RW-09).
          setFalhaAoSair(
            e instanceof ApiError && e.code === 'CSRF_INVALIDO' ? e.mensagem : 'Não foi possível sair. Tente de novo.',
          )
        }
      }}
    >
      {falhaAoSair && (
        <p role="alert" className="mb-5 rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
          {falhaAoSair}
        </p>
      )}
      <Outlet />
    </Casca>
  )
}
