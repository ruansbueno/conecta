// Pedidos de acesso de servidores (emenda v2.3 da API; RW-50, RW-51): aba "Aguardando acesso" em
// Usuários. A administração aprova com qualquer perfil e libera recusados; a coordenação aprova só
// pendentes, com docente ou coordenação. Ambas recusam pendentes.
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import AreaGestao from '../../src/paginas/area-gestao'
import Usuarios from '../../src/paginas/usuarios'
import { SessaoProvider } from '../../src/sessao/contexto'
import { ExigirSessao } from '../../src/sessao/exigir-sessao'
import { erro, me, meAdmin, pagina } from '../fixtures'

const pedido = (id: string, nome: string, username: string, extra: object = {}) => ({
  id,
  username,
  nome,
  email: `${username}@ifsul.edu.br`,
  tipo_institucional: 'administrativo',
  situacao: 'pendente',
  solicitado_em: new Date(Date.now() - 20_000).toISOString(),
  decidido_em: null,
  decidido_por: null,
  ...extra,
})
const PENDENTES = [pedido('a1', 'Fulano Servidor', 'fulano.servidor'), pedido('a2', 'Beltrana Técnica', 'beltrana.tec')]
const RECUSADO = pedido('a3', 'Ciclano Recusado', 'ciclano.r', {
  situacao: 'recusado',
  decidido_em: '2026-11-05T12:00:00Z',
  decidido_por: { id: 'x', nome: 'Maria Coordenadora' },
})

type R = { status: number; corpo?: unknown }
type Chamada = { chave: string; query: URLSearchParams; corpo?: unknown }

function api(rotas: Record<string, R | R[]> = {}, sessao: object = meAdmin) {
  const chamadas: Chamada[] = []
  const base: Record<string, R | R[]> = {
    'GET /me': { status: 200, corpo: sessao },
    'GET /gestao/usuarios': { status: 200, corpo: pagina([]) },
    'GET /gestao/solicitacoes': { status: 200, corpo: pagina([]) },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const query = new URLSearchParams(busca)
      let chave = `${init.method} ${caminho}`
      if (chave === 'GET /gestao/acessos' && query.get('situacao') === 'recusado') chave += '?recusado'
      chamadas.push({ chave, query, corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const r = base[chave]
      const atual = Array.isArray(r) ? (r.length > 1 ? r.shift()! : r[0]) : r
      const { status, corpo } = atual ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

function abrir(inicial = '/usuarios?aba=aguardando') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <SessaoProvider>
        <Routes>
          {/* Como em src/rotas.tsx: Usuários fica atrás da guarda de perfil, dentro da área de gestão. */}
          <Route element={<AreaGestao />}>
            <Route element={<ExigirSessao perfis={['administrador', 'coordenacao']} />}>
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
            <Route path="/painel" element={<p>painel</p>} />
          </Route>
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const tabela = () => screen.findByRole('table', { name: /Pedidos de acesso/ })
const linha = async (nome: RegExp) => within(await tabela()).getByRole('row', { name: nome })

describe('aguardando acesso (RW-50, RW-51)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('lista os pedidos pendentes com nome, login, e-mail e quando pediram', async () => {
    const chamadas = api({ 'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) } })
    abrir()

    const fulano = await linha(/Fulano Servidor/)
    expect(fulano).toHaveTextContent('fulano.servidor')
    expect(fulano).toHaveTextContent('fulano.servidor@ifsul.edu.br')
    expect(fulano).toHaveTextContent('agora')
    expect(chamadas.find((c) => c.chave === 'GET /gestao/acessos')?.query.get('situacao')).toBe('pendente')
    expect(screen.getByRole('tab', { name: 'Aguardando acesso', selected: true })).toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('administração aprova escolhendo qualquer um dos quatro perfis', async () => {
    const chamadas = api({
      'GET /gestao/acessos': [
        { status: 200, corpo: pagina(PENDENTES) },
        { status: 200, corpo: pagina([PENDENTES[1]]) },
      ],
      'POST /gestao/acessos/a1/aprovar': {
        status: 200,
        corpo: { ...PENDENTES[0], situacao: 'liberado', perfil: 'docente' },
      },
    })
    abrir()

    await userEvent.click(within(await linha(/Fulano Servidor/)).getByRole('button', { name: /Aprovar/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Liberar acesso' })
    const opcoes = within(dialogo).getAllByRole('radio').map((r) => r.getAttribute('value'))
    expect(opcoes).toEqual(['administrador', 'coordenacao', 'docente', 'aluno'])
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Docente' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Liberar acesso' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Fulano Servidor agora tem acesso como Docente.')
    expect(chamadas.find((c) => c.chave === 'POST /gestao/acessos/a1/aprovar')?.corpo).toEqual({ perfil: 'docente' })
    await waitFor(() => expect(screen.queryByRole('row', { name: /Fulano Servidor/ })).not.toBeInTheDocument())
  })

  it('depois de liberar, o contador de Usuários baixa (mesmo atrás da guarda de perfil)', async () => {
    api({
      'GET /gestao/acessos': [
        { status: 200, corpo: pagina(PENDENTES) }, // contador da barra
        { status: 200, corpo: pagina(PENDENTES) }, // lista
        { status: 200, corpo: pagina([PENDENTES[1]]) },
      ],
      'POST /gestao/acessos/a1/aprovar': {
        status: 200,
        corpo: { ...PENDENTES[0], situacao: 'liberado', perfil: 'docente' },
      },
    })
    abrir()
    expect(await screen.findByRole('link', { name: 'Usuários 2 pendentes' })).toBeInTheDocument()

    await userEvent.click(within(await linha(/Fulano Servidor/)).getByRole('button', { name: /Aprovar/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Liberar acesso' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Liberar acesso' }))

    expect(await screen.findByRole('link', { name: 'Usuários 1 pendente' })).toBeInTheDocument()
  })

  it('coordenação só concede docente ou coordenação', async () => {
    api({ 'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) } }, me)
    abrir()

    await userEvent.click(within(await linha(/Fulano Servidor/)).getByRole('button', { name: /Aprovar/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Liberar acesso' })

    expect(within(dialogo).getAllByRole('radio').map((r) => r.getAttribute('value'))).toEqual(['coordenacao', 'docente'])
    expect(within(dialogo).getByText(/Só a administração concede o perfil de administrador/)).toBeInTheDocument()
  })

  it('recusar pede confirmação e explica a consequência', async () => {
    const chamadas = api({
      'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) },
      'POST /gestao/acessos/a2/recusar': { status: 200, corpo: { ...PENDENTES[1], situacao: 'recusado' } },
    })
    abrir()

    await userEvent.click(within(await linha(/Beltrana Técnica/)).getByRole('button', { name: /Recusar/ }))
    const confirmacao = await screen.findByRole('alertdialog', { name: 'Recusar o acesso de Beltrana Técnica?' })
    expect(confirmacao).toHaveTextContent('o login passa a ser recusado')
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Recusar acesso' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Pedido de acesso de Beltrana Técnica recusado.')
    expect(chamadas.some((c) => c.chave === 'POST /gestao/acessos/a2/recusar')).toBe(true)
  })

  it('recusados: a administração ainda libera; não há como recusar de novo', async () => {
    const chamadas = api({
      'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) },
      'GET /gestao/acessos?recusado': { status: 200, corpo: pagina([RECUSADO]) },
    })
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('radio', { name: 'Recusados' }))

    const ciclano = await linha(/Ciclano Recusado/)
    expect(ciclano).toHaveTextContent('Recusado por Maria Coordenadora')
    expect(within(ciclano).getByRole('button', { name: /Aprovar/ })).toBeInTheDocument()
    expect(within(ciclano).queryByRole('button', { name: /Recusar/ })).not.toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === 'GET /gestao/acessos?recusado')).toBe(true)
  })

  it('recusados: a coordenação só consulta', async () => {
    api(
      {
        'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) },
        'GET /gestao/acessos?recusado': { status: 200, corpo: pagina([RECUSADO]) },
      },
      me,
    )
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('radio', { name: 'Recusados' }))

    const ciclano = await linha(/Ciclano Recusado/)
    expect(within(ciclano).queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText(/Só a administração libera um acesso recusado/)).toBeInTheDocument()
  })

  it('pedido já decidido por outra pessoa: avisa e recarrega a lista', async () => {
    const chamadas = api({
      'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) },
      'POST /gestao/acessos/a1/aprovar': { status: 409, corpo: erro('ACESSO_JA_DECIDIDO') },
    })
    abrir()

    await userEvent.click(within(await linha(/Fulano Servidor/)).getByRole('button', { name: /Aprovar/ }))
    const dialogo = await screen.findByRole('dialog', { name: 'Liberar acesso' })
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Liberar acesso' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Este pedido de acesso já foi decidido.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(chamadas.filter((c) => c.chave === 'GET /gestao/acessos').length).toBeGreaterThanOrEqual(2)
  })

  it('recusar um pedido que outra pessoa já decidiu: aviso informativo, não erro', async () => {
    api({
      'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) },
      'POST /gestao/acessos/a2/recusar': { status: 409, corpo: erro('ACESSO_JA_DECIDIDO') },
    })
    abrir()

    await userEvent.click(within(await linha(/Beltrana Técnica/)).getByRole('button', { name: /Recusar/ }))
    const confirmacao = await screen.findByRole('alertdialog')
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Recusar acesso' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Este pedido de acesso já foi decidido.')
  })

  it('sem pedidos: estado vazio que explica de onde eles vêm', async () => {
    api({ 'GET /gestao/acessos': { status: 200, corpo: pagina([]) } })
    abrir()

    expect(await screen.findByText('Nenhum pedido de acesso')).toBeInTheDocument()
    expect(screen.getByText(/servidores que entram pela primeira vez/)).toBeInTheDocument()
  })

  it('contador de pedidos pendentes em Usuários, para administração e coordenação', async () => {
    api({ 'GET /gestao/acessos': { status: 200, corpo: pagina(PENDENTES) } }, me)
    abrir('/painel')

    expect(await screen.findByRole('link', { name: 'Usuários 2 pendentes' })).toBeInTheDocument()
  })
})
