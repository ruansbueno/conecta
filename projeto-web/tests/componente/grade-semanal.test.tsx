import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { erro, pagina } from '../fixtures'
import { abrirGrade, apiHorarios, CAMINHO, ID, TURMA } from './apoio-horarios'

afterEach(() => vi.unstubAllGlobals())

describe('grade semanal (T13, w-13, plan-f2 D-F2-8)', () => {
  it('colunas de segunda a sexta, linhas pelos inícios, cartão com disciplina, horas, local e docente', async () => {
    apiHorarios()
    const tabela = await abrirGrade()
    const cabecalhos = within(tabela).getAllByRole('columnheader').map((c) => c.textContent)
    expect(cabecalhos).toEqual(['Horário', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'])
    expect(within(tabela).getAllByRole('rowheader').map((c) => c.textContent)).toEqual(['19:10', '21:00'])
    const bd = within(tabela).getByRole('button', { name: /banco de dados ii/i })
    expect(bd).toHaveTextContent('19:10–20:50')
    expect(bd).toHaveTextContent('Lab 4 · Helena Prado')
    expect(bd).toHaveAccessibleName('Banco de Dados II, segunda, 19:10–20:50, Lab 4, Helena Prado. Editar aula')
    // Sem local e sem docente: o cartão não inventa nada.
    expect(within(tabela).getByRole('button', { name: /engenharia de software/i })).toHaveAccessibleName(
      'Engenharia de Software, segunda, 21:00–22:40. Editar aula',
    )
  })

  it('cabeçalho com a turma (link para trocar) e o período', async () => {
    apiHorarios()
    await abrirGrade()
    expect(screen.getByRole('heading', { level: 1, name: 'Horários' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /trocar de turma.*SI-3A — Sistemas para Internet 3A/i })).toHaveAttribute('href', '/horarios')
    expect(screen.getByText(TURMA.periodo_letivo)).toBeInTheDocument()
  })

  it('docentes nesta grade, com as disciplinas', async () => {
    apiHorarios()
    await abrirGrade()
    const secao = screen.getByRole('region', { name: 'Docentes nesta grade' })
    const itens = within(secao).getAllByRole('listitem')
    expect(itens.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Helena Prado'),
      expect.stringContaining('Ricardo Lemos'),
    ])
    expect(itens[1]).toHaveTextContent('Redes de Computadores')
  })

  it('grade vazia: estado vazio e o botão Nova aula', async () => {
    apiHorarios({ [`GET ${CAMINHO}`]: { status: 200, corpo: pagina([]) } })
    const { abrirEm } = await import('./apoio-agenda')
    const Grade = (await import('../../src/paginas/horarios/grade')).default
    abrirEm(`/turmas/${ID}/horarios`, '/turmas/:id/horarios', <Grade />)
    expect(await screen.findByText('Nenhuma aula nesta grade')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Nova aula' })).toBeInTheDocument()
  })

  it('turma inexistente: mensagem e caminho de volta à escolha da turma', async () => {
    apiHorarios({ [`GET /gestao/turmas/${ID}`]: { status: 404, corpo: erro('TURMA_NAO_ENCONTRADA') } })
    const { abrirEm } = await import('./apoio-agenda')
    const Grade = (await import('../../src/paginas/horarios/grade')).default
    abrirEm(`/turmas/${ID}/horarios`, '/turmas/:id/horarios', <Grade />)
    expect(await screen.findByText('Esta turma não está mais disponível.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Escolher outra turma' })).toHaveAttribute('href', '/horarios')
  })

  it('falha ao carregar a grade oferece tentar de novo', async () => {
    let falhar = true
    apiHorarios({
      [`GET ${CAMINHO}`]: () => (falhar ? { status: 500, corpo: erro('ERRO_INTERNO') } : { status: 200, corpo: pagina([]) }),
    })
    const { abrirEm } = await import('./apoio-agenda')
    const Grade = (await import('../../src/paginas/horarios/grade')).default
    abrirEm(`/turmas/${ID}/horarios`, '/turmas/:id/horarios', <Grade />)
    const repetir = await screen.findByRole('button', { name: /tentar de novo/i })
    falhar = false
    await userEvent.click(repetir)
    await waitFor(() => expect(screen.getByText('Nenhuma aula nesta grade')).toBeInTheDocument())
  })
})
