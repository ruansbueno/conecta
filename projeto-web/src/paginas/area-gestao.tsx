import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

import { listarAcessos } from '../api/recursos/acessos'
import { listarSolicitacoes } from '../api/recursos/solicitacoes'
import { Casca } from '../componentes/layout/casca'
import { itemAtivo, navegacaoDoPerfil } from '../componentes/layout/navegacao'
import { useSessao } from '../sessao/contexto'

/** O que a área de gestão oferece às páginas dentro dela (via `useOutletContext`). */
export interface ContextoGestao {
  atualizarPendentes: () => void
  /** Pedidos de acesso esperando a gestão (o mesmo número de Usuários na barra lateral). */
  acessosPendentes: number
}

/** Título da seção: o mesmo rótulo da navegação do perfil ("Meus avisos" para docente). */
const tituloDaSecao = (perfil: string, caminho: string) =>
  navegacaoDoPerfil(perfil)
    .flatMap((g) => g.itens)
    // Mesma regra da barra lateral: a grade de uma turma é de Horários.
    .find((item) => itemAtivo(item.para, caminho))?.rotulo ?? 'CONECTA'

/** Rotas autenticadas da gestão dentro da casca (a guarda ExigirSessao fica por fora). */
export default function AreaGestao() {
  const { usuario, encerrar, recarregar } = useSessao()
  const { pathname } = useLocation()
  const navegar = useNavigate()
  const [falhaAoSair, setFalhaAoSair] = useState<string>()
  // Perfil alterado pela administração vale na navegação seguinte (SC-008): cada troca de página
  // relê GET /me, e a barra lateral e as guardas acompanham. A primeira página já veio do login.
  const ultimoCaminho = useRef(pathname)
  useEffect(() => {
    // Compara com o último caminho (e não "primeira vez"): no modo estrito do React o efeito roda
    // duas vezes ao montar, e isso não pode virar uma releitura extra.
    if (ultimoCaminho.current === pathname) return
    ultimoCaminho.current = pathname
    void recarregar()
  }, [pathname, recarregar])

  // Solicitações esperando decisão, ao lado do item na barra lateral (a API conta só as que a
  // pessoa pode decidir). Atualiza a cada página; se falhar, o contador apenas não aparece.
  const [pendentes, setPendentes] = useState(0)
  // Páginas que mudam a fila (decidir uma solicitação) pedem nova contagem sem trocar de página.
  const [versaoPendentes, setVersaoPendentes] = useState(0)
  const pode = Boolean(usuario) && usuario?.perfil !== 'aluno'
  useEffect(() => {
    if (!pode) return
    let valido = true
    listarSolicitacoes({ status: 'pendente', limit: 1 })
      .then((p) => valido && setPendentes(p.total))
      // Falha momentânea: fica o último número conhecido, em vez de sumir.
      .catch(() => undefined)
    return () => {
      valido = false
    }
  }, [pathname, pode, versaoPendentes])
  // Pedidos de acesso de servidores esperando a gestão, ao lado de Usuários (emenda v2.3).
  const [acessos, setAcessos] = useState(0)
  const decideAcessos = usuario?.perfil === 'administrador' || usuario?.perfil === 'coordenacao'
  useEffect(() => {
    if (!decideAcessos) return
    let valido = true
    listarAcessos({ situacao: 'pendente', limit: 1 })
      .then((p) => valido && setAcessos(p.total))
      .catch(() => undefined)
    return () => {
      valido = false
    }
  }, [pathname, decideAcessos, versaoPendentes])
  if (!usuario) return null
  const secao = tituloDaSecao(usuario.perfil, pathname)
  return (
    <Casca
      usuario={usuario}
      secao={secao}
      contadores={{ '/solicitacoes': pode ? pendentes : 0, '/usuarios': decideAcessos ? acessos : 0 }}
      onSair={async () => {
        setFalhaAoSair(undefined)
        try {
          await encerrar('saida')
          navegar('/login', { replace: true })
        } catch {
          // A API não confirmou a saída (rede, 5xx): o cookie segue válido, então a sessão também
          // (RW-09). CSRF_INVALIDO não chega aqui: a API expira os cookies junto com o 403.
          setFalhaAoSair('Não foi possível sair. Tente de novo.')
        }
      }}
    >
      {falhaAoSair && (
        <p role="alert" className="mb-5 rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
          {falhaAoSair}
        </p>
      )}
      <Outlet
        context={
          {
            atualizarPendentes: () => setVersaoPendentes((n) => n + 1),
            acessosPendentes: decideAcessos ? acessos : 0,
          } satisfies ContextoGestao
        }
      />
    </Casca>
  )
}
