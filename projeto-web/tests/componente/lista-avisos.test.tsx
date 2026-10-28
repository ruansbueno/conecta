import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ListaAvisos from '../../src/paginas/avisos/lista'
import { SessaoProvider } from '../../src/sessao/contexto'
import { avisoGestao, erro, me, meDocente, pagina, turma } from '../fixtures'

const futuro = new Date(Date.now() + 86_400_000).toISOString()
const AVISOS = [
  { ...avisoGestao, id: 'a1', titulo: 'Matrícula do 2º semestre', versao_atual: 1, editado_em: null },
  { ...avisoGestao, id: 'a2', titulo: 'Entrega adiada para 30/10', versao_atual: 2 },
]
const pessoa = (id: string, nome: string, perfil: string) => ({
  id,
  username: id,
  nome,
  perfil,
  ativo: true,
  ultimo_login_em: null,
})

type R = { status: number; corpo?: unknown }
type Chamada = { chave: string; query: URLSearchParams }

function api(rotas: Record<string, R | ((q: URLSearchParams) => R)> = {}, perfil: 'coordenacao' | 'docente' = 'coordenacao') {
  const chamadas: Chamada[] = []
  const base: Record<string, R | ((q: URLSearchParams) => R)> = {
    'GET /me': { status: 200, corpo: perfil === 'docente' ? meDocente : me },
    'GET /gestao/avisos': { status: 200, corpo: pagina(AVISOS, 2) },
    'GET /gestao/turmas': { status: 200, corpo: pagina([{ ...turma, id: 't1', nome: 'SI-3A' }]) },
    'GET /gestao/usuarios': (q) => ({
      status: 200,
      corpo: pagina(
        { coordenacao: [pessoa('u1', 'Marina Duarte', 'coordenacao')], docente: [pessoa('u2', 'Ricardo Lemos', 'docente')] }[
          q.get('perfil') ?? ''
        ] ?? [],
      ),
    }),
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
      const { status, corpo } = (typeof r === 'function' ? r(query) : r) ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

const listagens = (c: Chamada[]) => c.filter((x) => x.chave === 'GET /gestao/avisos').map((x) => x.query)

function Onde() {
  const { search } = useLocation()
  return <p data-testid="url">{search}</p>
}

function abrir(inicial: string | { pathname: string; state: unknown } = '/avisos') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <SessaoProvider>
        <Routes>
          <Route
            path="/avisos"
            element={
              <>
                <ListaAvisos />
                <Onde />
              </>
            }
          />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const tabela = () => screen.findByRole('table', { name: /Avisos/ })

describe('lista de avisos (T03, RW-13, RW-14)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('cada linha mostra título, versão, autor, destinos, publicação e situação', async () => {
    api()
    abrir()
    const linha = within(await tabela()).getByRole('row', { name: /Entrega adiada/ })
    expect(linha).toHaveTextContent('versão 2')
    expect(linha).toHaveTextContent('Maria Coordenadora')
    expect(within(linha).getByLabelText('Destino: TADS 3º Sem A')).toBeInTheDocument()
    expect(within(linha).getByText('Ativo')).toBeInTheDocument()
    expect(linha).toHaveTextContent(/\d{2}\/\d{2}, \d{2}:\d{2}/)
  })

  it('abre na aba Ativos e troca de aba pela URL, voltando à primeira página', async () => {
    const chamadas = api()
    abrir('/avisos?pagina=2')
    await tabela()
    expect(listagens(chamadas).at(-1)?.get('situacao')).toBe('ativo')

    await userEvent.click(screen.getByRole('tab', { name: 'Agendados' }))

    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('situacao')).toBe('agendado'))
    expect(listagens(chamadas).at(-1)?.get('offset')).toBe('0')
    expect(screen.getByTestId('url')).toHaveTextContent('?situacao=agendado')
  })

  it('selo "Agendado" vem de ativo com publicação futura (apresentação, não estado da API)', async () => {
    api({ 'GET /gestao/avisos': { status: 200, corpo: pagina([{ ...AVISOS[0], publicar_em: futuro }]) } })
    abrir('/avisos?situacao=agendado')
    const linha = within(await tabela()).getByRole('row', { name: /Matrícula/ })
    expect(within(linha).getByText('Agendado')).toBeInTheDocument()
  })

  it('busca, autor e turma viram filtros da API e ficam na URL', async () => {
    const chamadas = api()
    abrir()
    await tabela()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por título ou conteúdo' }), 'matrícula')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('q')).toBe('matrícula'))

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Autor' }), 'Ricardo Lemos')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('autor_id')).toBe('u2'))

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Turma' }), 'SI-3A')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('turma_id')).toBe('t1'))
    expect(screen.getByTestId('url')).toHaveTextContent('autor=u2')
  })

  it('paginação pela URL', async () => {
    const chamadas = api({ 'GET /gestao/avisos': { status: 200, corpo: pagina(AVISOS, 45) } })
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('button', { name: /Próxima/ }))

    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('offset')).toBe('20'))
    expect(screen.getByTestId('url')).toHaveTextContent('pagina=2')
  })

  it('docente não tem a aba Excluídos nem o filtro de autor', async () => {
    api({}, 'docente')
    abrir()
    await tabela()
    expect(screen.queryByRole('tab', { name: 'Excluídos' })).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Autor' })).not.toBeInTheDocument()
  })

  it('arquivar pela linha confirma, recarrega e informa', async () => {
    const chamadas = api({
      'POST /gestao/avisos/a2/arquivar': { status: 200, corpo: { ...AVISOS[1], situacao: 'arquivado' } },
    })
    abrir()
    const linha = within(await tabela()).getByRole('row', { name: /Entrega adiada/ })

    await userEvent.click(within(linha).getByRole('button', { name: 'Arquivar' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arquivar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Aviso arquivado.')
    expect(chamadas.map((c) => c.chave)).toContain('POST /gestao/avisos/a2/arquivar')
    await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
  })

  it('na aba Arquivados a ação é desarquivar, sem confirmação; não há editar', async () => {
    const arquivado = { ...AVISOS[0], situacao: 'arquivado' }
    const chamadas = api({
      'GET /gestao/avisos': { status: 200, corpo: pagina([arquivado]) },
      'POST /gestao/avisos/a1/desarquivar': { status: 200, corpo: AVISOS[0] },
    })
    abrir('/avisos?situacao=arquivado')
    const linha = within(await tabela()).getByRole('row', { name: /Matrícula/ })
    expect(within(linha).queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()

    await userEvent.click(within(linha).getByRole('button', { name: 'Desarquivar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Aviso desarquivado.')
    expect(chamadas.map((c) => c.chave)).toContain('POST /gestao/avisos/a1/desarquivar')
  })

  it('mensagem trazida de outra página (publicado, excluído) aparece uma vez', async () => {
    api()
    abrir({ pathname: '/avisos', state: { mensagem: 'Aviso publicado.' } })
    expect(await screen.findByRole('status')).toHaveTextContent('Aviso publicado.')
  })

  it('aba sem avisos mostra o estado vazio da aba', async () => {
    api({ 'GET /gestao/avisos': { status: 200, corpo: pagina([]) } })
    abrir('/avisos?situacao=arquivado')
    expect(await screen.findByText('Nenhum aviso arquivado')).toBeInTheDocument()
  })

  it('falha ao carregar permite tentar de novo', async () => {
    api({ 'GET /gestao/avisos': { status: 503, corpo: erro('ERRO_INTERNO') } })
    abrir()
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
