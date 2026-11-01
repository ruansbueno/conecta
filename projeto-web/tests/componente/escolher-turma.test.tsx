import { screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import EscolherTurma from '../../src/paginas/horarios/escolher-turma'
import { lembrarTurmaDosHorarios } from '../../src/lib/rascunho'
import { navegacaoDoPerfil, itemAtivo } from '../../src/componentes/layout/navegacao'
import { pagina, turma } from '../fixtures'
import { abrirEm, apiAgenda } from './apoio-agenda'

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

const OUTRA = { ...turma, id: 'c3f0a1b2-0000-4000-8000-000000000002', codigo: 'SI-3B', nome: 'Sistemas para Internet 3B' }
const SI3A = { ...turma, codigo: 'SI-3A', nome: 'Sistemas para Internet 3A' }

describe('escolher a turma dos horários (T13, plan-f2 D-F2-3)', () => {
  it('lista as turmas ativas, cada uma levando à sua grade', async () => {
    const chamadas = apiAgenda({ 'GET /gestao/turmas': { status: 200, corpo: pagina([SI3A, OUTRA]) } })
    abrirEm('/horarios', '/horarios', <EscolherTurma />)
    const lista = await screen.findByRole('list', { name: 'Turmas ativas' })
    expect(within(lista).getByRole('link', { name: /SI-3B/ })).toHaveAttribute('href', `/turmas/${OUTRA.id}/horarios`)
    expect(chamadas.find((c) => c.chave === 'GET /gestao/turmas')!.query.get('ativa')).toBe('true')
  })

  it('lembra a última turma aberta e a oferece primeiro', async () => {
    lembrarTurmaDosHorarios(OUTRA.id)
    apiAgenda({ 'GET /gestao/turmas': { status: 200, corpo: pagina([SI3A, OUTRA]) } })
    abrirEm('/horarios', '/horarios', <EscolherTurma />)
    expect(await screen.findByRole('link', { name: /continuar em SI-3B/i })).toHaveAttribute('href', `/turmas/${OUTRA.id}/horarios`)
  })

  it('a última turma que não está mais ativa não é oferecida', async () => {
    lembrarTurmaDosHorarios('c3f0a1b2-0000-4000-8000-0000000000ff')
    apiAgenda({ 'GET /gestao/turmas': { status: 200, corpo: pagina([SI3A]) } })
    abrirEm('/horarios', '/horarios', <EscolherTurma />)
    await screen.findByRole('list', { name: 'Turmas ativas' })
    expect(screen.queryByRole('link', { name: /continuar em/i })).not.toBeInTheDocument()
  })

  it('sem turma ativa: estado vazio', async () => {
    apiAgenda({ 'GET /gestao/turmas': { status: 200, corpo: pagina([]) } })
    abrirEm('/horarios', '/horarios', <EscolherTurma />)
    expect(await screen.findByText('Nenhuma turma ativa')).toBeInTheDocument()
  })
})

describe('item Horários na barra lateral (D-F2-13)', () => {
  const itens = (perfil: string) => navegacaoDoPerfil(perfil).flatMap((g) => g.itens.map((i) => i.rotulo))
  it('administração e coordenação veem Horários; docente não', () => {
    expect(itens('coordenacao')).toContain('Horários')
    expect(itens('administrador')).toContain('Horários')
    expect(itens('docente')).not.toContain('Horários')
  })

  it('a grade de uma turma marca Horários, não Turmas', () => {
    const grade = `/turmas/${turma.id}/horarios`
    expect(itemAtivo('/horarios', grade)).toBe(true)
    expect(itemAtivo('/turmas', grade)).toBe(false)
    expect(itemAtivo('/turmas', `/turmas/${turma.id}`)).toBe(true)
    expect(itemAtivo('/horarios', '/horarios')).toBe(true)
    expect(itemAtivo('/avisos', '/avisos/novo')).toBe(true)
    expect(itemAtivo('/avisos', '/avisosx')).toBe(false)
  })
})
