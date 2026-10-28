import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apagarTodosRascunhos, lerRascunho, salvarRascunho } from '../../src/lib/rascunho'
import NovoAviso from '../../src/paginas/avisos/novo'
import { SessaoProvider } from '../../src/sessao/contexto'
import { avisoGestao, erro, me, meDocente, pagina, turma } from '../fixtures'

const TURMAS = ['A', 'B', 'C'].map((l, i) => ({
  ...turma,
  id: `t${i + 1}`,
  codigo: `SI-3${l}`,
  nome: `Sistemas para Internet 3${l}`,
}))

type R = { status: number; corpo?: unknown }

function api(rotas: Record<string, R | R[]>, perfil: 'coordenacao' | 'docente' = 'coordenacao') {
  const chamadas: { chave: string; corpo?: Record<string, unknown> }[] = []
  const base: Record<string, R | R[]> = {
    'GET /me': { status: 200, corpo: perfil === 'docente' ? meDocente : me },
    'GET /gestao/turmas': { status: 200, corpo: pagina(TURMAS) },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const chave = `${init.method} ${url.replace('/api', '').split('?')[0]}`
      chamadas.push({ chave, corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const r = base[chave]
      const atual = Array.isArray(r) ? (r.length > 1 ? r.shift()! : r[0]) : r
      const { status, corpo } = atual ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

async function abrir() {
  render(
    <MemoryRouter initialEntries={['/avisos/novo']}>
      <SessaoProvider>
        <Routes>
          <Route path="/avisos/novo" element={<NovoAviso />} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Novo aviso' })
}

async function escrever(titulo = 'Semana Acadêmica 2026/2', conteudo = 'Programação completa.') {
  await userEvent.type(screen.getByLabelText('Título'), titulo)
  await userEvent.type(screen.getByLabelText('Conteúdo'), conteudo)
}

async function escolherTurmas(...codigos: string[]) {
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar destino' }))
  const dialogo = screen.getByRole('dialog', { name: 'Adicionar destino' })
  for (const c of codigos) await userEvent.click(within(dialogo).getByRole('checkbox', { name: new RegExp(c) }))
  await userEvent.click(within(dialogo).getByRole('button', { name: /Adicionar \d+ destinos?/ }))
}

const publicar = () => userEvent.click(screen.getByRole('button', { name: /Publicar aviso|Agendar publicação/ }))

describe('editor de aviso (T04/T05/T15)', () => {
  beforeEach(() => apagarTodosRascunhos())
  afterEach(() => {
    vi.unstubAllGlobals()
    apagarTodosRascunhos()
  })

  it('coordenação publica para três turmas e vê a confirmação', async () => {
    const chamadas = api({ 'POST /gestao/avisos': { status: 201, corpo: avisoGestao } })
    await abrir()
    await escrever()

    await escolherTurmas('SI-3A', 'SI-3B', 'SI-3C')
    for (const c of ['Sistemas para Internet 3A', 'Sistemas para Internet 3B', 'Sistemas para Internet 3C']) {
      expect(screen.getAllByText(c).length).toBeGreaterThan(0)
    }
    await publicar()

    expect(await screen.findByRole('heading', { name: 'Aviso publicado' })).toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === 'POST /gestao/avisos')?.corpo).toEqual({
      titulo: 'Semana Acadêmica 2026/2',
      conteudo: 'Programação completa.',
      destinos: [
        { tipo: 'turma', turma_id: 't1' },
        { tipo: 'turma', turma_id: 't2' },
        { tipo: 'turma', turma_id: 't3' },
      ],
    })
  })

  it('semestres e grupos viram chips removíveis, sem repetição', async () => {
    api({})
    await abrir()

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar destino' }))
    const dialogo = screen.getByRole('dialog', { name: 'Adicionar destino' })
    await userEvent.click(within(dialogo).getByRole('tab', { name: 'Semestres' }))
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: '6º semestre' }))
    await userEvent.click(within(dialogo).getByRole('tab', { name: 'Grupos' }))
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Docentes/ }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Adicionar 2 destinos' }))

    await userEvent.click(screen.getByRole('button', { name: 'Adicionar destino' }))
    const outra = screen.getByRole('dialog', { name: 'Adicionar destino' })
    await userEvent.click(within(outra).getByRole('tab', { name: 'Semestres' }))
    expect(within(outra).getByRole('checkbox', { name: '6º semestre' })).toBeDisabled() // já no aviso
    await userEvent.click(within(outra).getByRole('button', { name: 'Cancelar' }))

    await userEvent.click(screen.getByRole('button', { name: 'Remover destino 6º semestre' }))
    expect(screen.queryByRole('button', { name: 'Remover destino 6º semestre' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remover destino Docentes' })).toBeInTheDocument()
  })

  it('sem destino: a interface impede e explica, sem chamar a API', async () => {
    const chamadas = api({})
    await abrir()
    await escrever()

    await publicar()

    expect(screen.getByText(/precisa de pelo menos um destino/)).toBeInTheDocument()
    expect(chamadas.map((c) => c.chave)).not.toContain('POST /gestao/avisos')
  })

  it('limite de 20 destinos', async () => {
    const dez = Array.from({ length: 10 }, (_, i) => ({ ...turma, id: `x${i}`, codigo: `TX-${i}`, nome: `Turma ${i}` }))
    api({ 'GET /gestao/turmas': { status: 200, corpo: pagina(dez) } })
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Adicionar destino' }))
    const dialogo = screen.getByRole('dialog', { name: 'Adicionar destino' })
    await userEvent.click(within(dialogo).getByRole('tab', { name: 'Semestres' }))
    for (let n = 1; n <= 12; n++) await userEvent.click(within(dialogo).getByRole('checkbox', { name: `${n}º semestre` }))
    await userEvent.click(within(dialogo).getByRole('tab', { name: 'Grupos' }))
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Todos os usuários/ }))
    await userEvent.click(within(dialogo).getByRole('checkbox', { name: /Docentes/ }))
    await userEvent.click(within(dialogo).getByRole('tab', { name: 'Turmas' }))
    for (let i = 0; i < 10; i++) await userEvent.click(within(dialogo).getByRole('checkbox', { name: new RegExp(`TX-${i}`) }))

    expect(within(dialogo).getByText(/até 20 destinos/)).toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Adicionar 24 destinos' })).toBeDisabled()
  })

  it('agendamento no passado é recusado antes de enviar', async () => {
    const chamadas = api({})
    await abrir()
    await escrever()
    await escolherTurmas('SI-3A')

    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }))
    await userEvent.type(screen.getByLabelText('Data da publicação'), '2020-01-01')
    await userEvent.type(screen.getByLabelText('Hora da publicação'), '08:00')
    await publicar()

    expect(screen.getByText('Escolha uma data e hora no futuro.')).toBeInTheDocument()
    expect(chamadas.map((c) => c.chave)).not.toContain('POST /gestao/avisos')
  })

  it('agendamento futuro: envia publicar_em e confirma como agendado', async () => {
    const amanha = new Date(Date.now() + 86_400_000)
    const dia = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, '0')}-${String(amanha.getDate()).padStart(2, '0')}`
    const chamadas = api({
      // A API devolve o agendado como "ativo" com publicar_em no futuro (contrato §14).
      'POST /gestao/avisos': { status: 201, corpo: { ...avisoGestao, situacao: 'ativo', publicar_em: amanha.toISOString() } },
    })
    await abrir()
    await escrever()
    await escolherTurmas('SI-3A')

    await userEvent.click(screen.getByRole('button', { name: 'Agendar' }))
    await userEvent.type(screen.getByLabelText('Data da publicação'), dia)
    await userEvent.type(screen.getByLabelText('Hora da publicação'), '08:00')
    await publicar()

    expect(await screen.findByRole('heading', { name: 'Aviso agendado' })).toBeInTheDocument()
    expect(screen.queryByText(/já vê o aviso/)).not.toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === 'POST /gestao/avisos')?.corpo?.publicar_em).toBe(
      new Date(`${dia}T08:00`).toISOString(),
    )
  })

  it('erro de validação da API marca o campo e o destino problemático', async () => {
    api({
      'POST /gestao/avisos': {
        status: 422,
        corpo: erro('VALIDATION_ERROR', 'Dados inválidos', [{ campo: 'destinos.0.turma_id', mensagem: 'turma inativa' }]),
      },
    })
    await abrir()
    await escrever()
    await escolherTurmas('SI-3A')

    await publicar()

    expect(await screen.findByText('Confira os campos destacados.')).toBeInTheDocument()
    expect(screen.getByText(/Sistemas para Internet 3A: turma inativa/)).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue('Semana Acadêmica 2026/2')
  })

  it('falha de rede mantém o formulário', async () => {
    api({ 'POST /gestao/avisos': { status: 503, corpo: erro('ERRO_INTERNO') } })
    await abrir()
    await escrever()
    await escolherTurmas('SI-3A')

    await publicar()

    expect(await screen.findByText(/Não foi possível concluir agora/)).toBeInTheDocument()
    expect(screen.getByLabelText('Conteúdo')).toHaveValue('Programação completa.')
  })

  describe('docente (T15, RW-17)', () => {
    it('só as turmas em que leciona; grupos indisponíveis com explicação', async () => {
      api({ 'GET /gestao/turmas': { status: 200, corpo: pagina([TURMAS[0]]) } }, 'docente')
      await abrir()

      expect(screen.getByRole('checkbox', { name: /SI-3A/ })).toBeEnabled()
      expect(screen.queryByRole('checkbox', { name: /SI-3B/ })).not.toBeInTheDocument()
      for (const grupo of [/Todos os usuários/, /Semestre inteiro/, /Todos os docentes/]) {
        expect(screen.getByRole('checkbox', { name: grupo })).toBeDisabled()
      }
      expect(screen.getAllByText('Apenas coordenação e administração')).toHaveLength(3)
      expect(screen.queryByRole('button', { name: 'Adicionar destino' })).not.toBeInTheDocument()
    })

    it('destino que o docente não pode usar (rascunho de outro perfil) não fica escondido no envio', async () => {
      salvarRascunho('rascunho:aviso:novo', {
        titulo: 'Rascunho antigo',
        conteudo: 'Escrito quando era coordenação.',
        destinos: [{ tipo: 'todos' }, { tipo: 'turma', turmaId: 't1', turmaNome: 'Sistemas para Internet 3A' }],
      })
      const chamadas = api(
        {
          'GET /gestao/turmas': { status: 200, corpo: pagina([TURMAS[0]]) },
          'POST /gestao/avisos': { status: 201, corpo: avisoGestao },
        },
        'docente',
      )
      await abrir()

      await publicar()

      await screen.findByRole('heading', { name: 'Aviso publicado' })
      expect(chamadas.find((c) => c.chave === 'POST /gestao/avisos')?.corpo?.destinos).toEqual([
        { tipo: 'turma', turma_id: 't1' },
      ])
    })

    it('DESTINO_NAO_PERMITIDO explica, recarrega as turmas e mantém o texto', async () => {
      const chamadas = api(
        {
          'GET /gestao/turmas': [
            { status: 200, corpo: pagina([TURMAS[0]]) },
            { status: 200, corpo: pagina([]) },
          ],
          'POST /gestao/avisos': { status: 403, corpo: erro('DESTINO_NAO_PERMITIDO') },
        },
        'docente',
      )
      await abrir()
      await escrever('Lista de exercícios 5', 'Entrega até 28/10.')
      await userEvent.click(screen.getByRole('checkbox', { name: /SI-3A/ }))

      await publicar()

      expect(await screen.findByText('Você só pode publicar para as turmas em que leciona.')).toBeInTheDocument()
      await waitFor(() => expect(chamadas.filter((c) => c.chave === 'GET /gestao/turmas')).toHaveLength(2))
      expect(screen.getByLabelText('Título')).toHaveValue('Lista de exercícios 5')
      expect(screen.getByLabelText('Conteúdo')).toHaveValue('Entrega até 28/10.')
    })
  })

  describe('rascunho (RW-42)', () => {
    it('guarda o que foi digitado e é recuperado ao reabrir', async () => {
      api({})
      await abrir()
      await escrever('Texto que não pode se perder', 'Conteúdo longo.')

      await waitFor(() => expect(lerRascunho('rascunho:aviso:novo')?.titulo).toBe('Texto que não pode se perder'))
    })

    it('é apagado ao publicar', async () => {
      api({ 'POST /gestao/avisos': { status: 201, corpo: avisoGestao } })
      await abrir()
      await escrever()
      await escolherTurmas('SI-3A')

      await publicar()
      await screen.findByRole('heading', { name: 'Aviso publicado' })

      expect(lerRascunho('rascunho:aviso:novo')).toBeNull()
    })
  })

  it('prévia mostra o cartão como aparece no aplicativo (RW-22)', async () => {
    api({})
    await abrir()
    await escrever('Título na prévia', 'Corpo na prévia.')

    const previa = screen.getByRole('region', { name: 'Como aparece no aplicativo' })
    expect(within(previa).getByText('Título na prévia')).toBeInTheDocument()
    expect(within(previa).getByText('Corpo na prévia.')).toBeInTheDocument()
    expect(within(previa).getByText('Maria Coordenadora')).toBeInTheDocument()
  })
})
