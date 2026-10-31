import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import EditarEvento from '../../src/paginas/eventos/editar'
import NovoEvento from '../../src/paginas/eventos/novo'
import { erro, eventoGestao } from '../fixtures'
import { abrirEm, apiAgenda, T1, type Chamada } from './apoio-agenda'

const envios = (c: Chamada[], chave: string) => c.filter((x) => x.chave === chave).map((x) => x.corpo)
const novo = () => abrirEm('/eventos/novo', '/eventos/novo', <NovoEvento />, ['/eventos'])

async function escolherSi3a() {
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar destino' }))
  const seletor = screen.getByRole('dialog')
  await userEvent.click(within(seletor).getByRole('checkbox', { name: /SI-3A/ }))
  await userEvent.click(within(seletor).getByRole('button', { name: /^Adicionar/ }))
}

async function preencher() {
  await userEvent.type(await screen.findByLabelText('Título'), 'Defesas de TCC II')
  await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'banca')
  await userEvent.type(screen.getByLabelText('Início'), '2026-11-24T14:00')
  await userEvent.type(screen.getByLabelText('Local'), 'Sala 203')
}

describe('editor de evento (T12; plan-f2 D-F2-5)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('valida antes de enviar e leva o foco ao primeiro erro', async () => {
    const chamadas = apiAgenda()
    novo()

    await userEvent.click(await screen.findByRole('button', { name: 'Criar evento' }))

    expect(screen.getByLabelText('Título')).toHaveFocus()
    expect(screen.getByText('Informe um título com ao menos 3 caracteres.')).toBeInTheDocument()
    expect(screen.getByText('Escolha ao menos um destino.')).toBeInTheDocument()
    expect(envios(chamadas, 'POST /gestao/eventos')).toEqual([])
  })

  it('cria com os destinos escolhidos e volta à agenda com a mensagem', async () => {
    const chamadas = apiAgenda({ 'POST /gestao/eventos': { status: 201, corpo: eventoGestao } })
    novo()
    await preencher()
    await escolherSi3a()

    await userEvent.click(screen.getByRole('button', { name: 'Criar evento' }))

    await waitFor(() => expect(screen.getByTestId('onde')).toHaveTextContent(/^\/eventos$/))
    expect(envios(chamadas, 'POST /gestao/eventos')[0]).toMatchObject({
      titulo: 'Defesas de TCC II',
      tipo: 'banca',
      inicio: new Date('2026-11-24T14:00').toISOString(),
      local: 'Sala 203',
      destinos: [{ tipo: 'turma', turma_id: T1 }],
    })
    expect(localStorage.getItem('rascunho:evento:novo')).toBeNull()
  })

  it('docente escolhe só entre as turmas em que leciona', async () => {
    apiAgenda({}, 'docente')
    novo()

    expect(await screen.findByRole('checkbox', { name: /SI-3A/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Adicionar destino' })).not.toBeInTheDocument()
  })

  it('422 da API marca o campo indicado e nada digitado se perde', async () => {
    apiAgenda({
      'POST /gestao/eventos': {
        status: 422,
        corpo: erro('VALIDATION_ERROR', 'x', [{ campo: 'fim', mensagem: 'deve ser maior que inicio' }]),
      },
    })
    novo()
    await preencher()
    await escolherSi3a()

    await userEvent.click(screen.getByRole('button', { name: 'Criar evento' }))

    expect(await screen.findByText('deve ser maior que inicio')).toBeInTheDocument()
    expect(screen.getByLabelText('Fim')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Título')).toHaveValue('Defesas de TCC II')
  })

  it('sem rede: avisa, mantém o formulário e guarda o rascunho', async () => {
    apiAgenda({ 'POST /gestao/eventos': { status: 0, rede: true } })
    novo()
    await preencher()
    await escolherSi3a()

    await userEvent.click(screen.getByRole('button', { name: 'Criar evento' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar.')
    expect(screen.getByLabelText('Local')).toHaveValue('Sala 203')
    expect(localStorage.getItem('rascunho:evento:novo')).toContain('Defesas de TCC II')
  })

  it('editar abre com o evento e envia só o que mudou', async () => {
    const evento = { ...eventoGestao, id: 'e7e00000-0000-4000-8000-0000000000e1', inicio: new Date(2026, 10, 24, 14).toISOString(), fim: null }
    const chamadas = apiAgenda({
      'GET /gestao/eventos/e7e00000-0000-4000-8000-0000000000e1': { status: 200, corpo: evento },
      'PATCH /gestao/eventos/e7e00000-0000-4000-8000-0000000000e1': { status: 200, corpo: evento },
    })
    abrirEm('/eventos/e7e00000-0000-4000-8000-0000000000e1/editar', '/eventos/:id/editar', <EditarEvento />, ['/eventos'])

    const local = await screen.findByLabelText('Local')
    expect(local).toHaveValue('Sala 203')
    await userEvent.clear(local)
    await userEvent.type(local, 'Lab 4')
    await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    await waitFor(() => expect(envios(chamadas, 'PATCH /gestao/eventos/e7e00000-0000-4000-8000-0000000000e1')).toEqual([{ local: 'Lab 4' }]))
  })

  it('editar evento arquivado explica e não oferece salvar', async () => {
    apiAgenda({ 'GET /gestao/eventos/e7e00000-0000-4000-8000-0000000000e1': { status: 200, corpo: { ...eventoGestao, id: 'e7e00000-0000-4000-8000-0000000000e1', situacao: 'arquivado' } } })
    abrirEm('/eventos/e7e00000-0000-4000-8000-0000000000e1/editar', '/eventos/:id/editar', <EditarEvento />, ['/eventos'])

    expect(await screen.findByText('Eventos arquivados ou excluídos não podem ser editados.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
  })

  describe('rascunho de edição (achado da revisão)', () => {
    const ID = 'e7e00000-0000-4000-8000-0000000000e1'
    const evento = { ...eventoGestao, id: ID, editado_em: '2026-10-05T09:00:00Z' }
    const rascunho = (salvoEm: string) =>
      localStorage.setItem(
        `rascunho:evento:${ID}`,
        JSON.stringify({
          titulo: 'Título do rascunho',
          tipo: 'banca',
          inicio: '2026-11-24T14:00',
          fim: '',
          local: 'Sala do rascunho',
          descricao: '',
          destinos: [{ tipo: 'todos' }],
          salvoEm,
        }),
      )
    const abrirEdicao = () => abrirEm(`/eventos/${ID}/editar`, '/eventos/:id/editar', <EditarEvento />, ['/eventos', '/eventos/:id', '/sem-permissao'])

    it('abrir sem mexer não grava rascunho', async () => {
      apiAgenda({ [`GET /gestao/eventos/${ID}`]: { status: 200, corpo: evento } })
      abrirEdicao()

      await screen.findByLabelText('Local')
      expect(localStorage.getItem(`rascunho:evento:${ID}`)).toBeNull()
    })

    it('rascunho mais antigo que a última edição no servidor é descartado', async () => {
      rascunho('2026-10-04T09:00:00Z')
      apiAgenda({ [`GET /gestao/eventos/${ID}`]: { status: 200, corpo: evento } })
      abrirEdicao()

      expect(await screen.findByLabelText('Local')).toHaveValue('Sala 203')
      expect(localStorage.getItem(`rascunho:evento:${ID}`)).toBeNull()
    })

    it('rascunho mais novo volta e a página avisa', async () => {
      rascunho('2026-10-06T09:00:00Z')
      apiAgenda({ [`GET /gestao/eventos/${ID}`]: { status: 200, corpo: evento } })
      abrirEdicao()

      expect(await screen.findByLabelText('Local')).toHaveValue('Sala do rascunho')
      expect(screen.getByText(/Rascunho recuperado/)).toBeInTheDocument()
    })

    async function salvarCom(resposta: { status: number; corpo?: unknown }, extras = {}) {
      const chamadas = apiAgenda({
        [`GET /gestao/eventos/${ID}`]: { status: 200, corpo: evento },
        [`PATCH /gestao/eventos/${ID}`]: resposta,
        ...extras,
      })
      abrirEdicao()
      const local = await screen.findByLabelText('Local')
      await userEvent.clear(local)
      await userEvent.type(local, 'Lab 4')
      await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
      return chamadas
    }

    it('arquivado por outra pessoa durante a edição: oferece desarquivar', async () => {
      const chamadas = await salvarCom(
        { status: 409, corpo: erro('EVENTO_NAO_EDITAVEL') },
        { [`POST /gestao/eventos/${ID}/desarquivar`]: { status: 200, corpo: evento } },
      )

      await userEvent.click(await screen.findByRole('button', { name: 'Desarquivar' }))

      expect(await screen.findByText(/Agora você pode salvar as alterações/)).toBeInTheDocument()
      expect(chamadas.some((c) => c.chave === `POST /gestao/eventos/${ID}/desarquivar`)).toBe(true)
      expect(screen.getByLabelText('Local')).toHaveValue('Lab 4')
    })

    it('excluído durante a edição: volta à agenda com a mensagem', async () => {
      await salvarCom({ status: 404, corpo: erro('EVENTO_NAO_ENCONTRADO') })

      await waitFor(() => expect(screen.getByTestId('onde')).toHaveTextContent(/^\/eventos$/))
      expect(localStorage.getItem(`rascunho:evento:${ID}`)).toBeNull()
    })

    it('sem permissão leva à tela de sem permissão', async () => {
      await salvarCom({ status: 403, corpo: erro('SEM_PERMISSAO') })

      await waitFor(() => expect(screen.getByTestId('onde')).toHaveTextContent('/sem-permissao'))
    })

    it('"nenhuma alteração" da API não é falha', async () => {
      await salvarCom({
        status: 422,
        corpo: erro('VALIDATION_ERROR', 'x', [{ campo: 'body', mensagem: 'nenhuma alteração' }]),
      })

      expect(await screen.findByText('Nada foi alterado.')).toBeInTheDocument()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })
})

