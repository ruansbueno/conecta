import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { BarraLateral } from '../../src/componentes/layout/barra-lateral'
import { SemPermissao } from '../../src/paginas/sem-permissao'

const usuario = (perfil: string, nome = 'Marina Duarte') => ({
  id: 'u1',
  username: 'u',
  nome,
  perfil,
  turmas: [],
})

function itens(perfil: string, caminho = '/avisos/novo') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <BarraLateral usuario={usuario(perfil)} onSair={() => {}} />
    </MemoryRouter>,
  )
  return within(screen.getByRole('navigation', { name: 'Navegação principal' }))
    .getAllByRole('link')
    .map((l) => l.textContent)
}

describe('barra lateral por perfil (RW-11)', () => {
  it('coordenação e administração veem todos os itens, com Agenda e Horários (F2)', () => {
    expect(itens('coordenacao')).toEqual(['Painel', 'Avisos', 'Agenda', 'Turmas', 'Horários', 'Solicitações', 'Usuários'])
  })

  it('docente vê "Meus avisos", "Agenda" e "Minhas turmas", sem Usuários', () => {
    expect(itens('docente')).toEqual(['Painel', 'Meus avisos', 'Agenda', 'Minhas turmas', 'Solicitações'])
  })

  it('o histórico ou o editor de um evento marcam Agenda', () => {
    itens('docente', '/eventos/e1/editar')

    expect(screen.getByRole('link', { name: 'Agenda' })).toHaveAttribute('aria-current', 'page')
  })

  it('o item da seção atual fica marcado', () => {
    itens('coordenacao')

    expect(screen.getByRole('link', { name: 'Avisos' })).toHaveAttribute('aria-current', 'page')
  })

  it('mostra quem está conectado e permite sair', async () => {
    const sair = vi.fn()
    render(
      <MemoryRouter>
        <BarraLateral usuario={usuario('coordenacao')} onSair={sair} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Marina Duarte')).toBeInTheDocument()
    expect(screen.getByText('Coordenação')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(sair).toHaveBeenCalledOnce()
  })
})

describe('sem permissão (RW-06, RW-12)', () => {
  it('aluno é orientado a usar o aplicativo', () => {
    render(
      <MemoryRouter>
        <SemPermissao aluno />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'A gestão é para administração, coordenação e docentes' })).toBeInTheDocument()
    expect(screen.getByText(/aplicativo/)).toBeInTheDocument()
  })

  it('perfil de gestão sem acesso à área vê a explicação e volta ao painel', () => {
    render(
      <MemoryRouter>
        <SemPermissao />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Esta área não está disponível para o seu perfil' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toHaveAttribute('href', '/painel')
  })
})
