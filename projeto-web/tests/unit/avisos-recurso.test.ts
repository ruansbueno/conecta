import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import {
  arquivarAviso,
  criarAviso,
  desarquivarAviso,
  editarAviso,
  excluirAviso,
  historicoDoAviso,
  listarAvisos,
  obterAviso,
  versoesDoAviso,
} from '../../src/api/recursos/avisos'
import { listarTurmas } from '../../src/api/recursos/turmas'
import { avisoGestao, erro, pagina, turma } from '../fixtures'

function api(status: number, corpo?: unknown) {
  const fn = vi.fn(async () => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}
const chamada = (fn: ReturnType<typeof api>, i = 0) => {
  const [url, init] = fn.mock.calls[i] as unknown as [string, RequestInit]
  return { url, metodo: init.method, corpo: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('recurso de avisos de gestão', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('criar: destinos no formato do contrato; sem agendamento não envia publicar_em', async () => {
    const fn = api(201, avisoGestao)

    const criado = await criarAviso({
      titulo: 'Reunião',
      conteudo: 'Texto',
      publicarEm: null,
      destinos: [
        { tipo: 'turma', turmaId: 't1', turmaNome: 'SI-3A' },
        { tipo: 'semestre', semestre: 3 },
        { tipo: 'todos' },
      ],
    })

    expect(criado.versaoAtual).toBe(2)
    expect(chamada(fn)).toEqual({
      url: '/api/gestao/avisos',
      metodo: 'POST',
      corpo: {
        titulo: 'Reunião',
        conteudo: 'Texto',
        destinos: [{ tipo: 'turma', turma_id: 't1' }, { tipo: 'semestre', semestre: 3 }, { tipo: 'todos' }],
      },
    })
  })

  it('criar agendado envia publicar_em em ISO', async () => {
    const fn = api(201, avisoGestao)
    const quando = new Date('2030-01-02T11:00:00Z')

    await criarAviso({ titulo: 'Tít', conteudo: 'x', publicarEm: quando, destinos: [{ tipo: 'todos' }] })

    expect(chamada(fn).corpo.publicar_em).toBe('2030-01-02T11:00:00.000Z')
  })

  it('editar envia só os campos dados; destinos vão completos', async () => {
    const fn = api(200, avisoGestao)

    await editarAviso('a1', { conteudo: 'Novo', destinos: [{ tipo: 'docentes' }] })

    expect(chamada(fn)).toEqual({
      url: '/api/gestao/avisos/a1',
      metodo: 'PATCH',
      corpo: { conteudo: 'Novo', destinos: [{ tipo: 'docentes' }] },
    })
  })

  it('editar com publicarEm nulo publica já (envia null)', async () => {
    const fn = api(200, avisoGestao)

    await editarAviso('a1', { publicarEm: null })

    expect(chamada(fn).corpo).toEqual({ publicar_em: null })
  })

  it('listar com filtros e paginação', async () => {
    const fn = api(200, pagina([avisoGestao], 21))

    const p = await listarAvisos({ situacao: 'agendado', q: 'reunião', limit: 20, offset: 20 })

    expect(p.total).toBe(21)
    expect(chamada(fn).url).toBe('/api/gestao/avisos?situacao=agendado&q=reuni%C3%A3o&limit=20&offset=20')
  })

  it('obter, ciclo de vida, versões e histórico usam os caminhos do contrato', async () => {
    const fn = api(200, avisoGestao)
    await obterAviso('a1')
    await arquivarAviso('a1')
    await desarquivarAviso('a1')
    api(204)
    await excluirAviso('a1')
    const fnV = api(200, pagina([]))
    await versoesDoAviso('a1')
    await historicoDoAviso('a1')

    expect([chamada(fn, 0), chamada(fn, 1), chamada(fn, 2)].map((c) => `${c.metodo} ${c.url}`)).toEqual([
      'GET /api/gestao/avisos/a1',
      'POST /api/gestao/avisos/a1/arquivar',
      'POST /api/gestao/avisos/a1/desarquivar',
    ])
    expect([chamada(fnV, 0).url, chamada(fnV, 1).url]).toEqual([
      '/api/gestao/avisos/a1/versoes',
      '/api/gestao/avisos/a1/historico',
    ])
  })

  it.each([
    [403, 'DESTINO_NAO_PERMITIDO'],
    [404, 'TURMA_NAO_ENCONTRADA'],
    [409, 'AVISO_NAO_EDITAVEL'],
    [422, 'VALIDATION_ERROR'],
  ])('erro %s %s chega como ApiError', async (status, code) => {
    api(status, erro(code))

    await expect(criarAviso({ titulo: 'Tít', conteudo: 'x', publicarEm: null, destinos: [] })).rejects.toMatchObject({
      code,
      status,
    })
    await expect(criarAviso({ titulo: 'Tít', conteudo: 'x', publicarEm: null, destinos: [] })).rejects.toBeInstanceOf(
      ApiError,
    )
  })

  it('turmas ativas para o seletor de destinos', async () => {
    const fn = api(200, pagina([turma]))

    const p = await listarTurmas({ ativa: true, limit: 100 })

    expect(p.items[0].codigo).toBe('TADS-3A-2026-2')
    expect(chamada(fn).url).toBe('/api/gestao/turmas?ativa=true&limit=100')
  })
})
