import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import HistoricoEvento from '../../src/paginas/eventos/historico'
import { eventoGestao, pagina, versaoEvento } from '../fixtures'
import { abrirEm, apiAgenda } from './apoio-agenda'

const autor = { id: 'u1', nome: 'Marina Duarte' }
const HISTORICO = [
  {
    id: 'h2',
    tipo: 'editado',
    usuario: autor,
    ocorrido_em: '2026-10-05T09:00:00Z',
    versao: 2,
    alteracoes: {
      local: { de: 'Sala 203', para: 'Lab 4' },
      fim: { de: null, para: '2026-11-24T21:00:00+00:00' },
    },
  },
  { id: 'h1', tipo: 'criado', usuario: autor, ocorrido_em: '2026-10-01T12:00:00Z', versao: 1, alteracoes: null },
]

describe('evento — histórico e versões (RW-34; plan-f2 D-F2-4)', () => {
  afterEach(() => vi.unstubAllGlobals())

  function abrir() {
    apiAgenda({
      'GET /gestao/eventos/e7e00000-0000-4000-8000-0000000000e1': { status: 200, corpo: { ...eventoGestao, id: 'e7e00000-0000-4000-8000-0000000000e1' } },
      'GET /gestao/eventos/e7e00000-0000-4000-8000-0000000000e1/historico': { status: 200, corpo: pagina(HISTORICO) },
      'GET /gestao/eventos/e7e00000-0000-4000-8000-0000000000e1/versoes': { status: 200, corpo: pagina([{ ...versaoEvento, versao: 2, local: 'Lab 4' }, versaoEvento]) },
    })
    abrirEm('/eventos/e7e00000-0000-4000-8000-0000000000e1?aba=historico', '/eventos/:id', <HistoricoEvento />, ['/eventos', '/eventos/:id/editar'])
  }

  it('linha do tempo com o vocabulário do evento e as mudanças de data e local', async () => {
    abrir()

    const linha = await screen.findByRole('list', { name: 'Linha do tempo' })
    expect(within(linha).getByText('Evento editado')).toBeInTheDocument()
    expect(within(linha).getByText('Evento criado')).toBeInTheDocument()
    expect(within(linha).getByText(/Lab 4/)).toBeInTheDocument()
    expect(within(linha).getByText(/sem fim →/)).toBeInTheDocument()
  })

  it('versões: cada uma abre com data, local e destinos', async () => {
    abrir()

    const versao1 = await screen.findByRole('button', { name: /Versão 1/ })
    await userEvent.click(versao1)

    expect(within(versao1.closest('li')!).getByText('Sala 203')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Versão 2/ })).toHaveTextContent('Atual')
  })

  it('a aba de detalhes mostra data, local, descrição e destinos', async () => {
    abrir()

    await userEvent.click(await screen.findByRole('tab', { name: 'Detalhes' }))

    expect(screen.getByText('Cinco defesas, com arguição aberta ao público.')).toBeInTheDocument()
    expect(within(screen.getByRole('list', { name: 'Destinos do evento' })).getByText('Docentes')).toBeInTheDocument()
  })
})
