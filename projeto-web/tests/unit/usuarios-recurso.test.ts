import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import { alterarUsuario, listarUsuarios, obterUsuario } from '../../src/api/recursos/usuarios'
import { erro, pagina } from '../fixtures'

const usuario = { id: 'u1', username: 'ricardo.lemos', nome: 'Ricardo Lemos', perfil: 'docente', ativo: true, ultimo_login_em: null }

function api(status: number, corpo?: unknown) {
  const fn = vi.fn(async () => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}
const chamada = (fn: ReturnType<typeof api>) => {
  const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
  return { url, metodo: init.method, corpo: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('recurso de usuários de gestão (contrato §10)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('listar com busca, perfil e situação', async () => {
    const fn = api(200, pagina([usuario]))
    await listarUsuarios({ q: 'ric', perfil: 'docente', ativo: false, limit: 20, offset: 0 })
    expect(chamada(fn).url).toBe('/api/gestao/usuarios?q=ric&perfil=docente&ativo=false&limit=20&offset=0')
  })

  it('obter traz as turmas da pessoa', async () => {
    api(200, { ...usuario, turmas: [{ id: 't1', codigo: 'SI-3A', nome: 'Sistemas 3A', papel: 'docente' }] })
    const u = await obterUsuario('u1')
    expect(u.turmas).toHaveLength(1)
    expect(u.perfil).toBe('docente')
  })

  it('alterar envia só o que mudou', async () => {
    let fn = api(200, { ...usuario, perfil: 'coordenacao' })
    await alterarUsuario('u1', { perfil: 'coordenacao' })
    expect(chamada(fn)).toMatchObject({ metodo: 'PATCH', url: '/api/gestao/usuarios/u1', corpo: { perfil: 'coordenacao' } })

    fn = api(200, { ...usuario, ativo: false })
    await alterarUsuario('u1', { ativo: false })
    expect(chamada(fn).corpo).toEqual({ ativo: false })
  })

  it('409 PERFIL_INCOMPATIVEL e 422 chegam como ApiError', async () => {
    api(409, erro('PERFIL_INCOMPATIVEL'))
    expect(((await alterarUsuario('u1', { perfil: 'aluno' }).catch((e: unknown) => e)) as ApiError).code).toBe('PERFIL_INCOMPATIVEL')

    api(422, erro('VALIDATION_ERROR', 'x', [{ campo: 'ativo', mensagem: 'você não pode desativar a sua própria conta' }]))
    const e = (await alterarUsuario('u1', { ativo: false }).catch((x: unknown) => x)) as ApiError
    expect(e.erroDoCampo('ativo')).toBe('você não pode desativar a sua própria conta')
  })
})
