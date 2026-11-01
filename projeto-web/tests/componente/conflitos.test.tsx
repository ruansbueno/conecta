import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { abrirGrade, apiHorarios, BD, CAMINHO, conflito, HELENA } from './apoio-horarios'

afterEach(() => vi.unstubAllGlobals())

const docente = { ...conflito, tipo: 'docente', local: null, horario_id: 'f4e30000-0000-4000-8000-000000000002', inicio: '19:30', fim: '21:00' }

describe('conflitos (T13, RW-46, plan-f2 D-F2-10)', () => {
  it('aula salva com conflitos: atenção, não erro, com sala ou docente, turma, dia e horas; foco na mensagem', async () => {
    apiHorarios({
      [`POST ${CAMINHO}`]: { status: 201, corpo: { horario: { ...BD, docente: HELENA }, conflitos: [conflito, docente] } },
    })
    await abrirGrade()
    await userEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Início'), '19:10')
    await userEvent.type(within(modal).getByLabelText('Fim'), '20:50')
    await userEvent.type(within(modal).getByLabelText('Disciplina'), 'Banco de Dados II')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))

    const mensagem = await screen.findByRole('status')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(mensagem).toHaveFocus()
    expect(mensagem).toHaveTextContent('Aula salva, com choque de horário. Confira se é isso mesmo:')
    const itens = within(mensagem).getAllByRole('listitem').map((i) => i.textContent)
    expect(itens).toEqual([
      'Sala Lab 4 também ocupada por SI-3B-2026-2, segunda, 19:10–20:50.',
      'Helena Prado também dá aula em SI-3B-2026-2, segunda, 19:30–21:00.',
    ])
  })
})
