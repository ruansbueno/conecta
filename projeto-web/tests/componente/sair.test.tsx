import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AreaGestao from '../../src/paginas/area-gestao'
import Solicitacoes from '../../src/paginas/solicitacoes'
import { SessaoProvider } from '../../src/sessao/contexto'
import { erro, me, meDocente, solicitacao } from '../fixtures'

function montar(respostaSaida: { status: number; corpo?: unknown }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const chave = `${init.method} ${url.replace('/api', '')}`
      const { status, corpo } = chave === 'GET /me' ? { status: 200, corpo: me } : respostaSaida
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  render(
    <MemoryRouter initialEntries={['/painel']}>
      <SessaoProvider>
        <Routes>
          <Route path="/login" element={<p>tela de login</p>} />
          <Route element={<AreaGestao />}>
            <Route path="/painel" element={<p>painel</p>} />
          </Route>
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe('sair (RW-09)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('saída confirmada pela API volta ao login', async () => {
    montar({ status: 204 })
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))
    expect(await screen.findByText('tela de login')).toBeInTheDocument()
  })

  it('saída que falhou avisa e mantém a pessoa na gestão', async () => {
    montar({ status: 503, corpo: erro('ERRO_INTERNO') })
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível sair. Tente de novo.')
    expect(screen.getByText('painel')).toBeInTheDocument()
  })

  it('CSRF inválido não pede para "tentar em instantes"', async () => {
    montar({ status: 403, corpo: erro('CSRF_INVALIDO') })
    await userEvent.click(await screen.findByRole('button', { name: 'Sair' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/Recarregue a página/)
  })
})

describe('título da seção na barra superior', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('docente vê "Meus avisos", o mesmo nome da navegação', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify(meDocente), { status: 200 })),
    )
    render(
      <MemoryRouter initialEntries={['/avisos/novo']}>
        <SessaoProvider>
          <Routes>
            <Route element={<AreaGestao />}>
              <Route path="/avisos/novo" element={<p>editor</p>} />
            </Route>
          </Routes>
        </SessaoProvider>
      </MemoryRouter>,
    )

    expect(within(await screen.findByRole('banner')).getByText('Meus avisos')).toBeInTheDocument()
  })
})

describe('perfil alterado vale na navegação seguinte (SC-008)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('trocar de página relê a sessão: a navegação mostra o perfil novo', async () => {
    let perfil = 'coordenacao'
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/me')
          ? new Response(JSON.stringify({ ...me, perfil }), { status: 200 })
          : new Response(null, { status: 204 }),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/painel']}>
        <SessaoProvider>
          <Routes>
            <Route element={<AreaGestao />}>
              <Route path="/painel" element={<p>painel</p>} />
              <Route path="/avisos" element={<p>avisos</p>} />
            </Route>
          </Routes>
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: 'Usuários' })).toBeInTheDocument()

    perfil = 'docente' // a administração mudou o perfil enquanto a pessoa usava a plataforma
    await userEvent.click(screen.getByRole('link', { name: 'Avisos' }))

    expect(await screen.findByRole('link', { name: 'Meus avisos' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
  })
})

describe('contador de solicitações na barra lateral', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra quantas esperam decisão e atualiza ao trocar de página', async () => {
    let total = 7
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/me')
          ? new Response(JSON.stringify(me), { status: 200 })
          : url.includes('/gestao/solicitacoes')
            ? new Response(JSON.stringify({ items: [], total, limit: 1, offset: 0 }), { status: 200 })
            : new Response(null, { status: 204 }),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/painel']}>
        <SessaoProvider>
          <Routes>
            <Route element={<AreaGestao />}>
              <Route path="/painel" element={<p>painel</p>} />
              <Route path="/avisos" element={<p>avisos</p>} />
            </Route>
          </Routes>
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: 'Solicitações, 7 pendentes' })).toBeInTheDocument()

    total = 1
    await userEvent.click(screen.getByRole('link', { name: 'Avisos' }))
    expect(await screen.findByRole('link', { name: 'Solicitações, 1 pendente' })).toBeInTheDocument()
  })
})

describe('contador acompanha as decisões', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('decidir na fila atualiza o contador da barra lateral sem trocar de página', async () => {
    let pendentes = 3
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init: RequestInit) => {
        const u = url.replace('/api', '')
        if (u === '/me') return new Response(JSON.stringify(me), { status: 200 })
        if (u.includes('/aprovar')) {
          pendentes = 2
          return new Response(JSON.stringify({ ...solicitacao, status: 'aprovada', decidida_em: new Date().toISOString(), decidida_por: { id: 'c', nome: 'Maria' } }), { status: 200 })
        }
        if (u.startsWith('/gestao/solicitacoes')) {
          const itens = pendentes === 3 ? [solicitacao] : []
          return new Response(JSON.stringify({ items: u.includes('limit=1&') || u.endsWith('limit=1') ? [] : itens, total: pendentes, limit: 20, offset: 0 }), { status: 200 })
        }
        if (u.startsWith('/gestao/turmas')) return new Response(JSON.stringify({ items: [], total: 0, limit: 100, offset: 0 }), { status: 200 })
        void init
        return new Response(null, { status: 204 })
      }),
    )
    render(
      <MemoryRouter initialEntries={['/solicitacoes']}>
        <SessaoProvider>
          <Routes>
            <Route element={<AreaGestao />}>
              <Route path="/solicitacoes" element={<Solicitacoes />} />
            </Route>
          </Routes>
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: 'Solicitações, 3 pendentes' })).toBeInTheDocument()

    await userEvent.click(await screen.findByRole('button', { name: /^Aprovar/ }))

    expect(await screen.findByRole('link', { name: 'Solicitações, 2 pendentes' })).toBeInTheDocument()
  })

})

describe('contador resiste a uma falha momentânea', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('se a contagem falha, o número anterior fica (em vez de sumir)', async () => {
    let falhar = false
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.endsWith('/me')
          ? new Response(JSON.stringify(me), { status: 200 })
          : url.includes('/gestao/solicitacoes')
            ? falhar
              ? new Response(JSON.stringify(erro('ERRO_INTERNO')), { status: 503 })
              : new Response(JSON.stringify({ items: [], total: 4, limit: 1, offset: 0 }), { status: 200 })
            : new Response(null, { status: 204 }),
      ),
    )
    render(
      <MemoryRouter initialEntries={['/painel']}>
        <SessaoProvider>
          <Routes>
            <Route element={<AreaGestao />}>
              <Route path="/painel" element={<p>painel</p>} />
              <Route path="/avisos" element={<p>avisos</p>} />
            </Route>
          </Routes>
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('link', { name: 'Solicitações, 4 pendentes' })).toBeInTheDocument()
    falhar = true
    await userEvent.click(screen.getByRole('link', { name: 'Avisos' }))
    await screen.findByText('avisos')
    await waitFor(() =>
      expect(
        (vi.mocked(fetch).mock.calls as unknown as [string][]).filter(([u]) => u.includes('/gestao/solicitacoes')).length,
      ).toBe(2),
    )
    await new Promise((r) => setTimeout(r, 100))
    expect(screen.getByRole('link', { name: 'Solicitações, 4 pendentes' })).toBeInTheDocument()
  })
})
