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
const NovoAviso = lazy(() => import('./paginas/avisos/novo'))
const EditarAviso = lazy(() => import('./paginas/avisos/editar'))
const HistoricoAviso = lazy(() => import('./paginas/avisos/historico'))
const ListaAvisos = lazy(() => import('./paginas/avisos/lista'))

export function Rotas() {
  return (
    <Suspense fallback={<Esqueleto rotulo="Carregando a página" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/sem-permissao" element={<SemPermissao />} />
        <Route element={<ExigirSessao />}>
          <Route element={<AreaGestao />}>
            <Route path="/painel" element={<Painel />} />
            <Route path="/avisos" element={<ListaAvisos />} />
            <Route path="/avisos/novo" element={<NovoAviso />} />
            <Route path="/avisos/:id/editar" element={<EditarAviso />} />
            <Route path="/avisos/:id" element={<HistoricoAviso />} />
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
