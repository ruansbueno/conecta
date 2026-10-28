import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Solicitacoes from '../../src/paginas/solicitacoes'
import { SessaoProvider } from '../../src/sessao/contexto'
import { erro, me, pagina, solicitacao, turma } from '../fixtures'

const dias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
const T1 = turma.id
const PENDENTES = [
  { ...solicitacao, id: 's1', solicitada_em: dias(5) },
  {
    ...solicitacao,
    id: 's2',
    aluno: { id: 'a2', username: 'caio.ribeiro', nome: 'Caio Ribeiro' },
    turma: { id: 't2', codigo: 'SI-4A', nome: 'Sistemas para Internet 4A' },
    solicitada_em: dias(1),
  },
]
const decidida = (status: string, extra: object = {}) => ({
  ...PENDENTES[0],
  status,
  decidida_em: new Date().toISOString(),
  decidida_por: { id: 'c1', nome: 'Maria Coordenadora' },
  ...extra,
})

type R = { status: number; corpo?: unknown }
type Chamada = { chave: string; query: URLSearchParams; corpo?: unknown }

function api(rotas: Record<string, R | ((q: URLSearchParams) => R)> = {}) {
  const chamadas: Chamada[] = []
  const base: Record<string, R | ((q: URLSearchParams) => R)> = {
    'GET /me': { status: 200, corpo: me },
    'GET /gestao/solicitacoes': (q) =>
      q.get('limit') === '1'
        ? { status: 200, corpo: { ...pagina([PENDENTES[0]]), total: 7 } }
        : { status: 200, corpo: pagina(q.get('status') === 'pendente' ? PENDENTES : []) },
    'GET /gestao/turmas': { status: 200, corpo: pagina([turma]) },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const chave = `${init.method} ${caminho}`
      const query = new URLSearchParams(busca)
      chamadas.push({ chave, query, corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const r = base[chave]
      const { status, corpo } = (typeof r === 'function' ? r(query) : r) ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

const listagens = (c: Chamada[]) => c.filter((x) => x.chave === 'GET /gestao/solicitacoes' && x.query.get('limit') !== '1').map((x) => x.query)

function Onde() {
  const { search } = useLocation()
  return <p data-testid="url">{search}</p>
}

function abrir(inicial = '/solicitacoes') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <SessaoProvider>
        <Routes>
          <Route
            path="/solicitacoes"
            element={
              <>
                <Solicitacoes />
                <Onde />
              </>
            }
          />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const tabela = () => screen.findByRole('table', { name: /Solicitações/ })
const linha = async (nome: RegExp) => within(await tabela()).getByRole('row', { name: nome })

describe('fila de solicitações (T09, RW-28)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('pendentes por padrão, da mais antiga para a mais nova, com o total na aba', async () => {
    const chamadas = api()
    abrir()
    const julia = await linha(/Júlia Santos/)
    expect(julia).toHaveTextContent('julia.santos')
    expect(julia).toHaveTextContent('Sistemas para Internet 3A')
    expect(julia).toHaveTextContent(/\d{2}\/\d{2}, \d{2}:\d{2}/)
    expect(listagens(chamadas)[0].get('status')).toBe('pendente')
    expect(await screen.findByRole('tab', { name: 'Pendentes (7)' })).toBeInTheDocument()
  })

  it('destaca quem espera há mais de 3 dias', async () => {
    api()
    abrir()
    expect(await linha(/Júlia Santos/)).toHaveTextContent('há 5 dias')
    expect(await linha(/Caio Ribeiro/)).not.toHaveTextContent(/há \d+ dias/)
    expect(screen.getByText('1 solicitação esperando há mais de 3 dias')).toBeInTheDocument()
  })

  it('abas de status e filtro de turma vão para a API e para a URL', async () => {
    const chamadas = api()
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('tab', { name: 'Recusadas' }))
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('status')).toBe('recusada'))

    await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Turma' }), turma.nome)
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('turma_id')).toBe(T1))
    expect(screen.getByTestId('url')).toHaveTextContent(`status=recusada`)
    expect(screen.getByTestId('url')).toHaveTextContent(`turma=${T1}`)
  })

  it('decididas mostram quem decidiu, quando e o motivo; canceladas, que o aluno cancelou', async () => {
    api({
      'GET /gestao/solicitacoes': (q) =>
        q.get('limit') === '1'
          ? { status: 200, corpo: pagina([]) }
          : {
              status: 200,
              corpo: pagina<object>(
                q.get('status') === 'recusada'
                  ? [decidida('recusada', { motivo_recusa: 'turma sem vagas' })]
                  : q.get('status') === 'cancelada'
                    ? [{ ...PENDENTES[0], status: 'cancelada' }]
                    : [],
              ),
            },
    })
    abrir('/solicitacoes?status=recusada')
    const recusada = await linha(/Júlia Santos/)
    expect(recusada).toHaveTextContent('Recusada')
    expect(recusada).toHaveTextContent('por Maria Coordenadora · agora')
    expect(recusada).toHaveTextContent('Motivo: turma sem vagas')
    expect(within(recusada).queryByRole('button')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Canceladas pelo aluno' }))
    await waitFor(async () => expect(await linha(/Júlia Santos/)).toHaveTextContent('Cancelada pelo aluno'))
  })

  it('aba sem solicitações mostra o estado vazio', async () => {
    api({ 'GET /gestao/solicitacoes': { status: 200, corpo: pagina([]) } })
    abrir()
    expect(await screen.findByText('Nenhuma solicitação pendente')).toBeInTheDocument()
  })
})

describe('decidir (RW-29, RW-30)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('aprovar cria o vínculo e a linha passa a mostrar quem aprovou e quando', async () => {
    const chamadas = api({ 'POST /gestao/solicitacoes/s1/aprovar': { status: 200, corpo: decidida('aprovada') } })
    abrir()
    await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: 'Aprovar Júlia Santos em Sistemas para Internet 3A' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Júlia Santos agora está em Sistemas para Internet 3A.')
    const julia = await linha(/Júlia Santos/)
    expect(julia).toHaveTextContent('Aprovada')
    expect(julia).toHaveTextContent('por Maria Coordenadora · agora')
    expect(within(julia).queryByRole('button', { name: /^Aprovar/ })).not.toBeInTheDocument()
    expect(chamadas.map((c) => c.chave)).toContain('POST /gestao/solicitacoes/s1/aprovar')
  })

  it('recusar pede o motivo (opcional, até 300) e mostra a recusa', async () => {
    const chamadas = api({
      'POST /gestao/solicitacoes/s1/recusar': { status: 200, corpo: decidida('recusada', { motivo_recusa: 'Turma completa' }) },
    })
    abrir()
    await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: 'Recusar Júlia Santos em Sistemas para Internet 3A' }))

    const dialogo = screen.getByRole('dialog', { name: 'Recusar a solicitação de Júlia Santos?' })
    const motivo = within(dialogo).getByLabelText('Motivo (opcional)')
    expect(motivo).toHaveAttribute('maxlength', '300')
    expect(dialogo).toHaveTextContent(/vê o motivo no aplicativo/)
    await userEvent.type(motivo, 'Turma completa')
    expect(within(dialogo).getByText('14 de 300')).toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Recusar solicitação' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Solicitação de Júlia Santos recusada.')
    expect(await linha(/Júlia Santos/)).toHaveTextContent('Motivo: Turma completa')
    expect(chamadas.find((c) => c.chave === 'POST /gestao/solicitacoes/s1/recusar')?.corpo).toEqual({ motivo: 'Turma completa' })
  })

  it('já decidida por outra pessoa (409): explica e recarrega a fila', async () => {
    const chamadas = api({ 'POST /gestao/solicitacoes/s1/aprovar': { status: 409, corpo: erro('SOLICITACAO_NAO_PENDENTE') } })
    abrir()
    await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: 'Aprovar Júlia Santos em Sistemas para Internet 3A' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta solicitação já foi decidida.')
    await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
  })

  it('aluno já vinculado por outro caminho (409 JA_VINCULADO): explica e recarrega', async () => {
    const chamadas = api({ 'POST /gestao/solicitacoes/s1/aprovar': { status: 409, corpo: erro('JA_VINCULADO') } })
    abrir()
    await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: 'Aprovar Júlia Santos em Sistemas para Internet 3A' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Esta pessoa já está vinculada à turma.')
    await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
  })

  it('turma que não é mais de quem decide (403): explica e recarrega a fila', async () => {
    const chamadas = api({ 'POST /gestao/solicitacoes/s1/aprovar': { status: 403, corpo: erro('SEM_PERMISSAO') } })
    abrir()
    await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: 'Aprovar Júlia Santos em Sistemas para Internet 3A' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Você só pode decidir as solicitações das turmas em que leciona.')
    await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
  })

  it('uma decisão por vez: enquanto uma está em curso, as outras ficam indisponíveis', async () => {
    let liberar: () => void = () => undefined
    const original = api()
    void original
    const fetchBase = globalThis.fetch
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string, init: RequestInit) =>
        url.includes('/aprovar')
          ? new Promise<Response>((r) => (liberar = () => r(new Response(JSON.stringify(decidida('aprovada')), { status: 200 }))))
          : fetchBase(url, init),
      ),
    )
    abrir()
    await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: 'Aprovar Júlia Santos em Sistemas para Internet 3A' }))

    expect(within(await linha(/Caio Ribeiro/)).getByRole('button', { name: 'Aprovar Caio Ribeiro em Sistemas para Internet 4A' })).toBeDisabled()
    liberar()
    await waitFor(async () => expect(within(await linha(/Caio Ribeiro/)).getByRole('button', { name: 'Aprovar Caio Ribeiro em Sistemas para Internet 4A' })).toBeEnabled())
  })

  describe('revisão da fase 7', () => {
    it('depois de decidir, a fila vem do servidor (sem pular pendentes na página seguinte) e a decidida continua à vista', async () => {
      let aprovou = false
      const chamadas = api({
        'POST /gestao/solicitacoes/s1/aprovar': (() => {
          aprovou = true
          return { status: 200, corpo: decidida('aprovada') }
        }) as unknown as R,
        'GET /gestao/solicitacoes': (q) =>
          q.get('limit') === '1'
            ? { status: 200, corpo: { ...pagina([]), total: aprovou ? 6 : 7 } }
            : { status: 200, corpo: pagina(aprovou ? [PENDENTES[1]] : PENDENTES) },
      })
      abrir()
      await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: /^Aprovar Júlia/ }))

      await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
      expect(await linha(/Júlia Santos/)).toHaveTextContent('Aprovada')
      expect(await linha(/Caio Ribeiro/)).toBeInTheDocument()
      expect(await screen.findByRole('tab', { name: 'Pendentes (6)' })).toBeInTheDocument()
    })

    it('recarga depois de um 409 não traz de volta os botões de quem já foi decidida', async () => {
      let liberar: () => void = () => undefined
      let recargas = 0
      api({
        'POST /gestao/solicitacoes/s1/aprovar': { status: 200, corpo: decidida('aprovada') },
        'POST /gestao/solicitacoes/s2/aprovar': { status: 409, corpo: erro('SOLICITACAO_NAO_PENDENTE') },
      })
      const base = globalThis.fetch
      vi.stubGlobal(
        'fetch',
        vi.fn((url: string, init: RequestInit) => {
          if (url.includes('/gestao/solicitacoes?') && !url.includes('limit=1') && recargas++ >= 2) {
            return new Promise<Response>((r) => (liberar = () => r(new Response(JSON.stringify(pagina(PENDENTES)), { status: 200 }))))
          }
          return base(url, init)
        }),
      )
      abrir()
      await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: /^Aprovar Júlia/ }))
      await screen.findByText(/agora está em/)
      await userEvent.click(within(await linha(/Caio Ribeiro/)).getByRole('button', { name: /^Aprovar Caio/ }))
      await screen.findByRole('alert')

      expect(await linha(/Júlia Santos/)).toHaveTextContent('Aprovada')
      expect(within(await linha(/Júlia Santos/)).queryByRole('button', { name: /^Aprovar/ })).not.toBeInTheDocument()
      liberar()
    })

    it('recusa que falha mantém o modal aberto com o motivo digitado', async () => {
      api({ 'POST /gestao/solicitacoes/s1/recusar': { status: 503, corpo: erro('ERRO_INTERNO') } })
      abrir()
      await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: /^Recusar Júlia/ }))
      const dialogo = screen.getByRole('dialog', { name: /Recusar a solicitação/ })
      await userEvent.type(within(dialogo).getByLabelText('Motivo (opcional)'), 'Sem vagas')
      await userEvent.click(within(dialogo).getByRole('button', { name: 'Recusar solicitação' }))

      expect(await within(dialogo).findByRole('alert')).toHaveTextContent(/Não foi possível concluir agora/)
      expect(within(dialogo).getByLabelText('Motivo (opcional)')).toHaveValue('Sem vagas')
    })

    it('aprovar quem não tem mais perfil de aluno explica o que fazer', async () => {
      api({ 'POST /gestao/solicitacoes/s1/aprovar': { status: 409, corpo: erro('PERFIL_INCOMPATIVEL') } })
      abrir()
      await userEvent.click(within(await linha(/Júlia Santos/)).getByRole('button', { name: /^Aprovar Júlia/ }))

      expect(await screen.findByRole('alert')).toHaveTextContent('Esta pessoa não tem mais perfil de aluno. Recuse a solicitação.')
    })

    it('filtro de turma que a API recusa oferece limpar o filtro', async () => {
      api({
        'GET /gestao/solicitacoes': (q) =>
          q.get('turma_id') ? { status: 403, corpo: erro('SEM_PERMISSAO') } : { status: 200, corpo: pagina(PENDENTES) },
      })
      abrir(`/solicitacoes?turma=${T1}`)

      await userEvent.click(await screen.findByRole('button', { name: 'Limpar filtro de turma' }))

      expect(await tabela()).toBeInTheDocument()
      expect(screen.getByTestId('url')).toBeEmptyDOMElement()
    })
  })
})
