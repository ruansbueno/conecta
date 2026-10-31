// Apoio dos testes da agenda (F2): API simulada por rota e a página montada com sessão e rotas.
import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { vi } from 'vitest'

import { SessaoProvider } from '../../src/sessao/contexto'
import { erro, me, meDocente, pagina, turma } from '../fixtures'

/** `rede: true`: a requisição nem chega (fetch lança, como sem conexão). */
export type R = { status: number; corpo?: unknown; rede?: boolean }
export type Chamada = { chave: string; query: URLSearchParams; corpo?: unknown }
export type Rotas = Record<string, R | ((q: URLSearchParams, corpo?: unknown) => R)>

export const T1 = '00000000-0000-4000-8000-0000000000a1'

export function apiAgenda(rotas: Rotas = {}, perfil: 'coordenacao' | 'docente' = 'coordenacao') {
  const chamadas: Chamada[] = []
  const base: Rotas = {
    'GET /me': { status: 200, corpo: perfil === 'docente' ? meDocente : me },
    'GET /gestao/turmas': { status: 200, corpo: pagina([{ ...turma, id: T1, nome: 'SI-3A' }]) },
    'GET /gestao/eventos': { status: 200, corpo: pagina([]) },
    ...rotas,
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      const [caminho, busca] = url.replace('/api', '').split('?')
      const chave = `${init.method} ${caminho}`
      const query = new URLSearchParams(busca)
      const corpo = init.body ? JSON.parse(init.body as string) : undefined
      chamadas.push({ chave, query, corpo })
      const r = base[chave]
      const {
        status,
        corpo: resposta,
        rede,
      } = (typeof r === 'function' ? r(query, corpo) : r) ?? { status: 404, corpo: erro('NAO_ENCONTRADO') }
      if (rede) throw new TypeError('Failed to fetch')
      return new Response(resposta === undefined ? null : JSON.stringify(resposta), { status })
    }),
  )
  return chamadas
}

function Onde() {
  const { pathname, search } = useLocation()
  return <p data-testid="onde">{pathname + search}</p>
}

/** Monta `elemento` em `caminho`, dentro da sessão; `outras` são rotas para onde a página navega. */
export function abrirEm(caminho: string, padrao: string, elemento: ReactNode, outras: string[] = []) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <SessaoProvider>
        <Routes>
          <Route path={padrao} element={elemento} />
          {outras.map((p) => (
            <Route key={p} path={p} element={<p>outra página</p>} />
          ))}
        </Routes>
        <Onde />
      </SessaoProvider>
    </MemoryRouter>,
  )
}
