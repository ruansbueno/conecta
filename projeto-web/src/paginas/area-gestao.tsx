import { Outlet, useLocation, useNavigate } from 'react-router'

import { Casca } from '../componentes/layout/casca'
import { useSessao } from '../sessao/contexto'

const SECOES: [prefixo: string, titulo: string][] = [
  ['/avisos', 'Avisos'],
  ['/turmas', 'Turmas'],
  ['/solicitacoes', 'Solicitações'],
  ['/usuarios', 'Usuários'],
  ['/painel', 'Painel'],
]

/** Rotas autenticadas da gestão dentro da casca (a guarda ExigirSessao fica por fora). */
export default function AreaGestao() {
  const { usuario, encerrar } = useSessao()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const secao = SECOES.find(([p]) => pathname.startsWith(p))?.[1] ?? 'CONECTA'
  if (!usuario) return null
  return (
    <Casca
      usuario={usuario}
      secao={secao}
      onSair={async () => {
        await encerrar('saida')
        navegar('/login', { replace: true })
      }}
    >
      <Outlet />
    </Casca>
  )
}
