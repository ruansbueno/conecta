// Tabela de rotas (D6): declarativa, com carregamento sob demanda por página.
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { Esqueleto } from './componentes/comum/esqueleto'
import { SemPermissao } from './paginas/sem-permissao'
import { ExigirSessao } from './sessao/exigir-sessao'

const Login = lazy(() => import('./paginas/login'))
const AreaGestao = lazy(() => import('./paginas/area-gestao'))
const Painel = lazy(() => import('./paginas/painel'))
const EmBreve = lazy(() => import('./paginas/em-breve'))

export function Rotas() {
  return (
    <Suspense fallback={<Esqueleto rotulo="Carregando a página" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/sem-permissao" element={<SemPermissao />} />
        <Route element={<ExigirSessao />}>
          <Route element={<AreaGestao />}>
            <Route path="/painel" element={<Painel />} />
            <Route path="/avisos" element={<EmBreve />} />
            <Route path="/turmas/*" element={<EmBreve />} />
            <Route path="/solicitacoes" element={<EmBreve />} />
            <Route path="/usuarios" element={<EmBreve />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Routes>
    </Suspense>
  )
}
