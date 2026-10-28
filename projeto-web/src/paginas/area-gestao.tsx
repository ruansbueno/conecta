import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { ApiError } from '../api/erros'
import { listarSolicitacoes } from '../api/recursos/solicitacoes'
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
  const { usuario, encerrar, recarregar } = useSessao()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const [falhaAoSair, setFalhaAoSair] = useState<string>()
  // Perfil alterado pela administração vale na navegação seguinte (SC-008): cada troca de página
  // relê GET /me, e a barra lateral e as guardas acompanham. A primeira página já veio do login.
  const primeira = useRef(true)
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false
      return
    }
    void recarregar()
  }, [pathname, recarregar])

  // Solicitações esperando decisão, ao lado do item na barra lateral (a API conta só as que a
  // pessoa pode decidir). Atualiza a cada página; se falhar, o contador apenas não aparece.
  const [pendentes, setPendentes] = useState(0)
  const pode = Boolean(usuario) && usuario?.perfil !== 'aluno'
  useEffect(() => {
    if (!pode) return
    let valido = true
    listarSolicitacoes({ status: 'pendente', limit: 1 })
      .then((p) => valido && setPendentes(p.total))
      .catch(() => valido && setPendentes(0))
    return () => {
      valido = false
    }
  }, [pathname, pode])
  if (!usuario) return null
  const secao = tituloDaSecao(usuario.perfil, pathname)
  return (
    <Casca
      usuario={usuario}
      secao={secao}
      contadores={{ '/solicitacoes': pendentes }}
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
