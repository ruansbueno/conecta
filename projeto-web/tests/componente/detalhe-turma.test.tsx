import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import DetalheTurma from '../../src/paginas/turmas/detalhe'
import { SessaoProvider } from '../../src/sessao/contexto'
import { erro, me, meDocente, pagina, turma } from '../fixtures'

const ID = turma.id
const pessoa = (id: string, nome: string, username: string, perfil: string) => ({
  id,
  username,
  nome,
  perfil,
  ativo: true,
  ultimo_login_em: null,
})
const vinculo = (id: string, nome: string, username: string, papel: string, origem: string) => ({
  usuario: { id, username, nome },
  papel,
  origem,
  criado_em: '2026-08-01T12:00:00Z',
})
const VINCULOS = [
  vinculo('d1', 'Ricardo Lemos', 'ricardo.lemos', 'docente', 'gestao'),
  vinculo('a1', 'Júlia Santos', 'julia.santos', 'aluno', 'solicitacao'),
  vinculo('a2', 'Caio Ribeiro', 'caio.ribeiro', 'aluno', 'seed'),
]

type R = { status: number; corpo?: unknown }
type Chamada = { chave: string; query: URLSearchParams; corpo?: unknown }

type Rota = R | R[] | ((q: URLSearchParams) => R)

function api(rotas: Record<string, Rota> = {}, perfil: 'coordenacao' | 'docente' = 'coordenacao') {
  const chamadas: Chamada[] = []
  const base: Record<string, Rota> = {
    'GET /me': { status: 200, corpo: perfil === 'docente' ? meDocente : me },
    [`GET /gestao/turmas/${ID}`]: { status: 200, corpo: turma },
    [`GET /gestao/turmas/${ID}/vinculos`]: { status: 200, corpo: pagina(VINCULOS) },
    'GET /gestao/usuarios': {
      status: 200,
      corpo: pagina([pessoa('d1', 'Ricardo Lemos', 'ricardo.lemos', 'docente'), pessoa('d2', 'Helena Prado', 'helena.prado', 'docente')]),
    },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const chave = `${init.method} ${caminho}`
      chamadas.push({ chave, query: new URLSearchParams(busca), corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const r = base[chave]
      const atual = typeof r === 'function' ? r(new URLSearchParams(busca)) : Array.isArray(r) ? (r.length > 1 ? r.shift()! : r[0]) : r
      const { status, corpo } = atual ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

function abrir() {
  render(
    <MemoryRouter initialEntries={[`/turmas/${ID}`]}>
      <SessaoProvider>
        <Routes>
          <Route path="/turmas/:id" element={<DetalheTurma />} />
          <Route path="/turmas" element={<p>lista de turmas</p>} />
          <Route path="/sem-permissao" element={<p>tela sem permissão</p>} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const tabelaVinculos = () => screen.findByRole('table', { name: /Vínculos/ })
const confirmar = async (botao: string) =>
  userEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: botao }))

describe('detalhe da turma (T08, RW-25, RW-26)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('mostra os dados da turma e os vínculos com papel, origem e data', async () => {
    api()
    abrir()
    expect(await screen.findByRole('heading', { level: 1, name: turma.nome })).toBeInTheDocument()
    const dados = screen.getByRole('region', { name: 'Dados da turma' })
    for (const t of [turma.codigo, '3º', '2026/2', '38 alunos · 4 docentes', 'Abertas', 'Ativa']) {
      expect(dados).toHaveTextContent(t)
    }
    const linha = within(await tabelaVinculos()).getByRole('row', { name: /Júlia Santos/ })
    expect(linha).toHaveTextContent('julia.santos')
    expect(linha).toHaveTextContent('Aluno')
    expect(linha).toHaveTextContent('Solicitação aprovada')
    expect(linha).toHaveTextContent('01/08/2026')
    expect(within(await tabelaVinculos()).getByRole('row', { name: /Caio Ribeiro/ })).toHaveTextContent('Carga inicial')
  })

  it('filtro por papel vai para a API; busca filtra os nomes carregados', async () => {
    const chamadas = api()
    abrir()
    await tabelaVinculos()

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Papel' }), 'Docentes')
    await waitFor(() =>
      expect(chamadas.filter((c) => c.chave === `GET /gestao/turmas/${ID}/vinculos`).at(-1)?.query.get('papel')).toBe('docente'),
    )

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Papel' }), 'Todos')
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar pessoa na turma' }), 'júlia')
    const tabela = await tabelaVinculos()
    await waitFor(() => expect(within(tabela).queryByRole('row', { name: /Caio/ })).not.toBeInTheDocument())
    expect(within(tabela).getByRole('row', { name: /Júlia/ })).toBeInTheDocument()
  })

  it('fechar inscrições explica o efeito antes e atualiza a turma', async () => {
    const chamadas = api({ [`PATCH /gestao/turmas/${ID}`]: { status: 200, corpo: { ...turma, inscricoes_abertas: false } } })
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Fechar inscrições' }))
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(/deixam de ver esta turma para pedir inscrição/)

    await confirmar('Fechar inscrições')

    expect(await screen.findByRole('status')).toHaveTextContent('Inscrições fechadas.')
    expect(chamadas.find((c) => c.chave === `PATCH /gestao/turmas/${ID}`)?.corpo).toEqual({ inscricoes_abertas: false })
    expect(screen.getByRole('region', { name: 'Dados da turma' })).toHaveTextContent('Fechadas')
    expect(screen.getByRole('button', { name: 'Abrir inscrições' })).toBeInTheDocument()
  })

  it('desativar explica que vínculos ficam e avisos param; depois dá para reativar', async () => {
    const chamadas = api({
      [`DELETE /gestao/turmas/${ID}`]: { status: 204 },
      [`GET /gestao/turmas/${ID}`]: [
        { status: 200, corpo: turma },
        { status: 200, corpo: { ...turma, ativa: false } },
      ],
      [`PATCH /gestao/turmas/${ID}`]: { status: 200, corpo: turma },
    })
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Desativar turma' }))
    expect(screen.getByRole('alertdialog')).toHaveAccessibleDescription(/vínculos são preservados.*deixam de ser entregues/)

    await confirmar('Desativar turma')

    expect(await screen.findByRole('status')).toHaveTextContent('Turma desativada.')
    expect(chamadas.map((c) => c.chave)).toContain(`DELETE /gestao/turmas/${ID}`)
    expect(screen.getByRole('region', { name: 'Dados da turma' })).toHaveTextContent('Inativa')

    await userEvent.click(screen.getByRole('button', { name: 'Reativar turma' }))
    expect(await screen.findByText('Turma reativada.')).toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === `PATCH /gestao/turmas/${ID}`)?.corpo).toEqual({ ativa: true })
  })

  it('editar turma pelo cabeçalho', async () => {
    api({ [`PATCH /gestao/turmas/${ID}`]: { status: 200, corpo: { ...turma, nome: 'TADS 3A noturno' } } })
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Editar turma' }))
    const dialogo = screen.getByRole('dialog', { name: 'Editar turma' })
    await userEvent.clear(within(dialogo).getByLabelText('Nome'))
    await userEvent.type(within(dialogo).getByLabelText('Nome'), 'TADS 3A noturno')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar alterações' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'TADS 3A noturno' })).toBeInTheDocument()
  })
})

describe('vínculos (RW-26, RW-27)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('remover vínculo alerta a perda imediata de acesso e recarrega', async () => {
    const chamadas = api({ [`DELETE /gestao/turmas/${ID}/vinculos/a1`]: { status: 204 } })
    abrir()
    const linha = within(await tabelaVinculos()).getByRole('row', { name: /Júlia Santos/ })

    await userEvent.click(within(linha).getByRole('button', { name: 'Remover vínculo de Júlia Santos' }))
    expect(screen.getByRole('alertdialog', { name: 'Remover o vínculo de Júlia Santos?' })).toHaveAccessibleDescription(
      /perde na hora o acesso aos avisos desta turma/,
    )
    await confirmar('Remover vínculo')

    expect(await screen.findByRole('status')).toHaveTextContent('Vínculo de Júlia Santos removido.')
    expect(screen.getByRole('status')).toHaveFocus()
    expect(chamadas.map((c) => c.chave)).toContain(`DELETE /gestao/turmas/${ID}/vinculos/a1`)
    await waitFor(() => expect(chamadas.filter((c) => c.chave === `GET /gestao/turmas/${ID}/vinculos`).length).toBeGreaterThanOrEqual(2))
  })

  it('vincular docente: busca pela pessoa, quem já está vinculado aparece indisponível', async () => {
    const chamadas = api({
      [`POST /gestao/turmas/${ID}/vinculos`]: { status: 201, corpo: vinculo('d2', 'Helena Prado', 'helena.prado', 'docente', 'gestao') },
    })
    abrir()
    await tabelaVinculos()

    await userEvent.click(screen.getByRole('button', { name: 'Vincular docente' }))
    const dialogo = screen.getByRole('dialog', { name: 'Vincular docente' })
    await userEvent.type(within(dialogo).getByRole('searchbox', { name: 'Buscar docente pelo nome ou usuário' }), 'pra')
    // Resultados num grupo nomeado; a região viva anuncia só a contagem.
    expect(await within(dialogo).findByRole('radiogroup', { name: 'Pessoas encontradas' })).toBeInTheDocument()
    expect(within(dialogo).getByRole('status')).toHaveTextContent('2 pessoas encontradas')

    const helena = await within(dialogo).findByRole('radio', { name: /Helena Prado/ })
    expect(within(dialogo).getByRole('radio', { name: /Ricardo Lemos/ })).toBeDisabled()
    const busca = chamadas.filter((c) => c.chave === 'GET /gestao/usuarios').at(-1)!.query
    expect([busca.get('q'), busca.get('perfil'), busca.get('ativo')]).toEqual(['pra', 'docente', 'true'])

    await userEvent.click(helena)
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Vincular' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Helena Prado agora está na turma como docente.')
    expect(chamadas.find((c) => c.chave === `POST /gestao/turmas/${ID}/vinculos`)?.corpo).toEqual({ usuario_id: 'd2', papel: 'docente' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('JA_VINCULADO e PERFIL_INCOMPATIVEL aparecem no próprio formulário', async () => {
    api({
      [`POST /gestao/turmas/${ID}/vinculos`]: [
        { status: 409, corpo: erro('PERFIL_INCOMPATIVEL') },
        { status: 409, corpo: erro('JA_VINCULADO') },
      ],
    })
    abrir()
    await tabelaVinculos()
    await userEvent.click(screen.getByRole('button', { name: 'Vincular aluno' }))
    const dialogo = screen.getByRole('dialog', { name: 'Vincular aluno' })
    await userEvent.type(within(dialogo).getByRole('searchbox'), 'hel')
    await userEvent.click(await within(dialogo).findByRole('radio', { name: /Helena Prado/ }))

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Vincular' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('O papel precisa corresponder ao perfil da pessoa.')

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Vincular' }))
    expect(await within(dialogo).findByText('Esta pessoa já está vinculada à turma.')).toBeInTheDocument()
  })

  it('docente vê a turma e os vínculos só para leitura', async () => {
    api({}, 'docente')
    abrir()
    await tabelaVinculos()
    for (const nome of ['Fechar inscrições', 'Editar turma', 'Desativar turma', 'Vincular docente', 'Vincular aluno']) {
      expect(screen.queryByRole('button', { name: nome })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /^Remover vínculo/ })).not.toBeInTheDocument()
  })

  it('turma inexistente oferece voltar; turma alheia leva à tela sem permissão', async () => {
    api({ [`GET /gestao/turmas/${ID}`]: { status: 404, corpo: erro('TURMA_NAO_ENCONTRADA') } })
    abrir()
    expect(await screen.findByText('Esta turma não está mais disponível.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar às turmas' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Tentar de novo' })).not.toBeInTheDocument()
    vi.unstubAllGlobals()
  })

  it('turma alheia (403) leva à tela sem permissão', async () => {
    api({ [`GET /gestao/turmas/${ID}`]: { status: 403, corpo: erro('SEM_PERMISSAO') } }, 'docente')
    abrir()
    expect(await screen.findByText('tela sem permissão')).toBeInTheDocument()
  })

  it('com o filtro em Alunos, quem já é docente da turma continua indisponível ao vincular docente', async () => {
    api({
      // Como a API: com papel, só os desse papel.
      [`GET /gestao/turmas/${ID}/vinculos`]: (q) => ({
        status: 200,
        corpo: pagina(VINCULOS.filter((v) => !q.get('papel') || v.papel === q.get('papel'))),
      }),
    })
    abrir()
    await tabelaVinculos()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Papel' }), 'Alunos')

    await userEvent.click(screen.getByRole('button', { name: 'Vincular docente' }))
    const dialogo = screen.getByRole('dialog', { name: 'Vincular docente' })
    await userEvent.type(within(dialogo).getByRole('searchbox'), 'ric')
    expect(await within(dialogo).findByRole('radio', { name: /Ricardo Lemos/ })).toBeDisabled()
  })

  it('403 numa ação (perfil mudou no meio do caminho) leva à tela sem permissão', async () => {
    api({ [`PATCH /gestao/turmas/${ID}`]: { status: 403, corpo: erro('SEM_PERMISSAO') } })
    abrir()
    await userEvent.click(await screen.findByRole('button', { name: 'Fechar inscrições' }))
    await confirmar('Fechar inscrições')
    expect(await screen.findByText('tela sem permissão')).toBeInTheDocument()
  })
})
