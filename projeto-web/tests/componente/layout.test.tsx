import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { BarraLateral } from '../../src/componentes/layout/barra-lateral'
import { Casca } from '../../src/componentes/layout/casca'
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

function Onde() {
  return <p data-testid="rota">{useLocation().pathname}</p>
}

function casca(caminho = '/painel') {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <Casca usuario={usuario('coordenacao')} secao="Painel" onSair={() => {}}>
        <Onde />
      </Casca>
    </MemoryRouter>,
  )
  return screen.getByRole('button', { name: 'Abrir menu' })
}

describe('gaveta de navegação abaixo de 1024 px (spec 003, RR-01 a RR-03)', () => {
  it('"Abrir menu" abre a gaveta com a mesma navegação do perfil', async () => {
    const abrir = casca()
    expect(abrir).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(abrir)

    const gaveta = screen.getByRole('dialog', { name: 'Menu' })
    expect(within(gaveta).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Painel', 'Avisos', 'Agenda', 'Turmas', 'Horários', 'Solicitações', 'Usuários',
    ])
    expect(abrir).toHaveAttribute('aria-expanded', 'true')
    expect(abrir).toHaveAttribute('aria-controls', 'gaveta-menu')
  })

  it('Esc fecha a gaveta e devolve o foco ao botão', async () => {
    const abrir = casca()
    await userEvent.click(abrir)

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  it('escolher um item fecha a gaveta e navega', async () => {
    await userEvent.click(casca())

    await userEvent.click(within(screen.getByRole('dialog', { name: 'Menu' })).getByRole('link', { name: 'Turmas' }))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
    expect(screen.getByTestId('rota')).toHaveTextContent('/turmas')
  })

  it('tocar no véu fecha a gaveta', async () => {
    await userEvent.click(casca())

    await userEvent.click(screen.getByTestId('veu-menu'))

    expect(screen.queryByRole('dialog', { name: 'Menu' })).not.toBeInTheDocument()
  })

  it('Tab não sai da gaveta', async () => {
    await userEvent.click(casca())
    const gaveta = screen.getByRole('dialog', { name: 'Menu' })
    within(gaveta).getByRole('button', { name: 'Sair' }).focus()

    await userEvent.tab()

    expect(within(gaveta).getByRole('button', { name: 'Fechar menu' })).toHaveFocus()
  })
})
