import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requisitar } from '../../src/api/cliente'
import { SessaoProvider } from '../../src/sessao/contexto'
import { ExigirSessao } from '../../src/sessao/exigir-sessao'
import { erro, me } from '../fixtures'

function LoginEspiao() {
  const { state } = useLocation()
  return <p>login destino={state?.destino ?? '-'}</p>
}

type Rota = { status: number; corpo?: unknown }

function fetchFalso(rotas: Record<string, Rota | (() => Rota)>) {
  const chamadas: string[] = []
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    const chave = `${init.method} ${url.replace('/api', '').split('?')[0]}`
    chamadas.push(chave)
    const r = rotas[chave]
    const { status, corpo } = typeof r === 'function' ? r() : (r ?? { status: 404, corpo: erro('NAO_ENCONTRADO') })
    return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
  })
  vi.stubGlobal('fetch', fn)
  return chamadas
}

function montar(inicial = '/avisos/novo') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <SessaoProvider>
        <Routes>
          <Route path="/login" element={<LoginEspiao />} />
          <Route path="/sem-permissao" element={<p>sem permissão</p>} />
          <Route element={<ExigirSessao />}>
            <Route path="/avisos/novo" element={<p>editor</p>} />
          </Route>
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe('sessão na interface', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('com sessão válida, mostra a página protegida', async () => {
    fetchFalso({ 'GET /me': { status: 200, corpo: me } })

    montar()

    expect(await screen.findByText('editor')).toBeInTheDocument()
  })

  it('sem sessão, vai ao login guardando o destino pretendido (RW-07)', async () => {
    fetchFalso({ 'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') } })

    montar('/avisos/novo')

    expect(await screen.findByText('login destino=/avisos/novo')).toBeInTheDocument()
  })

  it('duas chamadas com 401 juntas encerram a sessão uma vez só', async () => {
    let meOk = true
    const chamadas = fetchFalso({
      'GET /me': () => (meOk ? { status: 200, corpo: me } : { status: 401, corpo: erro('NAO_AUTENTICADO') }),
      'GET /gestao/avisos': { status: 401, corpo: erro('NAO_AUTENTICADO') },
      'DELETE /auth/sessao': { status: 204 },
    })
    montar()
    await screen.findByText('editor')
    meOk = false

    await Promise.allSettled([requisitar('GET', '/gestao/avisos'), requisitar('GET', '/gestao/avisos')])

    expect(await screen.findByText(/login destino=/)).toBeInTheDocument()
    await waitFor(() => expect(chamadas.filter((c) => c === 'DELETE /auth/sessao')).toHaveLength(1))
  })

  it('aluno autenticado vê sem permissão e a sessão é encerrada (RW-06)', async () => {
    const chamadas = fetchFalso({
      'GET /me': { status: 200, corpo: { ...me, perfil: 'aluno' } },
      'DELETE /auth/sessao': { status: 204 },
    })

    montar()

    expect(await screen.findByText('sem permissão')).toBeInTheDocument()
    await waitFor(() => expect(chamadas).toContain('DELETE /auth/sessao'))
  })
})
