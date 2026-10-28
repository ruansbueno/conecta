import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SessaoProvider, useSessao } from '../../src/sessao/contexto'
import { erro, me } from '../fixtures'

function Espiao() {
  const { estado, entrar } = useSessao()
  return (
    <>
      <p>estado={estado.tipo}</p>
      <button type="button" onClick={() => entrar({ ...me, turmas: [] } as never)}>
        entrar
      </button>
    </>
  )
}

describe('corrida entre um 401 antigo e um login novo', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('401 de uma requisição que saiu antes do login não encerra a sessão nova', async () => {
    let liberar401: () => void = () => undefined
    const chamadas: string[] = []
    let mes = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const chave = `${init.method} ${url.replace('/api', '')}`
        chamadas.push(chave)
        const nao = () => new Response(JSON.stringify(erro('NAO_AUTENTICADO')), { status: 401 })
        if (chave === 'GET /me' && mes++ === 1) return new Promise<Response>((r) => (liberar401 = () => r(nao())))
        return chave === 'GET /me' ? nao() : new Response(null, { status: 204 })
      }),
    )
    render(
      <SessaoProvider>
        <Espiao />
      </SessaoProvider>,
    )
    expect(await screen.findByText('estado=anonimo')).toBeInTheDocument()

    // A aba volta ao foco sem sessão: GET /me sai e demora.
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    // Enquanto isso, a pessoa entra.
    await userEvent.click(screen.getByRole('button', { name: 'entrar' }))
    expect(screen.getByText('estado=autenticado')).toBeInTheDocument()

    await act(async () => liberar401())

    expect(screen.getByText('estado=autenticado')).toBeInTheDocument()
    expect(chamadas).not.toContain('DELETE /auth/sessao')
  })
})
