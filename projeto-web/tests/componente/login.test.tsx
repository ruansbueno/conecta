import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { requisitar } from '../../src/api/cliente'
import Login from '../../src/paginas/login'
import { SessaoProvider } from '../../src/sessao/contexto'
import { ExigirSessao } from '../../src/sessao/exigir-sessao'
import { erro, me, meDocente, respostaLogin } from '../fixtures'

type Resposta = { status: number; corpo?: unknown } | 'sem-rede'

function api(rotas: Record<string, Resposta | Resposta[]>) {
  const chamadas: { chave: string; corpo?: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const chave = `${init.method} ${url.replace('/api', '').split('?')[0]}`
      chamadas.push({ chave, corpo: init.body ? JSON.parse(init.body as string) : undefined })
      const r = rotas[chave]
      const atual = Array.isArray(r) ? (r.length > 1 ? r.shift()! : r[0]) : r
      if (atual === 'sem-rede') throw new TypeError('Failed to fetch')
      const { status, corpo } = atual ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      return new Response(corpo === undefined ? null : JSON.stringify(corpo), { status })
    }),
  )
  return chamadas
}

function Onde() {
  const { pathname } = useLocation()
  return <p>em {pathname}</p>
}

function montar(inicial: string | { pathname: string; state: unknown } = '/login') {
  render(
    <MemoryRouter initialEntries={[inicial]}>
      <SessaoProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/sem-permissao" element={<Onde />} />
          <Route element={<ExigirSessao />}>
            <Route path="/painel" element={<Onde />} />
            <Route path="/avisos/novo" element={<Onde />} />
          </Route>
        </Routes>
      </SessaoProvider>
    </MemoryRouter>,
  )
}

const usuario = () => screen.getByLabelText('Usuário')
const senha = () => screen.getByLabelText('Senha')

async function entrar(u = 'coord.teste', s = 'senha-teste') {
  await userEvent.type(usuario(), u)
  await userEvent.type(senha(), s)
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

describe('login (T01)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('identidade da tela', async () => {
    api({ 'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') } })
    montar()

    expect(await screen.findByRole('heading', { name: 'Acesso à gestão' })).toBeInTheDocument()
    expect(screen.getByText(/Alunos usam o aplicativo/)).toBeInTheDocument()
    expect(screen.getByText(/A sessão expira em 24 h/)).toBeInTheDocument()
  })

  it('abrir sem sessão não diz que a sessão expirou', async () => {
    api({ 'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') } })
    montar()

    await screen.findByRole('heading', { name: 'Acesso à gestão' })
    expect(screen.queryByText('Sua sessão expirou. Entre de novo.')).not.toBeInTheDocument()
  })

  it('campo vazio é indicado sem chamar o login', async () => {
    const chamadas = api({ 'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') } })
    montar()
    await screen.findByRole('heading', { name: 'Acesso à gestão' })

    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(screen.getByText('Informe o usuário.')).toBeInTheDocument()
    expect(screen.getByText('Informe a senha.')).toBeInTheDocument()
    expect(chamadas.map((c) => c.chave)).not.toContain('POST /auth/login')
  })

  it('credencial inválida: mensagem acima do botão, usuário preservado, senha limpa', async () => {
    api({
      'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') },
      'POST /auth/login': { status: 401, corpo: erro('CREDENCIAIS_INVALIDAS') },
    })
    montar()

    await entrar('coord.teste', 'errada')

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuário ou senha incorretos.')
    expect(usuario()).toHaveValue('coord.teste')
    expect(senha()).toHaveValue('')
  })

  it('usuário desativado vê a mensagem própria e permanece', async () => {
    api({
      'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') },
      'POST /auth/login': { status: 403, corpo: erro('USUARIO_INATIVO') },
    })
    montar()

    await entrar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Este acesso está desativado. Procure a administração.',
    )
    expect(screen.getByRole('heading', { name: 'Acesso à gestão' })).toBeInTheDocument()
  })

  it('servidor aguardando liberação vê o aviso próprio e permanece (emenda v2.3)', async () => {
    api({
      'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') },
      'POST /auth/login': { status: 403, corpo: erro('ACESSO_PENDENTE') },
    })
    montar()

    await entrar()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Seu acesso está aguardando liberação da coordenação ou da administração.',
    )
    expect(screen.getByRole('heading', { name: 'Acesso à gestão' })).toBeInTheDocument()
  })

  it('acesso recusado vê o aviso próprio', async () => {
    api({
      'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') },
      'POST /auth/login': { status: 403, corpo: erro('ACESSO_RECUSADO') },
    })
    montar()

    await entrar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Seu acesso não foi liberado. Procure a coordenação do curso.')
  })

  it('o rodapé diz que as credenciais são as institucionais do IFSul', async () => {
    api({ 'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') } })
    montar()

    expect(await screen.findByText(/Use o login e a senha institucionais do IFSul/)).toBeInTheDocument()
    expect(screen.queryByText(/Moodle/)).not.toBeInTheDocument()
  })

  it('falha de rede mantém o que foi digitado', async () => {
    api({ 'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') }, 'POST /auth/login': 'sem-rede' })
    montar()

    await entrar()

    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível conectar')
    expect(usuario()).toHaveValue('coord.teste')
    expect(senha()).toHaveValue('senha-teste')
  })

  it('sucesso: chama GET /me e vai ao painel', async () => {
    const chamadas = api({
      'GET /me': [{ status: 401, corpo: erro('NAO_AUTENTICADO') }, { status: 200, corpo: me }],
      'POST /auth/login': { status: 200, corpo: respostaLogin },
    })
    montar()

    await entrar()

    expect(await screen.findByText('em /painel')).toBeInTheDocument()
    expect(chamadas.find((c) => c.chave === 'POST /auth/login')?.corpo).toEqual({
      username: 'coord.teste',
      password: 'senha-teste',
    })
  })

  it('login aceito, mas a sessão não ficou no navegador: explica sem falar em expiração', async () => {
    api({
      'GET /me': { status: 401, corpo: erro('NAO_AUTENTICADO') },
      'POST /auth/login': { status: 200, corpo: respostaLogin },
    })
    montar()

    await entrar()

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent(/cookies/)
    expect(alerta).not.toHaveTextContent(/expirou/)
  })

  it('volta para a página pretendida depois de entrar (RW-07)', async () => {
    api({
      'GET /me': [{ status: 401, corpo: erro('NAO_AUTENTICADO') }, { status: 200, corpo: meDocente }],
      'POST /auth/login': { status: 200, corpo: { ...respostaLogin, usuario: meDocente } },
    })
    montar('/avisos/novo')
    await screen.findByRole('heading', { name: 'Acesso à gestão' })

    await entrar('docente.teste')

    expect(await screen.findByText('em /avisos/novo')).toBeInTheDocument()
  })

  it('aluno: sessão encerrada e tela de sem permissão (RW-06)', async () => {
    const chamadas = api({
      'GET /me': [{ status: 401, corpo: erro('NAO_AUTENTICADO') }, { status: 200, corpo: { ...me, perfil: 'aluno' } }],
      'POST /auth/login': { status: 200, corpo: { ...respostaLogin, usuario: { ...me, perfil: 'aluno' } } },
      'DELETE /auth/sessao': { status: 204 },
    })
    montar()

    await entrar('aluno.teste')

    expect(await screen.findByText('em /sem-permissao')).toBeInTheDocument()
    await waitFor(() => expect(chamadas.map((c) => c.chave)).toContain('DELETE /auth/sessao'))
  })

  it('401 no meio do uso volta ao login dizendo que a sessão expirou', async () => {
    api({
      'GET /me': { status: 200, corpo: me },
      'GET /gestao/avisos': { status: 401, corpo: erro('NAO_AUTENTICADO') },
      'DELETE /auth/sessao': { status: 204 },
    })
    montar('/painel')
    await screen.findByText('em /painel')

    await requisitar('GET', '/gestao/avisos').catch(() => undefined)

    expect(await screen.findByText('Sua sessão expirou. Entre de novo.')).toBeInTheDocument()
  })
})
