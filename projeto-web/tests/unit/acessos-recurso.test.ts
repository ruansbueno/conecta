// Pedidos de acesso (contrato §10a da API; emenda v2.3).
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import { aprovarAcesso, listarAcessos, recusarAcesso } from '../../src/api/recursos/acessos'
import { erro, pagina } from '../fixtures'

const pedido = {
  id: 'a/1',
  username: 'fulano.servidor',
  nome: 'Fulano Servidor',
  email: null,
  tipo_institucional: 'administrativo',
  situacao: 'pendente',
  solicitado_em: '2026-11-06T13:00:00Z',
  decidido_em: null,
  decidido_por: null,
}

function api(status: number, corpo?: unknown) {
  const fn = vi.fn(async () => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}
const chamada = (fn: ReturnType<typeof api>) => {
  const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
  return { url, metodo: init.method, corpo: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('recurso de pedidos de acesso (contrato §10a)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('listar por situação converte datas e nomes de campo', async () => {
    const fn = api(200, pagina([pedido]))

    const p = await listarAcessos({ situacao: 'recusado', limit: 1 })

    expect(chamada(fn).url).toBe('/api/gestao/acessos?situacao=recusado&limit=1')
    expect(p.items[0].solicitadoEm).toEqual(new Date('2026-11-06T13:00:00Z'))
    expect(p.items[0].tipoInstitucional).toBe('administrativo')
    expect(p.items[0].email).toBeNull()
  })

  it('aprovar envia o perfil; recusar não tem corpo; o id vai codificado', async () => {
    let fn = api(200, { ...pedido, situacao: 'liberado', perfil: 'docente', decidido_em: '2026-11-06T14:00:00Z', decidido_por: { id: 'x', nome: 'Admin' } })
    const aprovado = await aprovarAcesso('a/1', 'docente')
    expect(chamada(fn)).toMatchObject({ metodo: 'POST', url: '/api/gestao/acessos/a%2F1/aprovar', corpo: { perfil: 'docente' } })
    expect(aprovado.decididoPor?.nome).toBe('Admin')

    fn = api(200, { ...pedido, situacao: 'recusado' })
    await recusarAcesso('a/1')
    expect(chamada(fn)).toMatchObject({ metodo: 'POST', url: '/api/gestao/acessos/a%2F1/recusar', corpo: undefined })
  })

  it('409 ACESSO_JA_DECIDIDO chega como ApiError com a mensagem da spec', async () => {
    api(409, erro('ACESSO_JA_DECIDIDO'))

    const e = (await recusarAcesso('a1').catch((x: unknown) => x)) as ApiError

    expect(e.code).toBe('ACESSO_JA_DECIDIDO')
    expect(e.mensagem).toBe('Este pedido de acesso já foi decidido.')
    expect(e.efeito).toBe('recarrega')
  })
})
