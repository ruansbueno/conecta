import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ListaEventos from '../../src/paginas/eventos/lista'
import { erro, eventoGestao, pagina } from '../fixtures'
import { abrirEm, apiAgenda, type Chamada } from './apoio-agenda'

const local = (a: number, m: number, d: number, h = 0, min = 0) => new Date(a, m - 1, d, h, min).toISOString()
const PROVA = {
  ...eventoGestao,
  id: 'e1',
  titulo: 'Prova de Banco de Dados II',
  tipo: 'prova',
  inicio: local(2026, 10, 16, 19, 10),
  fim: local(2026, 10, 16, 20, 50),
  local: 'Lab 4',
  destinos: [{ tipo: 'turma', turma: { id: 't1', nome: 'SI-3A' }, semestre: null }],
}
const PRAZO = {
  ...eventoGestao,
  id: 'e2',
  titulo: 'Prazo final: trabalho de Redes',
  tipo: 'data_importante',
  inicio: local(2026, 10, 31, 23, 59),
  fim: null,
  local: 'Entrega on-line',
}
const SEMANA = { ...eventoGestao, id: 'e3', titulo: 'Semana Acadêmica', tipo: 'outro', inicio: local(2026, 9, 2, 8), fim: local(2026, 9, 4, 22) }

const consultas = (c: Chamada[]) => c.filter((x) => x.chave === 'GET /gestao/eventos').map((x) => Object.fromEntries(x.query))
const abrir = (caminho = '/eventos') => abrirEm(caminho, '/eventos', <ListaEventos />, ['/eventos/novo', '/eventos/:id', '/eventos/:id/editar'])

describe('agenda — lista (T12, w-12; plan-f2 D-F2-1, D-F2-6)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('Próximos é a aba inicial e pede os não encerrados', async () => {
    const chamadas = apiAgenda({ 'GET /gestao/eventos': { status: 200, corpo: pagina([PROVA, PRAZO]) } })
    abrir()

    expect(await screen.findByText('Prova de Banco de Dados II')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Próximos' })).toHaveAttribute('aria-selected', 'true')
    expect(consultas(chamadas)[0]).toMatchObject({ situacao: 'ativo', quando: 'proximos' })
  })

  it('cartão como na w-12: dia, mês, tipo, horário, local e destinos', async () => {
    apiAgenda({ 'GET /gestao/eventos': { status: 200, corpo: pagina([PROVA, PRAZO, SEMANA]) } })
    abrir()

    const prova = (await screen.findByText('Prova de Banco de Dados II')).closest('li')!
    expect(within(prova).getByText('16')).toBeInTheDocument()
    expect(within(prova).getByText('out')).toBeInTheDocument()
    expect(within(prova).getByText('Prova')).toBeInTheDocument()
    expect(within(prova).getByText('19:10 – 20:50')).toBeInTheDocument()
    expect(within(prova).getByText('Lab 4')).toBeInTheDocument()
    expect(within(prova).getByText('SI-3A')).toBeInTheDocument()

    const prazo = screen.getByText('Prazo final: trabalho de Redes').closest('li')!
    expect(within(prazo).getByText('Data importante')).toBeInTheDocument()
    expect(within(prazo).getByText('até 23:59')).toBeInTheDocument()
    expect(within(screen.getByText('Semana Acadêmica').closest('li')!).getByText('de 02/09 a 04/09')).toBeInTheDocument()
  })

  it('cada aba pede a sua consulta e fica na URL', async () => {
    const chamadas = apiAgenda()
    abrir()
    await screen.findByText('Nenhum evento próximo')

    await userEvent.click(screen.getByRole('tab', { name: 'Realizados' }))
    await waitFor(() => expect(consultas(chamadas).at(-1)).toMatchObject({ situacao: 'ativo', quando: 'realizados' }))
    expect(screen.getByTestId('onde')).toHaveTextContent('/eventos?aba=realizados')

    await userEvent.click(screen.getByRole('tab', { name: 'Arquivados' }))
    await waitFor(() => expect(consultas(chamadas).at(-1)).toEqual(expect.objectContaining({ situacao: 'arquivado' })))
    expect(consultas(chamadas).at(-1)).not.toHaveProperty('quando')
  })

  it('filtro de tipo e busca vão para a consulta', async () => {
    const chamadas = apiAgenda()
    abrir('/eventos?tipo=banca&q=tcc')

    await waitFor(() => expect(consultas(chamadas)[0]).toMatchObject({ tipo: 'banca', q: 'tcc' }))
    expect(screen.getByRole('combobox', { name: 'Tipo' })).toHaveValue('banca')
    expect(screen.getByRole('searchbox', { name: 'Buscar evento' })).toHaveValue('tcc')
  })

  it('arquivar pede confirmação e mostra a mensagem; em Arquivados, desarquivar vai direto', async () => {
    const chamadas = apiAgenda({
      'GET /gestao/eventos': (q) => ({
        status: 200,
        corpo: pagina(q.get('situacao') === 'arquivado' ? [{ ...PROVA, situacao: 'arquivado' }] : [PROVA]),
      }),
      'POST /gestao/eventos/e1/arquivar': { status: 200, corpo: { ...PROVA, situacao: 'arquivado' } },
      'POST /gestao/eventos/e1/desarquivar': { status: 200, corpo: PROVA },
    })
    abrir()

    await userEvent.click(await screen.findByRole('button', { name: 'Arquivar “Prova de Banco de Dados II”' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Arquivar' }))
    expect(await screen.findByText('Evento arquivado.')).toHaveFocus()
    expect(chamadas.some((c) => c.chave === 'POST /gestao/eventos/e1/arquivar')).toBe(true)

    await userEvent.click(screen.getByRole('tab', { name: 'Arquivados' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Desarquivar “Prova de Banco de Dados II”' }))
    expect(await screen.findByText('Evento desarquivado.')).toBeInTheDocument()
  })

  it('vazio de cada aba explica o que aparece ali; erro oferece tentar de novo', async () => {
    apiAgenda({ 'GET /gestao/eventos': { status: 500, corpo: erro('ERRO') } })
    abrir()

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('docente vê "Novo evento" e só os seus (quem filtra é a API)', async () => {
    apiAgenda({}, 'docente')
    abrir()

    expect(await screen.findByRole('link', { name: 'Novo evento' })).toHaveAttribute('href', '/eventos/novo')
  })

  it('enquanto carrega, mostra o carregando', async () => {
    apiAgenda({ 'GET /gestao/eventos': () => ({ status: 200, corpo: pagina([]) }) })
    abrir()

    expect(screen.getByRole('status', { name: 'Carregando a agenda' })).toBeInTheDocument()
    await screen.findByText('Nenhum evento próximo')
  })
})
