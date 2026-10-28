// Usuário corrente, carregado por GET /me (D7) e recarregado ao voltar o foco para a aba, para que
// mudança de perfil valha sem novo login (RW-10).
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { aoSessaoInvalida, ultimaRequisicao } from '../api/cliente'
import { ApiError } from '../api/erros'
import { encerrarSessaoNaApi, me } from '../api/recursos/auth'
import type { UsuarioSessao } from '../api/schemas'
import { criarEncerrador, type Encerramento, type MotivoEncerramento } from './encerrar'

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'autenticado'; usuario: UsuarioSessao }
  | { tipo: 'anonimo'; encerramento?: Encerramento }
  | { tipo: 'erro'; erro: ApiError }

interface Sessao {
  estado: Estado
  usuario: UsuarioSessao | null
  entrar: (usuario: UsuarioSessao) => void
  encerrar: (motivo: MotivoEncerramento) => Promise<void>
  recarregar: () => Promise<void>
}

const ContextoSessao = createContext<Sessao | null>(null)

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<Estado>({ tipo: 'carregando' })
  // Lido pelos ouvintes da API sem recriá-los a cada mudança de estado.
  const estadoAtual = useRef(estado)
  const sessaoDesde = useRef(0)
  useEffect(() => {
    estadoAtual.current = estado
  }, [estado])

  const encerrar = useMemo(
    () =>
      criarEncerrador({
        encerrarNaApi: encerrarSessaoNaApi,
        aoEncerrar: (encerramento) => setEstado({ tipo: 'anonimo', encerramento }),
      }),
    [],
  )

  const recarregar = useCallback(async () => {
    try {
      const usuario = await me()
      setEstado({ tipo: 'autenticado', usuario })
    } catch (e) {
      const erro = e instanceof ApiError ? e : new ApiError({ code: 'RESPOSTA_INVALIDA' })
      // Abertura sem sessão é o caso comum, não "sessão expirada". Com sessão ativa, quem
      // encerra (com a mensagem) é o ouvinte central, abaixo.
      // Fora de uma sessão autenticada, 401 leva a anônimo (inclusive saindo de um erro de rede),
      // mantendo a mensagem de encerramento que já houver.
      if (erro.code === 'NAO_AUTENTICADO' || erro.code === 'USUARIO_INATIVO') {
        setEstado((atual) => (atual.tipo === 'autenticado' || atual.tipo === 'anonimo' ? atual : { tipo: 'anonimo' }))
        return
      }
      // Falha de rede não apaga um estado conhecido (autenticado ou anônimo com a mensagem).
      setEstado((atual) => (atual.tipo === 'autenticado' || atual.tipo === 'anonimo' ? atual : { tipo: 'erro', erro }))
    }
  }, [])

  useEffect(() => {
    // Carga inicial de GET /me: o estado só muda depois da resposta (assíncrono), não na hora.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregar()
  }, [recarregar])

  useEffect(
    () =>
      aoSessaoInvalida((erro, numero) => {
        if (estadoAtual.current.tipo !== 'autenticado') return
        // Resposta de uma requisição que saiu antes do login atual: não fala desta sessão.
        if (numero <= sessaoDesde.current) return
        void encerrar(erro.code === 'USUARIO_INATIVO' ? 'inativo' : 'expirada')
      }),
    [encerrar],
  )

  useEffect(() => {
    const aoFocar = () => {
      if (document.visibilityState === 'visible') void recarregar()
    }
    document.addEventListener('visibilitychange', aoFocar)
    return () => document.removeEventListener('visibilitychange', aoFocar)
  }, [recarregar])

  const valor = useMemo<Sessao>(
    () => ({
      estado,
      usuario: estado.tipo === 'autenticado' ? estado.usuario : null,
      entrar: (usuario) => {
        sessaoDesde.current = ultimaRequisicao()
        setEstado({ tipo: 'autenticado', usuario })
      },
      encerrar,
      recarregar,
    }),
    [estado, encerrar, recarregar],
  )

  return <ContextoSessao value={valor}>{children}</ContextoSessao>
}

export function useSessao(): Sessao {
  const sessao = use(ContextoSessao)
  if (!sessao) throw new Error('useSessao fora de SessaoProvider')
  return sessao
}
