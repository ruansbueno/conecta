import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apagarTodosRascunhos, lerRascunho } from '../../src/lib/rascunho'
import EditarAviso from '../../src/paginas/avisos/editar'
import { SessaoProvider } from '../../src/sessao/contexto'
import { avisoGestao, erro, me, pagina, turma } from '../fixtures'

const ID = avisoGestao.id
type R = { status: number; corpo?: unknown }

function api(rotas: Record<string, R>) {
  const chamadas: { chave: string; corpo?: Record<string, unknown> }[] = []
  const base: Record<string, R> = {
    'GET /me': { status: 200, corpo: me },
    'GET /gestao/turmas': { status: 200, corpo: pagina([turma]) },
    [`GET /gestao/avisos/${ID}`]: { status: 200, corpo: avisoGestao },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const chave = `${init.method} ${url.replace('/api', '').split('?')[0]}`
      chamadas.push({ chave, corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const { status, corpo } = base[chave] ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

async function abrir() {
  render(
    <MemoryRouter initialEntries={[`/avisos/${ID}/editar`]}>
      <SessaoProvider>
        <Routes>
          <Route path="/avisos/:id/editar" element={<EditarAviso />} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
  await screen.findByRole('heading', { name: 'Editar aviso' })
}

const salvar = () => userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
const patch = (c: { chave: string; corpo?: unknown }[]) => c.filter((x) => x.chave === `PATCH /gestao/avisos/${ID}`)

describe('edição de aviso (RW-18)', () => {
  beforeEach(() => apagarTodosRascunhos())
  afterEach(() => {
    vi.unstubAllGlobals()
    apagarTodosRascunhos()
  })

  it('abre com o aviso atual e avisa que salvar cria nova versão', async () => {
    api({})
    await abrir()
    expect(screen.getByLabelText('Título')).toHaveValue(avisoGestao.titulo)
    expect(screen.getByRole('button', { name: 'Remover destino 3º semestre' })).toBeInTheDocument()
    expect(screen.getByText(/cria a versão 3/)).toBeInTheDocument()
  })

  it('envia só o que mudou; destinos intactos não vão no corpo', async () => {
    const chamadas = api({ [`PATCH /gestao/avisos/${ID}`]: { status: 200, corpo: { ...avisoGestao, versao_atual: 3 } } })
    await abrir()
    await userEvent.clear(screen.getByLabelText('Conteúdo'))
    await userEvent.type(screen.getByLabelText('Conteúdo'), 'Mudou para sábado.')

    await salvar()

    expect(await screen.findByRole('heading', { name: 'Alterações salvas' })).toBeInTheDocument()
    expect(patch(chamadas)[0].corpo).toEqual({ conteudo: 'Mudou para sábado.' })
    expect(lerRascunho(`rascunho:aviso:${ID}`)).toBeNull()
  })

  it('destinos alterados vão como lista completa', async () => {
    const chamadas = api({ [`PATCH /gestao/avisos/${ID}`]: { status: 200, corpo: avisoGestao } })
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Remover destino 3º semestre' }))

    await salvar()

    await screen.findByRole('heading', { name: 'Alterações salvas' })
    expect(patch(chamadas)[0].corpo).toEqual({
      destinos: [{ tipo: 'turma', turma_id: avisoGestao.destinos[0].turma!.id }],
    })
  })

  it('sem alteração não chama a API', async () => {
    const chamadas = api({})
    await abrir()

    await salvar()

    expect(screen.getByText('Nenhuma alteração para salvar.')).toBeInTheDocument()
    expect(patch(chamadas)).toHaveLength(0)
  })

  it('aviso arquivado: oferece desarquivar e mantém o texto', async () => {
    const chamadas = api({
      [`PATCH /gestao/avisos/${ID}`]: { status: 409, corpo: erro('AVISO_NAO_EDITAVEL') },
      [`POST /gestao/avisos/${ID}/desarquivar`]: { status: 200, corpo: avisoGestao },
    })
    await abrir()
    await userEvent.type(screen.getByLabelText('Título'), ' (novo)')

    await salvar()
    await userEvent.click(await screen.findByRole('button', { name: 'Desarquivar' }))

    expect(chamadas.map((c) => c.chave)).toContain(`POST /gestao/avisos/${ID}/desarquivar`)
    expect(await screen.findByText(/Aviso desarquivado/)).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toHaveValue(`${avisoGestao.titulo} (novo)`)
  })

  it('aviso inexistente mostra o erro', async () => {
    api({ [`GET /gestao/avisos/${ID}`]: { status: 404, corpo: erro('AVISO_NAO_ENCONTRADO') } })
    render(
      <MemoryRouter initialEntries={[`/avisos/${ID}/editar`]}>
        <SessaoProvider>
          <Routes>
            <Route path="/avisos/:id/editar" element={<EditarAviso />} />
          </Routes>
        </SessaoProvider>
      </MemoryRouter>,
    )
    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })
})
