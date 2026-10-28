import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import { aprovarSolicitacao, listarSolicitacoes, recusarSolicitacao } from '../../src/api/recursos/solicitacoes'
import { erro, pagina, solicitacao } from '../fixtures'

function api(status: number, corpo?: unknown) {
  const fn = vi.fn(async () => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}
const chamada = (fn: ReturnType<typeof api>) => {
  const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
  return { url, metodo: init.method, corpo: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('recurso de solicitações de gestão (contrato §13)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('listar com status e turma; datas e decisor convertidos', async () => {
    const fn = api(200, pagina([{ ...solicitacao, status: 'aprovada', decidida_em: '2026-10-13T10:00:00Z', decidida_por: { id: 'c1', nome: 'Marina Duarte' } }]))
    const r = await listarSolicitacoes({ status: 'aprovada', turma_id: 't1', limit: 20, offset: 0 })
    expect(chamada(fn).url).toBe('/api/gestao/solicitacoes?status=aprovada&turma_id=t1&limit=20&offset=0')
    expect(r.items[0].decididaPor?.nome).toBe('Marina Duarte')
    expect(r.items[0].decididaEm).toBeInstanceOf(Date)
  })

  it('aprovar sem corpo; recusar com motivo, ou sem motivo quando vazio', async () => {
    let fn = api(200, { ...solicitacao, status: 'aprovada' })
    await aprovarSolicitacao('s1')
    expect(chamada(fn)).toMatchObject({ metodo: 'POST', url: '/api/gestao/solicitacoes/s1/aprovar', corpo: undefined })

    fn = api(200, { ...solicitacao, status: 'recusada' })
    await recusarSolicitacao('s1', 'Turma completa')
    expect(chamada(fn)).toMatchObject({ url: '/api/gestao/solicitacoes/s1/recusar', corpo: { motivo: 'Turma completa' } })

    fn = api(200, { ...solicitacao, status: 'recusada' })
    await recusarSolicitacao('s1', '   ')
    expect(chamada(fn).corpo).toBeUndefined()
  })

  it('cada code de erro da decisão tem mensagem própria', async () => {
    const generica = 'Não foi possível concluir agora. Tente de novo em instantes.'
    for (const [status, code] of [
      [409, 'SOLICITACAO_NAO_PENDENTE'],
      [409, 'JA_VINCULADO'],
      [404, 'SOLICITACAO_NAO_ENCONTRADA'],
      [403, 'SEM_PERMISSAO'],
    ] as const) {
      api(status, erro(code))
      const e = (await aprovarSolicitacao('s1').catch((x: unknown) => x)) as ApiError
      expect(e.code).toBe(code)
      expect(e.mensagem).not.toBe(generica)
    }
  })
})
