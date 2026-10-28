import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { apagarTodosRascunhos, lerRascunho, salvarRascunho } from '../../src/lib/rascunho'
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

    expect(screen.getByRole('status')).toHaveTextContent('Nenhuma alteração para salvar.')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(patch(chamadas)).toHaveLength(0)
  })

  it('"nenhuma alteração" vindo da API informa, sem tratar como falha', async () => {
    api({
      [`PATCH /gestao/avisos/${ID}`]: {
        status: 422,
        corpo: erro('VALIDATION_ERROR', 'Dados inválidos', [{ campo: 'body', mensagem: 'nenhuma alteração' }]),
      },
    })
    await abrir()
    await userEvent.click(screen.getByRole('button', { name: 'Remover destino 3º semestre' }))

    await salvar()

    expect(await screen.findByRole('status')).toHaveTextContent('Nenhuma alteração para salvar.')
    expect(screen.queryByText('Confira os campos destacados.')).not.toBeInTheDocument()
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

  describe('rascunho da edição', () => {
    const rascunho = { titulo: 'Título do rascunho', conteudo: 'Conteúdo do rascunho', destinos: [] }

    it('mais novo que a última edição: é recuperado e anunciado', async () => {
      salvarRascunho(`rascunho:aviso:${ID}`, rascunho)
      api({})
      await abrir()

      expect(screen.getByLabelText('Título')).toHaveValue('Título do rascunho')
      expect(screen.getByText(/Rascunho recuperado/)).toBeInTheDocument()
    })

    it('mais antigo que a última edição (de outra pessoa): é descartado, vale o aviso atual', async () => {
      salvarRascunho(`rascunho:aviso:${ID}`, rascunho)
      api({ [`GET /gestao/avisos/${ID}`]: { status: 200, corpo: { ...avisoGestao, editado_em: '2099-01-01T00:00:00Z' } } })
      await abrir()

      expect(screen.getByLabelText('Título')).toHaveValue(avisoGestao.titulo)
      expect(screen.queryByText(/Rascunho recuperado/)).not.toBeInTheDocument()
      expect(lerRascunho(`rascunho:aviso:${ID}`)).toBeNull()
    })
  })

  describe('aviso agendado (ativo com publicar_em futuro)', () => {
    const quando = new Date(Date.now() + 2 * 86_400_000)
    quando.setHours(8, 0, 30, 0) // segundos não fazem parte do formulário
    const agendado = { ...avisoGestao, situacao: 'ativo', publicar_em: quando.toISOString() }

    it('abre com o agendamento e muda só o horário', async () => {
      const chamadas = api({
        [`GET /gestao/avisos/${ID}`]: { status: 200, corpo: agendado },
        [`PATCH /gestao/avisos/${ID}`]: { status: 200, corpo: agendado },
      })
      await abrir()
      expect(screen.getByRole('button', { name: 'Agendar' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByLabelText('Hora da publicação')).toHaveValue('08:00')

      await userEvent.clear(screen.getByLabelText('Hora da publicação'))
      await userEvent.type(screen.getByLabelText('Hora da publicação'), '10:30')
      await salvar()

      await screen.findByRole('heading', { name: 'Alterações salvas' })
      const esperado = new Date(quando)
      esperado.setHours(10, 30, 0, 0)
      expect(patch(chamadas)[0].corpo).toEqual({ publicar_em: esperado.toISOString() })
    })

    it('mudar só o título não reenvia a data', async () => {
      const chamadas = api({
        [`GET /gestao/avisos/${ID}`]: { status: 200, corpo: agendado },
        [`PATCH /gestao/avisos/${ID}`]: { status: 200, corpo: agendado },
      })
      await abrir()
      await userEvent.type(screen.getByLabelText('Título'), '!')

      await salvar()

      await screen.findByRole('heading', { name: 'Alterações salvas' })
      expect(patch(chamadas)[0].corpo).toEqual({ titulo: `${avisoGestao.titulo}!` })
    })
  })

  function montarSemEsperar() {
    render(
      <MemoryRouter initialEntries={[`/avisos/${ID}/editar`]}>
        <SessaoProvider>
          <Routes>
            <Route path="/avisos/:id/editar" element={<EditarAviso />} />
            <Route path="/sem-permissao" element={<p>tela sem permissão</p>} />
          </Routes>
        </SessaoProvider>
      </MemoryRouter>,
    )
  }

  it('aviso que não existe mais: explica e oferece voltar, sem "tentar de novo"', async () => {
    api({ [`GET /gestao/avisos/${ID}`]: { status: 404, corpo: erro('AVISO_NAO_ENCONTRADO') } })
    montarSemEsperar()

    expect(await screen.findByText('Este aviso não está mais disponível.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
  })

  it('aviso de outra pessoa (403 SEM_PERMISSAO) leva à tela sem permissão (RW-12)', async () => {
    api({ [`GET /gestao/avisos/${ID}`]: { status: 403, corpo: erro('SEM_PERMISSAO') } })
    montarSemEsperar()

    expect(await screen.findByText('tela sem permissão')).toBeInTheDocument()
  })

  it('falha de rede ao abrir permite tentar de novo', async () => {
    api({ [`GET /gestao/avisos/${ID}`]: { status: 503, corpo: erro('ERRO_INTERNO') } })
    montarSemEsperar()

    expect(await screen.findByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
