import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import { criarTurma, desativarTurma, editarTurma, listarTurmas, obterTurma } from '../../src/api/recursos/turmas'
import { desvincular, listarVinculos, vincular } from '../../src/api/recursos/vinculos'
import { erro, pagina, turma } from '../fixtures'

const vinculo = {
  usuario: { id: 'u1', username: 'ricardo.lemos', nome: 'Ricardo Lemos' },
  papel: 'docente',
  origem: 'gestao',
  criado_em: '2026-08-01T12:00:00Z',
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

describe('recurso de turmas (contrato §11)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('listar: filtros de situação, semestre, período e busca na query', async () => {
    const fn = api(200, pagina([turma]))
    const r = await listarTurmas({ ativa: false, semestre_curso: 3, periodo_letivo: '2026/2', q: 'tads', limit: 20, offset: 40 })
    const { url } = chamada(fn)
    const q = new URL(url, 'http://x').searchParams
    expect([q.get('ativa'), q.get('semestre_curso'), q.get('periodo_letivo'), q.get('q'), q.get('offset')]).toEqual([
      'false',
      '3',
      '2026/2',
      'tads',
      '40',
    ])
    expect(r.items[0].semestreCurso).toBe(3)
  })

  it('criar e editar enviam os campos do contrato; editar só o que foi dado', async () => {
    let fn = api(201, turma)
    await criarTurma({ codigo: 'SI-3A', nome: 'Sistemas 3A', semestreCurso: 3, periodoLetivo: '2026/2', inscricoesAbertas: true })
    expect(chamada(fn)).toMatchObject({
      metodo: 'POST',
      url: '/api/gestao/turmas',
      corpo: { codigo: 'SI-3A', nome: 'Sistemas 3A', semestre_curso: 3, periodo_letivo: '2026/2', inscricoes_abertas: true },
    })

    fn = api(200, turma)
    await editarTurma('t1', { inscricoesAbertas: false })
    expect(chamada(fn)).toMatchObject({ metodo: 'PATCH', url: '/api/gestao/turmas/t1', corpo: { inscricoes_abertas: false } })

    fn = api(200, turma)
    await editarTurma('t1', { ativa: true })
    expect(chamada(fn).corpo).toEqual({ ativa: true })
  })

  it('obter e desativar', async () => {
    let fn = api(200, turma)
    expect((await obterTurma('t1')).codigo).toBe(turma.codigo)
    expect(chamada(fn).url).toBe('/api/gestao/turmas/t1')
    fn = api(204)
    await desativarTurma('t1')
    expect(chamada(fn)).toMatchObject({ metodo: 'DELETE', url: '/api/gestao/turmas/t1' })
  })

  it('409 CODIGO_TURMA_DUPLICADO e 422 chegam como ApiError com mensagem própria', async () => {
    api(409, erro('CODIGO_TURMA_DUPLICADO'))
    const e = await criarTurma({ codigo: 'X', nome: 'Xyz', semestreCurso: 1, periodoLetivo: '2026/1', inscricoesAbertas: false }).catch(
      (x: unknown) => x,
    )
    expect(e).toBeInstanceOf(ApiError)
    expect((e as ApiError).mensagem).toBe('Já existe uma turma com este código.')

    api(422, erro('VALIDATION_ERROR', 'x', [{ campo: 'periodo_letivo', mensagem: 'formato AAAA/N' }]))
    const v = (await editarTurma('t1', { periodoLetivo: '26/2' }).catch((x: unknown) => x)) as ApiError
    expect(v.erroDoCampo('periodo_letivo')).toBe('formato AAAA/N')
  })
})

describe('recurso de vínculos (contrato §12)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('listar com filtro de papel; vincular e desvincular', async () => {
    let fn = api(200, pagina([vinculo]))
    const r = await listarVinculos('t1', { papel: 'docente', limit: 100 })
    expect(chamada(fn).url).toBe('/api/gestao/turmas/t1/vinculos?papel=docente&limit=100')
    expect(r.items[0]).toMatchObject({ papel: 'docente', origem: 'gestao' })

    fn = api(201, vinculo)
    await vincular('t1', 'u1', 'docente')
    expect(chamada(fn)).toMatchObject({ metodo: 'POST', url: '/api/gestao/turmas/t1/vinculos', corpo: { usuario_id: 'u1', papel: 'docente' } })

    fn = api(204)
    await desvincular('t1', 'u1')
    expect(chamada(fn)).toMatchObject({ metodo: 'DELETE', url: '/api/gestao/turmas/t1/vinculos/u1' })
  })

  it('cada code de erro dos vínculos tem mensagem própria (nunca a generica)', async () => {
    const generica = 'Não foi possível concluir agora. Tente de novo em instantes.'
    for (const [status, code] of [
      [409, 'JA_VINCULADO'],
      [409, 'PERFIL_INCOMPATIVEL'],
      [404, 'USUARIO_NAO_ENCONTRADO'],
      [404, 'VINCULO_NAO_ENCONTRADO'],
      [404, 'TURMA_NAO_ENCONTRADA'],
    ] as const) {
      api(status, erro(code))
      const e = (await vincular('t1', 'u1', 'aluno').catch((x: unknown) => x)) as ApiError
      expect(e.code).toBe(code)
      expect(e.mensagem).not.toBe(generica)
    }
  })
})
