// Única porta de saída para a API (D5): credentials em toda chamada, CSRF nas escritas, timeout,
// validação da resposta (D9) e conversão de qualquer falha em ApiError.
import type { z } from 'zod'

import { ApiError, RESPOSTA_INVALIDA, SEM_REDE, TIMEOUT } from './erros'

const BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'
const TEMPO_LIMITE_MS = 15_000
const ESCRITAS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

type Metodo = 'GET' | 'POST' | 'PATCH' | 'DELETE'
type Ouvinte = (erro: ApiError) => void

const ouvintes = new Set<Ouvinte>()

/** Avisa quem cuida da sessão quando a API diz que ela acabou (401 ou 403 USUARIO_INATIVO). */
export function aoSessaoInvalida(ouvinte: Ouvinte): () => void {
  ouvintes.add(ouvinte)
  return () => ouvintes.delete(ouvinte)
}

/** Único cookie que o JavaScript lê: o CSRF, que não autentica nada sozinho (D4). */
function tokenCsrf(): string | undefined {
  return document.cookie
    .split('; ')
    .find((c) => c.startsWith('conecta_csrf='))
    ?.slice('conecta_csrf='.length)
}

function montarUrl(caminho: string, query?: Record<string, unknown>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') params.append(k, String(v))
  }
  const qs = params.toString()
  return `${BASE}${caminho}${qs ? `?${qs}` : ''}`
}

interface Opcoes<T extends z.ZodType> {
  esquema?: T
  corpo?: unknown
  query?: Record<string, unknown>
  /** Chamada sem sessão (o login): 401/403 nela não encerram sessão nenhuma. */
  semSessao?: boolean
}

export async function requisitar<T extends z.ZodType>(
  metodo: Metodo,
  caminho: string,
  { esquema, corpo, query, semSessao = false }: Opcoes<T> = {},
): Promise<z.infer<T>> {
  const headers = new Headers({ Accept: 'application/json' })
  if (corpo !== undefined) headers.set('Content-Type', 'application/json')
  const csrf = ESCRITAS.has(metodo) ? tokenCsrf() : undefined
  if (csrf) headers.set('X-CSRF-Token', csrf)

  const controle = new AbortController()
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS)
  let resposta: Response
  try {
    resposta = await fetch(montarUrl(caminho, query), {
      method: metodo,
      credentials: 'include',
      headers,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
      signal: controle.signal,
    })
  } catch (e) {
    throw new ApiError({ code: e instanceof DOMException && e.name === 'AbortError' ? TIMEOUT : SEM_REDE })
  } finally {
    clearTimeout(relogio)
  }

  if (resposta.status === 204) return undefined as z.infer<T>
  const json = await resposta.json().catch(() => undefined)

  if (!resposta.ok) {
    const erro =
      json && typeof json.code === 'string'
        ? new ApiError({ code: json.code, status: resposta.status, detail: json.detail, errors: json.errors })
        : new ApiError({ code: RESPOSTA_INVALIDA, status: resposta.status })
    const encerra = erro.code === 'NAO_AUTENTICADO' || erro.code === 'USUARIO_INATIVO'
    if (encerra && !semSessao) ouvintes.forEach((o) => o(erro))
    throw erro
  }

  if (!esquema) return json as z.infer<T>
  const validado = esquema.safeParse(json)
  if (!validado.success) {
    console.warn('Resposta da API fora do contrato', caminho, validado.error.issues)
    throw new ApiError({ code: RESPOSTA_INVALIDA, status: resposta.status })
  }
  return validado.data
}
