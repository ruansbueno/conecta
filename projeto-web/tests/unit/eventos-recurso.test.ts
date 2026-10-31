import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import {
  arquivarEvento,
  criarEvento,
  desarquivarEvento,
  editarEvento,
  excluirEvento,
  historicoDoEvento,
  listarEventos,
  obterEvento,
  versoesDoEvento,
} from '../../src/api/recursos/eventos'
import { erro, eventoGestao, pagina, versaoEvento } from '../fixtures'

function api(status: number, corpo?: unknown) {
  const fn = vi.fn(async () => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}
const chamada = (fn: ReturnType<typeof api>, i = 0) => {
  const [url, init] = fn.mock.calls[i] as unknown as [string, RequestInit]
  return { url, metodo: init.method, corpo: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('recurso de eventos da agenda (contracts E3 §4–9)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista com os filtros da aba na query e converte o evento', async () => {
    const fn = api(200, pagina([eventoGestao]))

    const r = await listarEventos({ situacao: 'ativo', quando: 'realizados', tipo: 'banca', q: 'tcc', offset: 20 })

    expect(chamada(fn).url).toBe('/api/gestao/eventos?situacao=ativo&quando=realizados&tipo=banca&q=tcc&offset=20')
    const [e] = r.items
    expect(e.inicio).toEqual(new Date('2026-11-24T17:00:00Z'))
    expect(e.fim).toEqual(new Date('2026-11-24T21:00:00Z'))
    expect(e.versaoAtual).toBe(2)
    expect(e.editadoEm).toEqual(new Date('2026-10-05T09:00:00Z'))
    expect(e.arquivadoEm).toBeNull()
    expect(e.destinos).toHaveLength(2)
  })

  it('a janela do mês vai em ISO', async () => {
    const fn = api(200, pagina([]))

    await listarEventos({ de: new Date('2026-11-01T03:00:00Z'), ate: new Date('2026-12-01T03:00:00Z') })

    expect(chamada(fn).url).toBe(
      '/api/gestao/eventos?de=2026-11-01T03%3A00%3A00.000Z&ate=2026-12-01T03%3A00%3A00.000Z',
    )
  })

  it('criar: datas em ISO, opcionais omitidos, destinos no formato do contrato', async () => {
    const fn = api(201, eventoGestao)

    await criarEvento({
      titulo: 'Prova',
      tipo: 'prova',
      inicio: new Date('2026-11-30T22:00:00Z'),
      fim: null,
      local: '',
      descricao: '',
      destinos: [{ tipo: 'turma', turmaId: 't1', turmaNome: 'SI-3A' }],
    })

    expect(chamada(fn)).toEqual({
      url: '/api/gestao/eventos',
      metodo: 'POST',
      corpo: {
        titulo: 'Prova',
        tipo: 'prova',
        inicio: '2026-11-30T22:00:00.000Z',
        destinos: [{ tipo: 'turma', turma_id: 't1' }],
      },
    })
  })

  it('editar envia só o que mudou; limpar fim, local e descrição manda null', async () => {
    const fn = api(200, eventoGestao)

    await editarEvento('e1', { titulo: 'Novo', fim: null, local: '', descricao: '' })

    expect(chamada(fn)).toEqual({
      url: '/api/gestao/eventos/e1',
      metodo: 'PATCH',
      corpo: { titulo: 'Novo', fim: null, local: null, descricao: null },
    })
  })

  it('arquivar, desarquivar e excluir', async () => {
    const fn = api(200, eventoGestao)
    await arquivarEvento('e1')
    await desarquivarEvento('e1')
    api(204)
    await excluirEvento('e1')

    expect(chamada(fn, 0)).toMatchObject({ url: '/api/gestao/eventos/e1/arquivar', metodo: 'POST' })
    expect(chamada(fn, 1)).toMatchObject({ url: '/api/gestao/eventos/e1/desarquivar', metodo: 'POST' })
  })

  it('obter, versões e histórico', async () => {
    api(200, eventoGestao)
    expect((await obterEvento('e1')).titulo).toBe('Defesas de TCC II')

    api(200, pagina([versaoEvento]))
    const [v] = (await versoesDoEvento('e1')).items
    expect(v.criadaPor.nome).toBe('Maria Coordenadora')
    expect(v.fim).toBeNull()
    expect(v.inicio).toEqual(new Date('2026-11-24T17:00:00Z'))

    api(200, pagina([{ id: 'h1', tipo: 'criado', usuario: { id: 'u', nome: 'X' }, ocorrido_em: '2026-10-01T12:00:00Z', versao: 1, alteracoes: null }]))
    expect((await historicoDoEvento('e1')).items[0].tipo).toBe('criado')
  })

  it('erro da API vira ApiError com o código', async () => {
    api(409, erro('EVENTO_NAO_EDITAVEL'))

    await expect(editarEvento('e1', { titulo: 'X' })).rejects.toBeInstanceOf(ApiError)
  })
})
