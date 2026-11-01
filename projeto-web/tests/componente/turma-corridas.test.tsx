// Corridas e entradas ruins do detalhe da turma e do vincular (revisão da fase 6).
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import HistoricoAviso from '../../src/paginas/avisos/historico'
import DetalheTurma from '../../src/paginas/turmas/detalhe'
import { SessaoProvider } from '../../src/sessao/contexto'
import { erro, me, pagina, turma } from '../fixtures'

const ID = turma.id
const vinculo = (id: string, nome: string, papel: string) => ({
  usuario: { id, username: id, nome },
  papel,
  origem: 'gestao',
  criado_em: '2026-08-01T12:00:00Z',
})
const pessoa = (id: string, nome: string) => ({ id, username: id, nome, perfil: 'aluno', ativo: true, ultimo_login_em: null })

type Responder = (query: URLSearchParams) => Response | Promise<Response>
const json = (status: number, corpo?: unknown) => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })

function api(rotas: Record<string, Responder>) {
  const chamadas: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const chave = `${init.method} ${caminho}`
      chamadas.push(chave)
      if (chave === 'GET /me') return json(200, me)
      const r = rotas[chave]
      return r ? r(new URLSearchParams(busca)) : json(404, erro('NAO_ENCONTRADO'))
    }),
  )
  return chamadas
}

function abrir(caminho: string) {
  render(
    <MemoryRouter initialEntries={[caminho]}>
      <SessaoProvider>
        <Routes>
          <Route path="/turmas/:id" element={<DetalheTurma />} />
          <Route path="/avisos/:id" element={<HistoricoAviso />} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe('detalhe da turma sob corrida', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('resposta atrasada de outro papel não substitui a lista do papel escolhido', async () => {
    let liberarTodos: () => void = () => undefined
    let primeira = true
    api({
      [`GET /gestao/turmas/${ID}`]: () => json(200, turma),
      [`GET /gestao/turmas/${ID}/vinculos`]: (q) => {
        if (q.get('papel') === 'docente') return json(200, pagina([vinculo('d1', 'Ricardo Lemos', 'docente')]))
        if (!primeira) return json(200, pagina([vinculo('a1', 'Júlia Santos', 'aluno'), vinculo('d1', 'Ricardo Lemos', 'docente')]))
        primeira = false
        return json(200, pagina([vinculo('a1', 'Júlia Santos', 'aluno'), vinculo('d1', 'Ricardo Lemos', 'docente')]))
      },
    })
    abrir(`/turmas/${ID}`)
    await screen.findByRole('table', { name: /Vínculos/ })

    // A volta para "Todos" demora; antes dela chega a de "Docentes".
    api({
      [`GET /gestao/turmas/${ID}`]: () => json(200, turma),
      [`GET /gestao/turmas/${ID}/vinculos`]: (q) =>
        q.get('papel') === 'docente'
          ? new Promise((r) => setTimeout(() => r(json(200, pagina([vinculo('d1', 'Ricardo Lemos', 'docente')]))), 50))
          : new Promise((r) => (liberarTodos = () => r(json(200, pagina([vinculo('a1', 'Júlia Santos', 'aluno')]))))),
    })
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Papel' }), 'Alunos')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Papel' }), 'Docentes')
    // Chegou a lista de docentes (a inicial também tinha a Júlia).
    await waitFor(() => expect(screen.getByRole('table', { name: /Vínculos/ })).not.toHaveTextContent('Júlia Santos'))

    await act(async () => liberarTodos())

    const tabela = screen.getByRole('table', { name: /Vínculos/ })
    expect(within(tabela).queryByText('Júlia Santos')).not.toBeInTheDocument()
    expect(within(tabela).getByText('Ricardo Lemos')).toBeInTheDocument()
  })

  it('enquanto uma remoção está em curso, as outras ficam indisponíveis (nada é ignorado em silêncio)', async () => {
    let liberar: () => void = () => undefined
    api({
      [`GET /gestao/turmas/${ID}`]: () => json(200, turma),
      [`GET /gestao/turmas/${ID}/vinculos`]: () =>
        json(200, pagina([vinculo('a1', 'Júlia Santos', 'aluno'), vinculo('a2', 'Caio Ribeiro', 'aluno')])),
      [`DELETE /gestao/turmas/${ID}/vinculos/a1`]: () => new Promise((r) => (liberar = () => r(json(204)))),
    })
    abrir(`/turmas/${ID}`)
    await userEvent.click(await screen.findByRole('button', { name: 'Remover vínculo de Júlia Santos' }))
    await userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Remover vínculo' }))

    expect(screen.getByRole('button', { name: 'Remover vínculo de Caio Ribeiro' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Vincular aluno' })).toBeDisabled()

    await act(async () => liberar())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Remover vínculo de Caio Ribeiro' })).toBeEnabled())
  })

  it('no vincular, resultado de uma busca anterior não fica escolhível nem escolhido', async () => {
    let liberarSegunda: () => void = () => undefined
    api({
      [`GET /gestao/turmas/${ID}`]: () => json(200, turma),
      [`GET /gestao/turmas/${ID}/vinculos`]: () => json(200, pagina([])),
      'GET /gestao/usuarios': (q) =>
        q.get('q') === 'ana'
          ? json(200, pagina([pessoa('p1', 'Ana Lima')]))
          : new Promise((r) => (liberarSegunda = () => r(json(200, pagina([pessoa('p2', 'Anabela Souza')]))))),
    })
    abrir(`/turmas/${ID}`)
    await userEvent.click(await screen.findByRole('button', { name: 'Vincular aluno' }))
    const dialogo = screen.getByRole('dialog', { name: 'Vincular aluno' })
    await userEvent.type(within(dialogo).getByRole('searchbox'), 'ana')
    await userEvent.click(await within(dialogo).findByRole('radio', { name: /Ana Lima/ }))

    await userEvent.type(within(dialogo).getByRole('searchbox'), 'b')

    expect(within(dialogo).queryByRole('radio', { name: /Ana Lima/ })).not.toBeInTheDocument()
    expect(within(dialogo).getByRole('button', { name: 'Vincular' })).toBeDisabled()
    await waitFor(() => expect(liberarSegunda).not.toBe(undefined))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 350))
      liberarSegunda()
    })
    expect(await within(dialogo).findByRole('radio', { name: /Anabela Souza/ })).not.toBeChecked()
    expect(within(dialogo).getByRole('button', { name: 'Vincular' })).toBeDisabled()
  })
})

describe('vincular: trocar de papel no meio da carga', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('quem já está na turma vem do papel aberto agora, não de uma resposta atrasada do anterior', async () => {
    let liberarDocentes: () => void = () => undefined
    api({
      [`GET /gestao/turmas/${ID}`]: () => json(200, turma),
      [`GET /gestao/turmas/${ID}/vinculos`]: (q) =>
        q.get('papel') === 'docente'
          ? new Promise((r) => (liberarDocentes = () => r(json(200, pagina([vinculo('d1', 'Ricardo Lemos', 'docente')])))))
          : q.get('papel') === 'aluno'
            ? json(200, pagina([vinculo('a1', 'Júlia Santos', 'aluno')]))
            : json(200, pagina([])),
      'GET /gestao/usuarios': () => json(200, pagina([pessoa('a1', 'Júlia Santos')])),
    })
    abrir(`/turmas/${ID}`)
    // Abre o de docente e, antes de a lista dos docentes chegar, troca para o de aluno.
    await userEvent.click(await screen.findByRole('button', { name: 'Vincular docente' }))
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Vincular docente' })).getByRole('button', { name: 'Cancelar' }))
    await userEvent.click(screen.getByRole('button', { name: 'Vincular aluno' }))
    const dialogo = screen.getByRole('dialog', { name: 'Vincular aluno' })
    await userEvent.type(within(dialogo).getByRole('searchbox'), 'jú')
    expect(await within(dialogo).findByRole('radio', { name: /Júlia Santos/ })).toBeDisabled()

    await act(async () => liberarDocentes())

    expect(within(dialogo).getByRole('radio', { name: /Júlia Santos/ })).toBeDisabled()
    expect(within(dialogo).getByText('Já está na turma')).toBeInTheDocument()
  })
})

describe('id inválido no endereço (a API real responde 422)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('turma: mostra "não está mais disponível" sem chamar a API', async () => {
    const chamadas = api({})
    abrir('/turmas/abc')
    expect(await screen.findByText('Esta turma não está mais disponível.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.startsWith('GET /gestao'))).toHaveLength(0)
  })

  it('aviso: mostra "não está mais disponível" sem chamar a API', async () => {
    const chamadas = api({})
    abrir('/avisos/abc')
    expect(await screen.findByText('Este aviso não está mais disponível.')).toBeInTheDocument()
    expect(chamadas.filter((c) => c.startsWith('GET /gestao/avisos'))).toHaveLength(0)
  })
})
