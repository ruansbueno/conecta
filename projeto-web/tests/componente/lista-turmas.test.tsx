import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ListaTurmas from '../../src/paginas/turmas/lista'
import { SessaoProvider } from '../../src/sessao/contexto'
import { erro, me, meDocente, pagina, turma } from '../fixtures'

const T1 = '00000000-0000-4000-8000-0000000000a1'
const TURMAS = [
  { ...turma, id: T1, codigo: 'SI-3A', nome: 'Sistemas para Internet 3A', total_alunos: 38, total_docentes: 4 },
  { ...turma, id: 'x2', codigo: 'SI-5A', nome: 'Sistemas para Internet 5A', semestre_curso: 5, inscricoes_abertas: false },
]

type R = { status: number; corpo?: unknown }
type Chamada = { chave: string; query: URLSearchParams; corpo?: unknown }

function api(rotas: Record<string, R> = {}, perfil: 'coordenacao' | 'docente' = 'coordenacao') {
  const chamadas: Chamada[] = []
  const base: Record<string, R> = {
    'GET /me': { status: 200, corpo: perfil === 'docente' ? meDocente : me },
    'GET /gestao/turmas': { status: 200, corpo: pagina(TURMAS) },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const chave = `${init.method} ${caminho}`
      chamadas.push({ chave, query: new URLSearchParams(busca), corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const { status, corpo } = base[chave] ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

const listagens = (c: Chamada[]) => c.filter((x) => x.chave === 'GET /gestao/turmas').map((x) => x.query)

function Onde() {
  const { pathname, search } = useLocation()
  return <p data-testid="url">{pathname + search}</p>
}

function abrir(inicial = '/turmas') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <SessaoProvider>
        <Routes>
          <Route
            path="/turmas"
            element={
              <>
                <ListaTurmas />
                <Onde />
              </>
            }
          />
          <Route path="/turmas/:id" element={<Onde />} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const tabela = () => screen.findByRole('table', { name: /Turmas/ })

describe('lista de turmas (T07, RW-23)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('cada linha mostra código, nome, semestre, período, totais, inscrições e situação', async () => {
    api()
    abrir()
    const linha = within(await tabela()).getByRole('row', { name: /SI-3A/ })
    for (const t of ['Sistemas para Internet 3A', '3º', '2026/2', '38', '4', 'Abertas', 'Ativa']) {
      expect(linha).toHaveTextContent(t)
    }
    expect(within(await tabela()).getByRole('row', { name: /SI-5A/ })).toHaveTextContent('Fechadas')
  })

  it('abas Ativas, Inativas e Todas viram o filtro ativa da API', async () => {
    const chamadas = api()
    abrir()
    await tabela()
    expect(listagens(chamadas).at(-1)?.get('ativa')).toBe('true')

    await userEvent.click(screen.getByRole('tab', { name: 'Inativas' }))
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('ativa')).toBe('false'))

    await userEvent.click(screen.getByRole('tab', { name: 'Todas' }))
    await waitFor(() => expect(listagens(chamadas).at(-1)?.has('ativa')).toBe(false))
    expect(screen.getByTestId('url')).toHaveTextContent('situacao=todas')
  })

  it('busca, semestre e período vão para a API e ficam na URL; período incompleto não vai', async () => {
    const chamadas = api()
    abrir()
    await tabela()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar turma pelo código ou nome' }), 'sistemas')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('q')).toBe('sistemas'))

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Semestre' }), '5º')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('semestre_curso')).toBe('5'))

    await userEvent.type(screen.getByRole('textbox', { name: 'Período letivo' }), '2026')
    await new Promise((r) => setTimeout(r, 400))
    expect(listagens(chamadas).at(-1)?.has('periodo_letivo')).toBe(false)
    await userEvent.type(screen.getByRole('textbox', { name: 'Período letivo' }), '/2')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('periodo_letivo')).toBe('2026/2'))
    expect(screen.getByTestId('url')).toHaveTextContent('semestre=5')
  })

  it('nova turma: cria, informa e recarrega a lista', async () => {
    const chamadas = api({ 'POST /gestao/turmas': { status: 201, corpo: TURMAS[0] } })
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('button', { name: 'Nova turma' }))
    const dialogo = screen.getByRole('dialog', { name: 'Nova turma' })
    await userEvent.type(within(dialogo).getByLabelText('Código'), 'SI-3A')
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'Sistemas para Internet 3A')
    await userEvent.selectOptions(within(dialogo).getByLabelText('Semestre do curso'), '3º')
    await userEvent.type(within(dialogo).getByLabelText('Período letivo'), '2026/2')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Criar turma' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Turma SI-3A criada.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === 'POST /gestao/turmas')?.corpo).toMatchObject({ codigo: 'SI-3A', semestre_curso: 3 })
    await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
  })

  it('editar pela linha abre o formulário preenchido e salva só o que mudou', async () => {
    const chamadas = api({ [`PATCH /gestao/turmas/${T1}`]: { status: 200, corpo: TURMAS[0] } })
    abrir()
    const linha = within(await tabela()).getByRole('row', { name: /SI-3A/ })

    await userEvent.click(within(linha).getByRole('button', { name: 'Editar SI-3A' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar turma' })
    await userEvent.clear(within(dialogo).getByLabelText('Nome'))
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'SI 3A noturno')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Turma SI-3A atualizada.')
    expect(chamadas.find((c) => c.chave === `PATCH /gestao/turmas/${T1}`)?.corpo).toEqual({ nome: 'SI 3A noturno' })
  })

  it('vínculos da linha leva ao detalhe da turma', async () => {
    api()
    abrir()
    const linha = within(await tabela()).getByRole('row', { name: /SI-3A/ })
    await userEvent.click(within(linha).getByRole('link', { name: 'Vínculos de SI-3A' }))
    expect(screen.getByTestId('url')).toHaveTextContent(`/turmas/${T1}`)
  })

  it('docente vê "Minhas turmas" só para leitura', async () => {
    api({}, 'docente')
    abrir()
    const linha = within(await tabela()).getByRole('row', { name: /SI-3A/ })
    expect(screen.getByRole('heading', { level: 1, name: 'Minhas turmas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Nova turma' })).not.toBeInTheDocument()
    expect(within(linha).queryByRole('button', { name: /^Editar/ })).not.toBeInTheDocument()
    expect(within(linha).getByRole('link', { name: 'Vínculos de SI-3A' })).toBeInTheDocument()
  })

  it('aba sem turmas mostra o estado vazio; falha permite tentar de novo', async () => {
    api({ 'GET /gestao/turmas': { status: 200, corpo: pagina([]) } })
    abrir('/turmas?situacao=inativas')
    expect(await screen.findByText('Nenhuma turma inativa')).toBeInTheDocument()
  })

  it('falha ao carregar permite tentar de novo', async () => {
    api({ 'GET /gestao/turmas': { status: 503, corpo: erro('ERRO_INTERNO') } })
    abrir()
    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
