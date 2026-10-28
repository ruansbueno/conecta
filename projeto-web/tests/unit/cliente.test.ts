import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { aoSessaoInvalida, requisitar } from '../../src/api/cliente'
import { ApiError } from '../../src/api/erros'
import { erro, me } from '../fixtures'

const esquema = z.object({ id: z.string() })

function responder(status: number, corpo?: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(corpo === undefined ? null : JSON.stringify(corpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

async function falha(promessa: Promise<unknown>): Promise<ApiError> {
  try {
    await promessa
  } catch (e) {
    return e as ApiError
  }
  throw new Error('deveria falhar')
}

describe('cliente da API', () => {
  beforeEach(() => {
    document.cookie = 'conecta_csrf=csrf-123; path=/'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
    document.cookie = 'conecta_csrf=; Max-Age=0; path=/'
  })

  it('sucesso: valida pelo esquema e manda credentials em toda chamada', async () => {
    const fetchMock = responder(200, me)
    vi.stubGlobal('fetch', fetchMock)

    const r = await requisitar('GET', '/me', { esquema })

    expect(r.id).toBe(me.id)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/me')
    expect(init.credentials).toBe('include')
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBeNull()
  })

  it('escritas levam o cabeçalho CSRF lido do cookie; leituras não', async () => {
    const fetchMock = responder(201, { id: 'x' })
    vi.stubGlobal('fetch', fetchMock)

    await requisitar('POST', '/gestao/avisos', { corpo: { a: 1 }, esquema })

    const init = fetchMock.mock.calls[0][1]
    expect(new Headers(init.headers).get('X-CSRF-Token')).toBe('csrf-123')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
    expect(JSON.parse(init.body)).toEqual({ a: 1 })
  })

  it('parâmetros de consulta vão na URL, sem valores vazios', async () => {
    const fetchMock = responder(200, { id: 'x' })
    vi.stubGlobal('fetch', fetchMock)

    await requisitar('GET', '/gestao/turmas', { esquema, query: { ativa: true, q: '', limit: 20 } })

    expect(fetchMock.mock.calls[0][0]).toBe('/api/gestao/turmas?ativa=true&limit=20')
  })

  it('erro com code vira ApiError com code, status e errors', async () => {
    vi.stubGlobal(
      'fetch',
      responder(422, erro('VALIDATION_ERROR', 'Dados inválidos', [{ campo: 'titulo', mensagem: 'curto' }])),
    )

    const e = await falha(requisitar('POST', '/gestao/avisos', { corpo: {}, esquema }))

    expect(e).toBeInstanceOf(ApiError)
    expect([e.code, e.status, e.errors[0].campo]).toEqual(['VALIDATION_ERROR', 422, 'titulo'])
  })

  it('resposta fora do esquema vira RESPOSTA_INVALIDA', async () => {
    vi.stubGlobal('fetch', responder(200, { outro: 1 }))

    expect((await falha(requisitar('GET', '/me', { esquema }))).code).toBe('RESPOSTA_INVALIDA')
  })

  it('erro sem JSON (proxy) vira RESPOSTA_INVALIDA com o status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>', { status: 502 })))

    const e = await falha(requisitar('GET', '/me', { esquema }))
    expect([e.code, e.status]).toEqual(['RESPOSTA_INVALIDA', 502])
  })

  it('sem rede vira SEM_REDE', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    expect((await falha(requisitar('GET', '/me', { esquema }))).code).toBe('SEM_REDE')
  })

  it('timeout de 15 s vira TIMEOUT', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((_: string, init: RequestInit) =>
        new Promise((_ok, rejeitar) =>
          init.signal!.addEventListener('abort', () => rejeitar(new DOMException('abort', 'AbortError'))),
        ),
      ),
    )

    const p = falha(requisitar('GET', '/me', { esquema }))
    await vi.advanceTimersByTimeAsync(15_000)

    expect((await p).code).toBe('TIMEOUT')
  })

  it('204 devolve undefined', async () => {
    vi.stubGlobal('fetch', responder(204))

    expect(await requisitar('DELETE', '/auth/sessao')).toBeUndefined()
  })

  it('401 NAO_AUTENTICADO e 403 USUARIO_INATIVO avisam a sessão; o 401 do login não', async () => {
    const eventos: string[] = []
    const parar = aoSessaoInvalida((e) => eventos.push(e.code))

    vi.stubGlobal('fetch', responder(401, erro('NAO_AUTENTICADO')))
    await falha(requisitar('GET', '/me', { esquema }))
    vi.stubGlobal('fetch', responder(403, erro('USUARIO_INATIVO')))
    await falha(requisitar('GET', '/gestao/avisos', { esquema }))
    vi.stubGlobal('fetch', responder(401, erro('CREDENCIAIS_INVALIDAS')))
    await falha(requisitar('POST', '/auth/login', { corpo: {}, esquema, semSessao: true }))
    vi.stubGlobal('fetch', responder(403, erro('SEM_PERMISSAO')))
    await falha(requisitar('GET', '/gestao/usuarios', { esquema }))
    parar()

    expect(eventos).toEqual(['NAO_AUTENTICADO', 'USUARIO_INATIVO'])
  })
})
