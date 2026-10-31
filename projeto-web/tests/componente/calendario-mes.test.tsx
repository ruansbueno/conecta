import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ListaEventos from '../../src/paginas/eventos/lista'
import { eventoGestao, pagina } from '../fixtures'
import { abrirEm, apiAgenda, type Chamada } from './apoio-agenda'

const local = (a: number, m: number, d: number, h = 0) => new Date(a, m - 1, d, h).toISOString()
const SEMANA = { ...eventoGestao, id: 'e1', titulo: 'Semana Acadêmica', inicio: local(2026, 11, 2, 8), fim: local(2026, 11, 4, 22) }
const PALESTRAS = [5, 5, 5, 5].map((d, i) => ({ ...eventoGestao, id: `p${i}`, titulo: `Palestra ${i + 1}`, inicio: local(2026, 11, d, 19 + i % 3), fim: null }))
const consultas = (c: Chamada[]) => c.filter((x) => x.chave === 'GET /gestao/eventos').map((x) => Object.fromEntries(x.query))

describe('agenda — aba Mês (plan-f2 D-F2-7)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('pede a janela do mês e mostra semanas de segunda a domingo', async () => {
    const chamadas = apiAgenda({ 'GET /gestao/eventos': { status: 200, corpo: pagina([SEMANA]) } })
    abrirEm('/eventos?aba=mes&mes=2026-11', '/eventos', <ListaEventos />)

    const grade = await screen.findByRole('table', { name: 'novembro de 2026' })
    expect(within(grade).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'])
    expect(consultas(chamadas)[0]).toMatchObject({
      situacao: 'ativo',
      de: new Date(2026, 9, 26).toISOString(),
      ate: new Date(2026, 11, 7).toISOString(),
    })
  })

  it('evento de vários dias aparece em cada dia; mais de 3 num dia vira "+N"', async () => {
    apiAgenda({ 'GET /gestao/eventos': { status: 200, corpo: pagina([SEMANA, ...PALESTRAS]) } })
    abrirEm('/eventos?aba=mes&mes=2026-11', '/eventos', <ListaEventos />)

    for (const dia of ['2 de novembro', '3 de novembro', '4 de novembro']) {
      const botao = await screen.findByRole('button', { name: new RegExp(`^Ver os eventos de ${dia}`) })
      expect(within(botao).getByText('Semana Acadêmica')).toBeInTheDocument()
    }
    expect(within(screen.getByRole('button', { name: /^Ver os eventos de 5 de novembro/ })).getByText('+1')).toBeInTheDocument()
  })

  it('‹ › trocam o mês na URL e pedem a nova janela', async () => {
    const chamadas = apiAgenda()
    abrirEm('/eventos?aba=mes&mes=2026-12', '/eventos', <ListaEventos />)
    await screen.findByRole('table', { name: 'dezembro de 2026' })

    await userEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))

    expect(await screen.findByRole('table', { name: 'janeiro de 2027' })).toBeInTheDocument()
    expect(screen.getByTestId('onde')).toHaveTextContent('mes=2027-01')
    await waitFor(() => expect(consultas(chamadas).at(-1)?.de).toBe(new Date(2026, 11, 28).toISOString()))
  })

  it('clicar num dia lista os eventos dele abaixo do calendário', async () => {
    apiAgenda({ 'GET /gestao/eventos': { status: 200, corpo: pagina([SEMANA, ...PALESTRAS]) } })
    abrirEm('/eventos?aba=mes&mes=2026-11', '/eventos', <ListaEventos />)

    const dia = await screen.findByRole('button', { name: /^Ver os eventos de 3 de novembro/ })
    await userEvent.click(dia)

    expect(dia).toHaveAttribute('aria-pressed', 'true')

    const lista = screen.getByRole('list', { name: 'Eventos de 3 de novembro' })
    expect(within(lista).getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Semana Acadêmica'])
  })

  it('dia de outro mês na grade também mostra os eventos dele', async () => {
    const outubro = { ...SEMANA, id: 'o1', titulo: 'Prova de outubro', inicio: local(2026, 10, 30, 19), fim: null }
    apiAgenda({ 'GET /gestao/eventos': { status: 200, corpo: pagina([outubro]) } })
    abrirEm('/eventos?aba=mes&mes=2026-11', '/eventos', <ListaEventos />)

    expect(within(await screen.findByRole('button', { name: /^Ver os eventos de 30 de outubro/ })).getByText('Prova de outubro')).toBeInTheDocument()
  })

  it('mais eventos do que cabem numa página: avisa que o mês está incompleto', async () => {
    apiAgenda({ 'GET /gestao/eventos': { status: 200, corpo: pagina([SEMANA], 150) } })
    abrirEm('/eventos?aba=mes&mes=2026-11', '/eventos', <ListaEventos />)

    expect(await screen.findByText(/Mostrando 1 de 150 eventos deste mês/)).toBeInTheDocument()
  })
})
