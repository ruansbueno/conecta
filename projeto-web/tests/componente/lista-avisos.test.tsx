import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ListaAvisos from '../../src/paginas/avisos/lista'
import { SessaoProvider } from '../../src/sessao/contexto'
import { avisoGestao, erro, me, meDocente, pagina, turma } from '../fixtures'

const futuro = new Date(Date.now() + 86_400_000).toISOString()
const AVISOS = [
  { ...avisoGestao, id: 'a1', titulo: 'Matrícula do 2º semestre', versao_atual: 1, editado_em: null },
  { ...avisoGestao, id: 'a2', titulo: 'Entrega adiada para 30/10', versao_atual: 2 },
]
const T1 = '00000000-0000-4000-8000-0000000000a1'
const U1 = '00000000-0000-4000-8000-0000000000b1'
const U2 = '00000000-0000-4000-8000-0000000000b2'
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
    'GET /gestao/turmas': { status: 200, corpo: pagina([{ ...turma, id: T1, nome: 'SI-3A' }]) },
    'GET /gestao/usuarios': (q) => ({
      status: 200,
      corpo: pagina(
        { coordenacao: [pessoa(U1, 'Marina Duarte', 'coordenacao')], docente: [pessoa(U2, 'Ricardo Lemos', 'docente')] }[
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
  const navegar = useNavigate()
  return (
    <>
      <p data-testid="url">{search}</p>
      <Link to="/avisos">ir para avisos sem filtro</Link>
      <button type="button" onClick={() => navegar(-1)}>
        voltar no navegador
      </button>
    </>
  )
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
    expect(within(linha).getByText('TADS 3º Sem A').parentElement).toHaveTextContent('Destino: TADS 3º Sem A')
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
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('autor_id')).toBe(U2))

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Turma' }), 'SI-3A')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('turma_id')).toBe(T1))
    expect(screen.getByTestId('url')).toHaveTextContent(`autor=${U2}`)
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

    await userEvent.click(within(linha).getByRole('button', { name: 'Arquivar “Entrega adiada para 30/10”' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arquivar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Aviso arquivado.')
    // A linha some ao recarregar: o foco vai para a mensagem, e não cai no corpo da página.
    expect(screen.getByRole('status')).toHaveFocus()
    expect(chamadas.map((c) => c.chave)).toContain('POST /gestao/avisos/a2/arquivar')
    await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
  })

  it('arquivar um aviso que outra pessoa excluiu enquanto a lista estava aberta: avisa e recarrega', async () => {
    // A API responde 404 para arquivar ou desarquivar um aviso excluído (emenda v2.4).
    const chamadas = api({
      'POST /gestao/avisos/a2/arquivar': { status: 404, corpo: erro('AVISO_NAO_ENCONTRADO') },
    })
    abrir()
    const linha = within(await tabela()).getByRole('row', { name: /Entrega adiada/ })

    await userEvent.click(within(linha).getByRole('button', { name: 'Arquivar “Entrega adiada para 30/10”' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arquivar' }))

    expect(await screen.findByText('Este aviso não está mais disponível.')).toBeInTheDocument()
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
    expect(within(linha).queryByRole('link', { name: /^Editar/ })).not.toBeInTheDocument()

    await userEvent.click(within(linha).getByRole('button', { name: 'Desarquivar “Matrícula do 2º semestre”' }))

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

  describe('URL como fonte da verdade', () => {
    const UUID = '7d3c2f1e-0000-4000-8000-000000000001'

    it('busca acompanha a URL quando ela muda por fora (link, voltar)', async () => {
      const chamadas = api()
      abrir('/avisos?q=prova')
      await tabela()
      expect(screen.getByRole('searchbox', { name: 'Buscar por título ou conteúdo' })).toHaveValue('prova')

      await userEvent.click(screen.getByRole('link', { name: 'ir para avisos sem filtro' }))

      expect(screen.getByRole('searchbox', { name: 'Buscar por título ou conteúdo' })).toHaveValue('')
      await new Promise((r) => setTimeout(r, 450))
      expect(screen.getByTestId('url')).toBeEmptyDOMElement()
      expect(listagens(chamadas).at(-1)?.get('q')).toBeNull()
    })

    it('página além do fim (depois de arquivar a última linha) volta para a última página com avisos', async () => {
      const chamadas = api({
        'GET /gestao/avisos': (q) => ({ status: 200, corpo: { ...pagina(q.get('offset') === '0' ? AVISOS : []), total: 20 } }),
      })
      abrir('/avisos?pagina=2')

      await waitFor(() => expect(listagens(chamadas).at(-1)?.get('offset')).toBe('0'))
      expect(await screen.findByRole('row', { name: /Entrega adiada/ })).toBeInTheDocument()
      expect(screen.queryByText('Nenhum aviso ativo')).not.toBeInTheDocument()
    })

    it('parâmetros inválidos não vão à API; página fracionária é truncada', async () => {
      const chamadas = api()
      abrir('/avisos?turma=abc&autor=xyz&pagina=1.5')
      await tabela()
      const q = listagens(chamadas).at(-1)!
      expect(q.get('turma_id')).toBeNull()
      expect(q.get('autor_id')).toBeNull()
      expect(q.get('offset')).toBe('0')
      expect(screen.getByRole('searchbox', { name: 'Buscar por título ou conteúdo' })).toHaveAttribute('maxlength', '100')
    })

    it('filtro que a API recusa (turma apagada) oferece limpar os filtros', async () => {
      api({
        'GET /gestao/avisos': (q) =>
          q.get('turma_id') ? { status: 404, corpo: erro('TURMA_NAO_ENCONTRADA') } : { status: 200, corpo: pagina(AVISOS) },
      })
      abrir(`/avisos?turma=${UUID}`)

      await userEvent.click(await screen.findByRole('button', { name: 'Limpar filtros' }))

      expect(await tabela()).toBeInTheDocument()
      expect(screen.getByTestId('url')).toBeEmptyDOMElement()
    })

    it('docente: autor na URL é ignorado (não há filtro de autor para ele)', async () => {
      const chamadas = api({}, 'docente')
      abrir(`/avisos?autor=${UUID}`)
      await tabela()
      expect(listagens(chamadas).at(-1)?.get('autor_id')).toBeNull()
    })
  })

  it('clique duplo em desarquivar envia uma vez só', async () => {
    let liberar: () => void = () => undefined
    const chamadas = api({ 'GET /gestao/avisos': { status: 200, corpo: pagina([{ ...AVISOS[0], situacao: 'arquivado' }]) } })
    const original = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) =>
        url.includes('desarquivar')
          ? (chamadas.push({ chave: 'POST desarquivar', query: new URLSearchParams() }),
            new Promise<Response>((r) => (liberar = () => r(new Response(JSON.stringify(AVISOS[0]), { status: 200 })))))
          : original(url, init),
      ),
    )
    abrir('/avisos?situacao=arquivado')
    const botao = within(await tabela()).getByRole('button', { name: /^Desarquivar/ })

    await userEvent.dblClick(botao)
    liberar()

    expect(await screen.findByText('Aviso desarquivado.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.chave === 'POST desarquivar')).toHaveLength(1)
  })

  it('ao trocar de aba, a tabela antiga sai e aparece o carregando (sem linhas de outra aba sob o título novo)', async () => {
    let liberar: () => void = () => undefined
    api({
      'GET /gestao/avisos': (q) =>
        q.get('situacao') === 'arquivado'
          ? ({ status: 200, corpo: pagina([]) } as R)
          : { status: 200, corpo: pagina(AVISOS, 2) },
    })
    const base = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) =>
        url.includes('situacao=arquivado')
          ? new Promise<Response>((r) => (liberar = () => r(new Response(JSON.stringify(pagina([])), { status: 200 }))))
          : base(url, init),
      ),
    )
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('tab', { name: 'Arquivados' }))

    expect(screen.queryByRole('row', { name: /Entrega adiada/ })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Carregando os avisos' })).toBeInTheDocument()
    liberar()
    expect(await screen.findByText('Nenhum aviso arquivado')).toBeInTheDocument()
  })

  it('a mensagem de uma ação some quando a pessoa muda a busca, a aba ou a página', async () => {
    api({ 'POST /gestao/avisos/a2/arquivar': { status: 200, corpo: { ...AVISOS[1], situacao: 'arquivado' } } })
    abrir()
    const linhaAviso = within(await tabela()).getByRole('row', { name: /Entrega adiada/ })
    await userEvent.click(within(linhaAviso).getByRole('button', { name: /^Arquivar/ }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arquivar' }))
    expect(await screen.findByText('Aviso arquivado.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Agendados' }))

    await waitFor(() => expect(screen.queryByText('Aviso arquivado.')).not.toBeInTheDocument())
  })

  it('arquivar a última linha da última página: a lista vai para a página anterior e a mensagem fica', async () => {
    let arquivou = false
    api({
      'GET /gestao/avisos': (q) =>
        !arquivou
          ? { status: 200, corpo: { ...pagina([AVISOS[1]]), total: 21, offset: 20 } }
          : q.get('offset') === '20'
            ? { status: 200, corpo: { ...pagina([]), total: 20 } }
            : { status: 200, corpo: { ...pagina([AVISOS[0]]), total: 20 } },
      'POST /gestao/avisos/a2/arquivar': (() => {
        arquivou = true
        return { status: 200, corpo: { ...AVISOS[1], situacao: 'arquivado' } }
      }) as unknown as R,
    })
    abrir('/avisos?pagina=2')
    const linhaAviso = within(await tabela()).getByRole('row', { name: /Entrega adiada/ })
    await userEvent.click(within(linhaAviso).getByRole('button', { name: /^Arquivar/ }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arquivar' }))

    expect(await screen.findByRole('row', { name: /Matrícula/ })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Aviso arquivado.')
  })

  it('voltar no navegador não traz de volta a mensagem de uma ação antiga', async () => {
    api({ 'POST /gestao/avisos/a2/arquivar': { status: 200, corpo: { ...AVISOS[1], situacao: 'arquivado' } } })
    abrir()
    const linhaAviso = within(await tabela()).getByRole('row', { name: /Entrega adiada/ })
    await userEvent.click(within(linhaAviso).getByRole('button', { name: /^Arquivar/ }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arquivar' }))
    await screen.findByText('Aviso arquivado.')

    await userEvent.click(screen.getByRole('tab', { name: 'Agendados' }))
    await waitFor(() => expect(screen.queryByText('Aviso arquivado.')).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'voltar no navegador' }))

    await tabela()
    expect(screen.queryByText('Aviso arquivado.')).not.toBeInTheDocument()
  })

  it('tentar de novo depois de uma falha mostra o carregando', async () => {
    let liberar: () => void = () => undefined
    let vezes = 0
    api({ 'GET /gestao/avisos': { status: 503, corpo: erro('ERRO_INTERNO') } })
    const base = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) =>
        url.includes('/gestao/avisos?') && vezes++ >= 1
          ? new Promise<Response>((r) => (liberar = () => r(new Response(JSON.stringify(pagina(AVISOS)), { status: 200 }))))
          : base(url, init),
      ),
    )
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    expect(screen.getByRole('status', { name: 'Carregando os avisos' })).toBeInTheDocument()
    liberar()
    expect(await tabela()).toBeInTheDocument()
  })
})
