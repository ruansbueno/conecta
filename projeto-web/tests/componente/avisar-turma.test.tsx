import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import NovoAviso from '../../src/paginas/avisos/novo'
import { pagina, turma } from '../fixtures'
import { abrirEm, apiAgenda } from './apoio-agenda'
import { abrirGrade, apiHorarios, BD, CAMINHO, ID, TURMA } from './apoio-horarios'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('avisar a turma (T13, RW-36, plan-f2 D-F2-11)', () => {
  it('cartão fixo "Mudou alguma aula?" leva ao aviso da turma', async () => {
    apiHorarios()
    await abrirGrade()
    const cartao = screen.getByRole('region', { name: 'Mudou alguma aula?' })
    expect(cartao).toHaveTextContent(/não gera aviso automático/i)
    expect(within(cartao).getByRole('link', { name: 'Criar aviso para a SI-3A' })).toHaveAttribute('href', `/avisos/novo?turma=${ID}`)
  })

  it('turma inativa: sem o link para o aviso, que não aceitaria a turma como destino', async () => {
    apiHorarios({ [`GET /gestao/turmas/${ID}`]: { status: 200, corpo: { ...TURMA, ativa: false } } })
    await abrirGrade()
    expect(screen.getByText('Turma inativa não recebe avisos: reative a turma para avisá-la.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /criar aviso/i })).not.toBeInTheDocument()
  })

  it('a mensagem depois de remover também oferece o aviso da turma', async () => {
    apiHorarios({ [`DELETE ${CAMINHO}/${BD.id}`]: { status: 204 } })
    const tabela = await abrirGrade()
    await userEvent.click(within(tabela).getByRole('button', { name: /banco de dados ii/i }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover aula' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover' }))
    const mensagem = await screen.findByRole('status')
    expect(within(mensagem).getByRole('link', { name: 'Criar aviso para a SI-3A' })).toHaveAttribute('href', `/avisos/novo?turma=${ID}`)
  })

  it('/avisos/novo?turma=<id> abre o editor com a turma como destino', async () => {
    apiAgenda({ 'GET /gestao/turmas': { status: 200, corpo: pagina([{ ...turma, nome: 'SI-3A' }]) } })
    abrirEm(`/avisos/novo?turma=${turma.id}`, '/avisos/novo', <NovoAviso />)
    const escolhidos = await screen.findByRole('list', { name: 'Destinos escolhidos' })
    expect(within(escolhidos).getByText(/SI-3A/)).toBeInTheDocument()
  })

  it('turma que não está entre as disponíveis é ignorada', async () => {
    apiAgenda()
    abrirEm('/avisos/novo?turma=00000000-0000-4000-8000-00000000ffff', '/avisos/novo', <NovoAviso />)
    await screen.findByRole('heading', { name: 'Novo aviso' })
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Destinos escolhidos' })).not.toBeInTheDocument())
  })
})
