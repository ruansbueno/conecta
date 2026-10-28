import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import Usuarios from '../../src/paginas/usuarios'
import { SessaoProvider } from '../../src/sessao/contexto'
import { erro, me, meAdmin, pagina } from '../fixtures'

const pessoa = (id: string, nome: string, username: string, perfil: string, ativo = true, ultimo: string | null = null) => ({
  id,
  username,
  nome,
  perfil,
  ativo,
  ultimo_login_em: ultimo,
})
const USUARIOS = [
  pessoa(meAdmin.id, 'Paulo Ferraz', 'admin.teste', 'administrador', true, new Date().toISOString()),
  pessoa('u2', 'Ricardo Lemos', 'ricardo.lemos', 'docente'),
  pessoa('u3', 'Rafaela Nunes', 'rafaela.nunes', 'aluno', false),
]

type R = { status: number; corpo?: unknown }
type Chamada = { chave: string; query: URLSearchParams; corpo?: unknown }

function api(rotas: Record<string, R | R[]> = {}, sessao: object = meAdmin) {
  const chamadas: Chamada[] = []
  const base: Record<string, R | R[]> = {
    'GET /me': { status: 200, corpo: sessao },
    'GET /gestao/usuarios': { status: 200, corpo: pagina(USUARIOS) },
    'GET /gestao/usuarios/u2': { status: 200, corpo: { ...USUARIOS[1], turmas: [{ id: 't1', codigo: 'SI-3A', nome: 'SI 3A', papel: 'docente' }] } },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const chave = `${init.method} ${caminho}`
      chamadas.push({ chave, query: new URLSearchParams(busca), corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const r = base[chave]
      const atual = Array.isArray(r) ? (r.length > 1 ? r.shift()! : r[0]) : r
      const { status, corpo } = atual ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

const listagens = (c: Chamada[]) => c.filter((x) => x.chave === 'GET /gestao/usuarios').map((x) => x.query)

function Onde() {
  const { search } = useLocation()
  return <p data-testid="url">{search}</p>
}

function PainelEspia() {
  const { state } = useLocation()
  return <p>painel: {state?.mensagem}</p>
}

function abrir(inicial = '/usuarios') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <SessaoProvider>
        <Routes>
          <Route
            path="/usuarios"
            element={
              <>
                <Usuarios />
                <Onde />
              </>
            }
          />
          <Route path="/sem-permissao" element={<p>tela sem permissão</p>} />
          <Route path="/painel" element={<PainelEspia />} />
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const tabela = () => screen.findByRole('table', { name: /Usuários/ })
const linha = async (nome: RegExp) => within(await tabela()).getByRole('row', { name: nome })

describe('usuários (T10, RW-31)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('cada linha mostra pessoa, perfil, último acesso e situação, com texto', async () => {
    api()
    abrir()
    const paulo = await linha(/Paulo Ferraz/)
    expect(paulo).toHaveTextContent('admin.teste')
    expect(paulo).toHaveTextContent('Administrador')
    expect(paulo).toHaveTextContent('agora')
    expect(paulo).toHaveTextContent('Ativo')
    const rafaela = await linha(/Rafaela Nunes/)
    expect(rafaela).toHaveTextContent('Inativo')
    expect(await linha(/Ricardo Lemos/)).toHaveTextContent('nunca entrou')
  })

  it('abas de perfil e de inativos, e a busca, vão para a API e ficam na URL', async () => {
    const chamadas = api()
    abrir()
    await tabela()

    await userEvent.click(screen.getByRole('tab', { name: 'Docentes' }))
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('perfil')).toBe('docente'))

    await userEvent.click(screen.getByRole('tab', { name: 'Inativos' }))
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('ativo')).toBe('false'))
    expect(listagens(chamadas).at(-1)?.has('perfil')).toBe(false)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por nome ou usuário' }), 'ric')
    await waitFor(() => expect(listagens(chamadas).at(-1)?.get('q')).toBe('ric'))
    expect(screen.getByTestId('url')).toHaveTextContent('aba=inativos')
  })

  it('administração altera o perfil: a lista recarrega e informa', async () => {
    const chamadas = api({ 'PATCH /gestao/usuarios/u2': { status: 200, corpo: { ...USUARIOS[1], perfil: 'coordenacao' } } })
    abrir()
    await userEvent.click(within(await linha(/Ricardo Lemos/)).getByRole('button', { name: 'Alterar perfil de Ricardo Lemos' }))
    const dialogo = screen.getByRole('dialog', { name: 'Alterar perfil de acesso' })
    expect(await within(dialogo).findByText(/vínculo em 1 turma/)).toBeInTheDocument()

    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Coordenação' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar perfil' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Ricardo Lemos agora tem o perfil Coordenação.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === 'PATCH /gestao/usuarios/u2')?.corpo).toEqual({ perfil: 'coordenacao' })
    await waitFor(() => expect(listagens(chamadas).length).toBeGreaterThanOrEqual(2))
  })

  it('administração desativa uma pessoa (com confirmação)', async () => {
    const chamadas = api({ 'PATCH /gestao/usuarios/u2': { status: 200, corpo: { ...USUARIOS[1], ativo: false } } })
    abrir()
    await userEvent.click(within(await linha(/Ricardo Lemos/)).getByRole('button', { name: 'Alterar perfil de Ricardo Lemos' }))
    const dialogo = screen.getByRole('dialog')
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar usuário' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar desativação' }))

    expect(await screen.findByRole('status')).toHaveTextContent('Acesso de Ricardo Lemos desativado.')
    expect(chamadas.find((c) => c.chave === 'PATCH /gestao/usuarios/u2')?.corpo).toEqual({ ativo: false })
  })

  it('mudar o próprio perfil atualiza a sessão (a navegação acompanha)', async () => {
    const chamadas = api({
      [`GET /gestao/usuarios/${meAdmin.id}`]: { status: 200, corpo: { ...USUARIOS[0], turmas: [] } },
      [`PATCH /gestao/usuarios/${meAdmin.id}`]: { status: 200, corpo: { ...USUARIOS[0], perfil: 'coordenacao' } },
    })
    abrir()
    await userEvent.click(within(await linha(/Paulo Ferraz/)).getByRole('button', { name: 'Alterar perfil de Paulo Ferraz' }))
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).queryByRole('button', { name: 'Desativar usuário' })).not.toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Coordenação' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar perfil' }))

    // Deixou a administração: vai ao painel com a mensagem (esta tela já não é dela).
    expect(await screen.findByText('painel: Seu perfil agora é Coordenação.')).toBeInTheDocument()
    await waitFor(() => expect(chamadas.filter((c) => c.chave === 'GET /me').length).toBeGreaterThanOrEqual(2))
  })

  it('coordenação vê a lista, mas não a ação de alterar perfil (RW-11)', async () => {
    api({}, me)
    abrir()
    await tabela()
    expect(screen.queryByRole('button', { name: /^Alterar perfil/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Só a administração muda o perfil/)).toBeInTheDocument()
  })

  it('403 ao alterar (perfil mudou no meio do caminho) leva à tela sem permissão (RW-12)', async () => {
    api({ 'PATCH /gestao/usuarios/u2': { status: 403, corpo: erro('SEM_PERMISSAO') } })
    abrir()
    await userEvent.click(within(await linha(/Ricardo Lemos/)).getByRole('button', { name: 'Alterar perfil de Ricardo Lemos' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Aluno' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar perfil' }))

    expect(await screen.findByText('tela sem permissão')).toBeInTheDocument()
  })

  it('403 na lista leva à tela sem permissão', async () => {
    api({ 'GET /gestao/usuarios': { status: 403, corpo: erro('SEM_PERMISSAO') } })
    abrir()
    expect(await screen.findByText('tela sem permissão')).toBeInTheDocument()
  })

  it('aba sem pessoas mostra o estado vazio', async () => {
    api({ 'GET /gestao/usuarios': { status: 200, corpo: pagina([]) } })
    abrir('/usuarios?aba=inativos')
    expect(await screen.findByText('Nenhuma pessoa inativa')).toBeInTheDocument()
  })
})
