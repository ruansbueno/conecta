import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { SeletorDestinos } from '../../src/componentes/comum/seletor-destinos'

function abrir() {
  render(<SeletorDestinos turmas={[]} jaEscolhidos={[]} onAdicionar={vi.fn()} onFechar={vi.fn()} />)
}

describe('abas do seletor de destinos (padrão ARIA de abas)', () => {
  it('só a aba ativa entra na ordem do Tab e o painel leva o nome dela', () => {
    abrir()
    const [turmas, semestres, grupos] = screen.getAllByRole('tab')
    expect(turmas).toHaveAttribute('tabindex', '0')
    expect(semestres).toHaveAttribute('tabindex', '-1')
    expect(grupos).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tabpanel', { name: 'Turmas' })).toBeInTheDocument()
  })

  it('setas, Home e End trocam de aba e levam o foco junto', async () => {
    abrir()
    screen.getByRole('tab', { name: 'Turmas' }).focus()

    await userEvent.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Semestres' })).toHaveFocus()
    expect(screen.getByRole('tabpanel', { name: 'Semestres' })).toBeInTheDocument()

    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Grupos' })).toHaveFocus()

    await userEvent.keyboard('{Home}')
    expect(screen.getByRole('tab', { name: 'Turmas' })).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{End}')
    expect(screen.getByRole('tab', { name: 'Grupos' })).toHaveFocus()
  })
})

describe('seletor de destinos no evento (plan-f2 D-F2-4)', () => {
  it('fala de evento, não de aviso', async () => {
    render(
      <SeletorDestinos
        assunto="evento"
        turmas={[]}
        jaEscolhidos={[{ tipo: 'todos' }]}
        onAdicionar={vi.fn()}
        onFechar={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Grupos' }))

    expect(screen.getByText('Já está no evento')).toBeInTheDocument()
    expect(screen.getByText(/1 destino no evento/)).toBeInTheDocument()
  })
})
