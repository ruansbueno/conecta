import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import HistoricoAviso from '../../src/paginas/avisos/historico'
import { SessaoProvider } from '../../src/sessao/contexto'
import { avisoGestao, erro, me, pagina, turma } from '../fixtures'

const ID = avisoGestao.id
const T1 = 't1-0000'
const T2 = 't2-0000'
const pessoa = { id: 'u1', nome: 'Ricardo Lemos' }

const EVENTOS = [
  { id: 'e5', tipo: 'excluido', usuario: pessoa, ocorrido_em: '2026-10-09T10:00:00Z', versao: null, alteracoes: null },
  { id: 'e4', tipo: 'desarquivado', usuario: pessoa, ocorrido_em: '2026-10-08T10:00:00Z', versao: null, alteracoes: null },
  { id: 'e3', tipo: 'arquivado', usuario: pessoa, ocorrido_em: '2026-10-08T09:00:00Z', versao: null, alteracoes: null },
  {
    id: 'e2',
    tipo: 'editado',
    usuario: pessoa,
    ocorrido_em: '2026-10-07T17:05:00Z',
    versao: 2,
    alteracoes: {
      titulo: { de: 'Entrega adiada para 23/10', para: 'Entrega adiada para 30/10' },
      destinos: {
        de: [
          { tipo: 'turma', turma_id: T1, semestre: null },
          { tipo: 'turma', turma_id: T2, semestre: null },
        ],
        para: [{ tipo: 'turma', turma_id: T1, semestre: null }],
      },
    },
  },
  { id: 'e1', tipo: 'criado', usuario: pessoa, ocorrido_em: '2026-10-07T12:08:00Z', versao: 1, alteracoes: null },
]

const VERSOES = [
  {
    versao: 2,
    titulo: 'Entrega adiada para 30/10',
    conteudo: 'Nova data: 30/10.',
    publicar_em: null,
    destinos: [{ tipo: 'turma', turma_id: T1, semestre: null }],
    criada_por: pessoa,
    criada_em: '2026-10-07T17:05:00Z',
  },
  {
    versao: 1,
    titulo: 'Entrega adiada para 23/10',
    conteudo: 'Nova data: 23/10.',
    publicar_em: null,
    destinos: [
      { tipo: 'turma', turma_id: T1, semestre: null },
      { tipo: 'turma', turma_id: T2, semestre: null },
    ],
    criada_por: pessoa,
    criada_em: '2026-10-07T12:08:00Z',
  },
]

type R = { status: number; corpo?: unknown }

function api(rotas: Record<string, R> = {}) {
  const chamadas: string[] = []
  const base: Record<string, R> = {
    'GET /me': { status: 200, corpo: me },
    [`GET /gestao/avisos/${ID}`]: { status: 200, corpo: { ...avisoGestao, versao_atual: 2 } },
    [`GET /gestao/avisos/${ID}/historico`]: { status: 200, corpo: pagina(EVENTOS) },
    [`GET /gestao/avisos/${ID}/versoes`]: { status: 200, corpo: pagina(VERSOES) },
    'GET /gestao/turmas': {
      status: 200,
      corpo: pagina([
        { ...turma, id: T1, nome: 'SI-3A' },
        { ...turma, id: T2, nome: 'SI-3B' },
      ]),
    },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const chave = `${init.method} ${url.replace('/api', '').split('?')[0]}`
      chamadas.push(chave)
      const { status, corpo } = base[chave] ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

function Lista() {
  const { state } = useLocation()
  return <p>lista: {state?.mensagem}</p>
}

function abrir(aba = 'historico', state?: unknown) {
  render(
    <MemoryRouter initialEntries={[{ pathname: `/avisos/${ID}`, search: `?aba=${aba}`, state }]}>
      <SessaoProvider>
        <Routes>
          <Route path="/avisos/:id" element={<HistoricoAviso />} />
          <Route path="/avisos" element={<Lista />} />
          <Route path="/sem-permissao" element={<p>tela sem permissão</p>} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

describe('histórico e versões do aviso (T06, RW-20, RW-21)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('cada tipo de evento aparece com autor e data, do mais recente ao mais antigo', async () => {
    api()
    abrir()
    const linha = await screen.findByRole('list', { name: 'Linha do tempo' })
    const titulos = within(linha)
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent)
    expect(titulos).toEqual(['Aviso excluído', 'Aviso desarquivado', 'Aviso arquivado', 'Aviso editado', 'Aviso criado'])
    expect(within(linha).getAllByText(/Ricardo Lemos/)).toHaveLength(5)
  })

  it('edição mostra o texto anterior e o novo', async () => {
    api()
    abrir()
    const linha = await screen.findByRole('list', { name: 'Linha do tempo' })
    expect(within(linha).getByRole('deletion')).toHaveTextContent('Entrega adiada para 23/10')
    expect(within(linha).getByRole('insertion')).toHaveTextContent('Entrega adiada para 30/10')
  })

  it('destinos alterados aparecem como conjunto, com os nomes das turmas', async () => {
    api()
    abrir()
    const linha = await screen.findByRole('list', { name: 'Linha do tempo' })
    expect(within(linha).getByText(/Removido/).closest('p')).toHaveTextContent('Removido: SI-3B · Mantido: SI-3A')
  })

  it('versão atual destacada; abrir uma versão mostra o conteúdo dela', async () => {
    api()
    abrir()
    const versoes = await screen.findByRole('region', { name: 'Versões' })
    expect(within(versoes).getByRole('button', { name: /Versão 2.*Atual/ })).toBeInTheDocument()

    await userEvent.click(within(versoes).getByRole('button', { name: /Versão 1/ }))

    expect(within(versoes).getByText('Nova data: 23/10.')).toBeInTheDocument()
    expect(within(versoes).getByLabelText('Destino: SI-3B')).toBeInTheDocument()
  })

  it('mensagem trazida da edição aparece no detalhe', async () => {
    api()
    abrir('conteudo', { mensagem: 'Alterações salvas. Esta é a versão 2.' })
    expect(await screen.findByText('Alterações salvas. Esta é a versão 2.')).toHaveAttribute('role', 'status')
  })

  it('aba Conteúdo mostra o aviso atual', async () => {
    api()
    abrir('conteudo')
    expect(await screen.findByText(avisoGestao.conteudo)).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Conteúdo' })).toHaveAttribute('aria-selected', 'true')
  })
})

describe('ciclo de vida no detalhe (RW-19, RW-41)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('arquivar pede confirmação explicando a consequência e atualiza a situação', async () => {
    const chamadas = api({
      [`POST /gestao/avisos/${ID}/arquivar`]: { status: 200, corpo: { ...avisoGestao, situacao: 'arquivado' } },
    })
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Arquivar' }))

    const dialogo = screen.getByRole('alertdialog', { name: 'Arquivar este aviso?' })
    expect(dialogo).toHaveAccessibleDescription(/sai dos avisos ativos/i)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Arquivar' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Aviso arquivado.')
    expect(chamadas).toContain(`POST /gestao/avisos/${ID}/arquivar`)
    expect(screen.getByRole('button', { name: 'Desarquivar' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('excluir confirma e volta à lista com a mensagem', async () => {
    const chamadas = api({ [`DELETE /gestao/avisos/${ID}`]: { status: 204 } })
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir este aviso?' })
    expect(dialogo).toHaveAccessibleDescription(/histórico e as versões continuam/)

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText('lista: Aviso excluído.')).toBeInTheDocument()
    expect(chamadas).toContain(`DELETE /gestao/avisos/${ID}`)
  })

  it('aviso excluído continua auditável e sem ações', async () => {
    api({ [`GET /gestao/avisos/${ID}`]: { status: 200, corpo: { ...avisoGestao, situacao: 'excluido' } } })
    abrir()
    expect(await screen.findByRole('list', { name: 'Linha do tempo' })).toBeInTheDocument()
    expect(screen.getByText('Excluído')).toBeInTheDocument()
    for (const acao of ['Arquivar', 'Desarquivar', 'Excluir']) {
      expect(screen.queryByRole('button', { name: acao })).not.toBeInTheDocument()
    }
  })

  it('aviso de outra pessoa leva à tela sem permissão', async () => {
    api({ [`GET /gestao/avisos/${ID}`]: { status: 403, corpo: erro('SEM_PERMISSAO') } })
    abrir()
    expect(await screen.findByText('tela sem permissão')).toBeInTheDocument()
  })
})
