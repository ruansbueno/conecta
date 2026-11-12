import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BarraSuperior } from '../../src/componentes/layout/barra-superior'
import { CHAVE_TEMA } from '../../src/lib/tema'
import Login from '../../src/paginas/login'
import { SemPermissao } from '../../src/paginas/sem-permissao'
import { SessaoProvider } from '../../src/sessao/contexto'
import { limparTema, sistemaEm } from '../apoio-tema'

// Spec 002, User Story 1 (FR-001 a FR-006).
afterEach(limparTema)

const html = () => document.documentElement
const ativar = () => screen.getByRole('button', { name: 'Ativar modo noturno' })
const desativar = () => screen.getByRole('button', { name: 'Desativar modo noturno' })

function barra() {
  render(<BarraSuperior titulo="Painel" subtitulo="Coordenação" />)
}

describe('botão do modo noturno', () => {
  it('no claro: lua, "Ativar modo noturno", com a mesma dica ao passar o mouse', () => {
    sistemaEm(false)
    barra()
    expect(ativar()).toHaveAttribute('title', 'Ativar modo noturno')
    expect(ativar().querySelector('svg')).toHaveAttribute('data-icone', 'lua')
  })

  it('sistema escuro e sem escolha: começa no escuro, com o sol', () => {
    sistemaEm(true)
    barra()
    expect(desativar().querySelector('svg')).toHaveAttribute('data-icone', 'sol')
    expect(html().dataset.tema).toBe('escuro')
  })

  it('acionar alterna na hora, guarda a escolha e troca o símbolo', async () => {
    sistemaEm(false)
    barra()

    await userEvent.click(ativar())

    expect(html().dataset.tema).toBe('escuro')
    expect(html().style.colorScheme).toBe('dark')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
    await userEvent.click(desativar())
    expect(html().dataset.tema).toBe('claro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('claro')
  })

  it('funciona pelo teclado (Enter e espaço)', async () => {
    sistemaEm(false)
    barra()
    ativar().focus()

    await userEvent.keyboard('{Enter}')
    expect(html().dataset.tema).toBe('escuro')
    await userEvent.keyboard(' ')
    expect(html().dataset.tema).toBe('claro')
  })

  it('a escolha guardada vence o sistema', () => {
    sistemaEm(true)
    localStorage.setItem(CHAVE_TEMA, 'claro')
    barra()
    expect(ativar()).toBeInTheDocument()
    expect(html().dataset.tema).toBe('claro')
  })

  it('sem escolha, acompanha o sistema; depois de escolher, não acompanha mais', async () => {
    const sistema = sistemaEm(false)
    barra()

    act(() => sistema.mudar(true))
    expect(desativar()).toBeInTheDocument()
    expect(html().dataset.tema).toBe('escuro')

    await userEvent.click(desativar())
    act(() => sistema.mudar(true))
    expect(ativar()).toBeInTheDocument()
    expect(html().dataset.tema).toBe('claro')
  })

  it('escolha feita em outra aba vale aqui também', () => {
    sistemaEm(false)
    barra()

    act(() => {
      localStorage.setItem(CHAVE_TEMA, 'escuro')
      window.dispatchEvent(new StorageEvent('storage', { key: CHAVE_TEMA, newValue: 'escuro' }))
    })

    expect(desativar()).toBeInTheDocument()
    expect(html().dataset.tema).toBe('escuro')
  })

  it('sai sem deixar ouvintes do sistema para trás', () => {
    const sistema = sistemaEm(false)
    const { unmount } = render(<BarraSuperior titulo="Painel" />)
    expect(sistema.ouvintes()).toBeGreaterThan(0)
    unmount()
    expect(sistema.ouvintes()).toBe(0)
  })
})

describe('o botão está em toda tela (FR-001)', () => {
  it('barra superior da gestão, à direita das ações da página', () => {
    sistemaEm(false)
    render(<BarraSuperior titulo="Avisos" acoes={<button type="button">Ação da página</button>} />)
    const botoes = screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent)
    expect(botoes).toEqual(['Ação da página', 'Ativar modo noturno'])
  })

  it('login, sem perder o que foi digitado ao trocar', async () => {
    sistemaEm(false)
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 401 })))
    render(
      <MemoryRouter initialEntries={['/login']}>
        <SessaoProvider>
          <Login />
        </SessaoProvider>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Usuário'), 'coord.teste')

    await userEvent.click(ativar())

    expect(html().dataset.tema).toBe('escuro')
    expect(screen.getByLabelText('Usuário')).toHaveValue('coord.teste')
  })

  it('"Sem permissão" aberta fora da gestão (aluno)', () => {
    sistemaEm(false)
    render(
      <MemoryRouter>
        <SemPermissao aluno />
      </MemoryRouter>,
    )
    expect(ativar()).toBeInTheDocument()
  })
})
