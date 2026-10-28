import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Painel from '../../src/paginas/painel'
import { SessaoProvider } from '../../src/sessao/contexto'
import { avisoGestao, erro, me, meDocente, pagina, solicitacao, turma } from '../fixtures'

type R = { status: number; corpo?: unknown }
type Responder = (q: URLSearchParams) => R

const AVISOS = [
  { ...avisoGestao, id: 'a1', titulo: 'Matrícula do 2º semestre' },
  { ...avisoGestao, id: 'a2', titulo: 'Semana Acadêmica', publicar_em: new Date(Date.now() + 86_400_000).toISOString() },
]
const TURMAS = [
  { ...turma, id: 't1', codigo: 'SI-3A', nome: 'Sistemas para Internet 3A', total_alunos: 38 },
  { ...turma, id: 't2', codigo: 'SI-4A', nome: 'Sistemas para Internet 4A', total_alunos: 31 },
]
const PENDENTES = [
  { ...solicitacao, id: 's1', turma: { id: 't1', codigo: 'SI-3A', nome: 'Sistemas para Internet 3A' } },
  { ...solicitacao, id: 's2', aluno: { id: 'a2', username: 'caio', nome: 'Caio Ribeiro' }, turma: { id: 't1', codigo: 'SI-3A', nome: 'Sistemas para Internet 3A' } },
]

function api(rotas: Record<string, Responder> = {}, sessao: object = me) {
  const chamadas: { chave: string; query: URLSearchParams }[] = []
  const base: Record<string, Responder> = {
    'GET /me': () => ({ status: 200, corpo: sessao }),
    'GET /gestao/avisos': (q) => {
      if (q.get('limit') === '1') return { status: 200, corpo: { ...pagina([]), total: q.get('situacao') === 'agendado' ? 1 : 1248 } }
      return { status: 200, corpo: pagina(AVISOS) }
    },
    'GET /gestao/solicitacoes': () => ({ status: 200, corpo: { ...pagina(PENDENTES), total: 7 } }),
    'GET /gestao/turmas': (q) => (q.get('limit') === '1' ? { status: 200, corpo: { ...pagina([]), total: 12 } } : { status: 200, corpo: pagina(TURMAS) }),
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const chave = `${init.method} ${caminho}`
      const query = new URLSearchParams(busca)
      chamadas.push({ chave, query })
      const r = base[chave]
      const { status, corpo } = r ? r(query) : { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

function abrir() {
  render(
    <MemoryRouter>
      <SessaoProvider>
        <Painel />
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const cartao = (nome: string) => screen.findByRole('region', { name: nome })

describe('painel da coordenação (T02)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('números vêm do total de cada lista, sem endpoint de resumo', async () => {
    const chamadas = api()
    abrir()
    expect(await screen.findByRole('heading', { level: 1, name: /Maria/ })).toBeInTheDocument()
    expect(await cartao('Avisos ativos')).toHaveTextContent('1.248')
    expect(await cartao('Avisos agendados')).toHaveTextContent('1')
    expect(await cartao('Solicitações pendentes')).toHaveTextContent('7')
    expect(await cartao('Turmas ativas')).toHaveTextContent('12')
    const q = (filtro: (x: URLSearchParams) => boolean, chave: string) => chamadas.filter((c) => c.chave === chave).some((c) => filtro(c.query))
    expect(q((x) => x.get('situacao') === 'ativo' && x.get('limit') === '1', 'GET /gestao/avisos')).toBe(true)
    expect(q((x) => x.get('situacao') === 'agendado' && x.get('limit') === '1', 'GET /gestao/avisos')).toBe(true)
    expect(q((x) => x.get('ativa') === 'true' && x.get('limit') === '1', 'GET /gestao/turmas')).toBe(true)
    expect(screen.getByText('1.248 avisos ativos e 7 solicitações esperando decisão.')).toBeInTheDocument()
  })

  it('publicados recentemente e solicitações pendentes, com atalho para cada lista', async () => {
    api()
    abrir()
    // Inclui agendados e arquivados: o título não promete só publicados.
    const recentes = await cartao('Avisos recentes')
    expect(await within(recentes).findByText('Matrícula do 2º semestre')).toBeInTheDocument()
    expect(within(recentes).getByText('Agendado')).toBeInTheDocument()
    expect(within(recentes).getByText('Semana Acadêmica').closest('li')).toHaveTextContent(/vai ao ar em \d{2}\/\d{2}, \d{2}:\d{2}/)
    expect(within(recentes).getByRole('link', { name: 'Ver todos os avisos' })).toHaveAttribute('href', '/avisos')

    const fila = await cartao('Solicitações de inscrição')
    expect(await within(fila).findByText('Júlia Santos')).toBeInTheDocument()
    expect(within(fila).getByRole('link', { name: 'Decidir na fila' })).toHaveAttribute('href', '/solicitacoes')
  })

  it('falha de uma chamada fica no seu bloco, com tentar de novo; os outros aparecem', async () => {
    let falhar = true
    api({
      'GET /gestao/solicitacoes': () => (falhar ? { status: 503, corpo: erro('ERRO_INTERNO') } : { status: 200, corpo: { ...pagina(PENDENTES), total: 7 } }),
    })
    abrir()
    const fila = await cartao('Solicitações de inscrição')
    const repetir = await within(fila).findByRole('button', { name: 'Tentar de novo' })
    expect(await cartao('Avisos ativos')).toHaveTextContent('1.248')
    expect(await cartao('Turmas ativas')).toHaveTextContent('12')

    falhar = false
    await userEvent.click(repetir)
    expect(await within(fila).findByText('Júlia Santos')).toBeInTheDocument()
  })
})

describe('falhas no painel (D13, RW-37)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('número que não carregou diz por quê, além de oferecer tentar de novo', async () => {
    api({
      'GET /gestao/avisos': (q) =>
        q.get('situacao') === 'agendado' ? { status: 503, corpo: erro('ERRO_INTERNO') } : { status: 200, corpo: { ...pagina(AVISOS), total: 4 } },
    })
    abrir()
    const agendados = await cartao('Avisos agendados')
    expect(await within(agendados).findByRole('alert')).toHaveTextContent('Não foi possível carregar.')
    expect(within(agendados).getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('tentar de novo mostra que está carregando (e a nova falha é anunciada de novo)', async () => {
    let liberar: () => void = () => undefined
    let tentativas = 0
    api({
      'GET /gestao/solicitacoes': () => ({ status: 503, corpo: erro('ERRO_INTERNO') }),
    })
    const base = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) => {
        if (url.includes('/gestao/solicitacoes') && tentativas++ >= 1) {
          return new Promise<Response>((r) => (liberar = () => r(new Response(JSON.stringify(erro('ERRO_INTERNO')), { status: 503 }))))
        }
        return base(url, init)
      }),
    )
    abrir()
    const fila = await cartao('Solicitações de inscrição')
    await userEvent.click(await within(fila).findByRole('button', { name: 'Tentar de novo' }))

    expect(within(fila).getByRole('status')).toHaveTextContent('Carregando')
    await act(async () => liberar())
    expect(await within(fila).findByRole('alert')).toBeInTheDocument()
  })
})

describe('painel do docente (T14)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('minhas turmas com as pendências de cada uma, meus avisos e o que o perfil permite', async () => {
    api({}, meDocente)
    abrir()
    expect(await screen.findByText('Você leciona em 2 turmas. Pode publicar avisos e decidir solicitações apenas nelas.')).toBeInTheDocument()

    const turmas = await cartao('Minhas turmas')
    const item = (nome: string) => within(turmas).getByRole('link', { name: nome }).closest('li')
    await waitFor(() => expect(item('Sistemas para Internet 3A')).toHaveTextContent('2 solicitações'))
    expect(item('Sistemas para Internet 4A')).toHaveTextContent('sem pendências')

    expect(await within(await cartao('Meus avisos')).findByText('Matrícula do 2º semestre')).toBeInTheDocument()
    expect(within(await cartao('Solicitações das minhas turmas')).getByText(/7 pendentes/)).toBeInTheDocument()

    const permite = await cartao('O que seu perfil permite')
    expect(permite).toHaveTextContent('Publicar para suas turmas')
    expect(permite).toHaveTextContent('Publicar para todos ou por semestre')
    expect(screen.queryByRole('region', { name: 'Turmas ativas' })).not.toBeInTheDocument()
  })

  it('a mensagem trazida pega o foco uma vez só (não a cada nova renderização)', async () => {
    api()
    render(
      <MemoryRouter initialEntries={[{ pathname: '/painel', state: { mensagem: 'Seu perfil agora é Docente.' } }]}>
        <SessaoProvider>
          <Painel />
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByText('Seu perfil agora é Docente.')).toHaveFocus()
    const novo = screen.getByRole('link', { name: 'Novo aviso' })
    novo.focus()

    // A aba volta ao foco: a sessão é relida e o painel renderiza de novo.
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    await new Promise((r) => setTimeout(r, 50))

    expect(novo).toHaveFocus()
  })
})
