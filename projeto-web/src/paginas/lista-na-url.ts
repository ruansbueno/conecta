// Listas cuja fonte da verdade é a URL (abas, busca, filtros e página): o mesmo endereço mostra a
// mesma lista, e voltar e avançar funcionam. Usado pelas listas de avisos e de turmas.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router'

import { ApiError } from '../api/erros'
import type { Pagina } from '../api/schemas'
import { mensagemDe, type Carga } from './comum'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ESPERA_MS = 300
const qualquer = () => true

/** Id que a API aceitaria; qualquer outra coisa na URL (link quebrado, digitado) é ignorada. */
export const idDaUrl = (v: string | null) => (v && UUID.test(v) ? v : '')

/** Página a partir de 1; valor inválido ou fracionário vira um número válido. */
export const paginaDaUrl = (v: string | null) => Math.max(1, Math.floor(Number(v)) || 1)

export type Filtrar = (mudancas: Record<string, string>, opcoes?: { substituir?: boolean }) => void

/** Parâmetros da URL e como mudá-los; qualquer filtro novo volta à primeira página. */
export function useFiltrosNaUrl() {
  const [params, setParams] = useSearchParams()
  const filtrar = useCallback<Filtrar>(
    (mudancas, { substituir = false } = {}) => {
      setParams(
        (atual) => {
          const novo = new URLSearchParams(atual)
          for (const [k, v] of Object.entries(mudancas)) {
            if (v) novo.set(k, v)
            else novo.delete(k)
          }
          if (!('pagina' in mudancas)) novo.delete('pagina')
          return novo
        },
        { replace: substituir },
      )
    },
    [setParams],
  )
  return { params, filtrar }
}

/**
 * Campo de texto ligado a um parâmetro da URL: grava depois de uma pausa na digitação (substituindo
 * a entrada do histórico) e acompanha a URL quando ela muda por fora (link, voltar, avançar).
 * `aceitar` impede gravar valor incompleto (ex.: período "2026" antes de "/2").
 */
export function useTextoNaUrl(chave: string, daUrl: string, filtrar: Filtrar, aceitar: (v: string) => boolean = qualquer) {
  const [texto, setTexto] = useState(daUrl)
  const [visto, setVisto] = useState(daUrl)
  if (daUrl !== visto) {
    setVisto(daUrl)
    setTexto(daUrl)
  }
  useEffect(() => {
    const valor = texto.trim()
    if (valor === daUrl || (valor && !aceitar(valor))) return
    const espera = setTimeout(() => filtrar({ [chave]: valor }, { substituir: true }), ESPERA_MS)
    return () => clearTimeout(espera)
  }, [texto, daUrl, chave, filtrar, aceitar])
  return [texto, setTexto] as const
}

/**
 * Página da API para a combinação atual de filtros (`chave`). Resposta de uma combinação antiga é
 * descartada; página além do fim (ex.: a última linha saiu) leva à última página com itens.
 */
export function useCargaPaginada<T>(
  chave: string,
  buscar: () => Promise<Pagina<T>>,
  { offset, porPagina, filtrar }: { offset: number; porPagina: number; filtrar: Filtrar },
) {
  // A carga lembra de qual combinação de filtros veio: trocar de aba, filtro ou página mostra o
  // carregando, e não a tabela anterior sob o título novo. Recarregar a mesma mantém a tabela.
  const alvo = `${chave}|${offset}`
  const [estado, setEstado] = useState<{ alvo: string; carga: Carga<Pagina<T>>; em: Date }>({
    alvo,
    carga: { estado: 'carregando' },
    em: new Date(0),
  })
  const carga: Carga<Pagina<T>> = estado.alvo === alvo ? estado.carga : { estado: 'carregando' }
  const [recarga, setRecarga] = useState(0)
  const buscarAtual = useRef(buscar)
  useEffect(() => {
    buscarAtual.current = buscar
  })

  useEffect(() => {
    let valido = true
    buscarAtual
      .current()
      .then((dados) => {
        if (!valido) return
        if (dados.items.length === 0 && dados.total > 0 && offset > 0) {
          const ultima = Math.ceil(dados.total / porPagina)
          filtrar({ pagina: ultima > 1 ? String(ultima) : '' }, { substituir: true })
          return
        }
        setEstado({ alvo, carga: { estado: 'pronto', dados }, em: new Date() })
      })
      .catch(
        (e: unknown) =>
          valido &&
          setEstado({
            alvo,
            carga: { estado: 'erro', mensagem: mensagemDe(e), repetivel: true, codigo: e instanceof ApiError ? e.code : undefined },
            em: new Date(),
          }),
      )
    return () => {
      valido = false
    }
  }, [alvo, offset, porPagina, filtrar, recarga])

  const recarregar = useCallback(() => setRecarga((n) => n + 1), [])
  /** `carregadaEm`: quando a resposta chegou — a referência para "há N dias" e "agendado". */
  return { carga, recarregar, carregadaEm: estado.em }
}

export type Mensagem = { texto: string; erro: boolean }

/**
 * Mensagem de uma ação na lista ("Aviso arquivado."): vale para a lista em que a pessoa estava.
 * Mudar a busca, a aba, um filtro ou a página a tira de cena.
 */
export function useMensagemDaLista(inicial?: Mensagem) {
  const { search } = useLocation()
  const [estado, setEstado] = useState(() => ({ mensagem: inicial, search }))
  const definir = useCallback((mensagem: Mensagem | undefined) => setEstado({ mensagem, search }), [search])
  return [estado.search === search ? estado.mensagem : undefined, definir] as const
}
