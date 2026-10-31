// Tabela de rotas (D6): declarativa, com carregamento sob demanda por página.
import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router'

import { Esqueleto } from './componentes/comum/esqueleto'
import { SemPermissao } from './paginas/sem-permissao'
import { ExigirSessao } from './sessao/exigir-sessao'

const Login = lazy(() => import('./paginas/login'))
const AreaGestao = lazy(() => import('./paginas/area-gestao'))
const Painel = lazy(() => import('./paginas/painel'))
const NovoAviso = lazy(() => import('./paginas/avisos/novo'))
const EditarAviso = lazy(() => import('./paginas/avisos/editar'))
const HistoricoAviso = lazy(() => import('./paginas/avisos/historico'))
const ListaAvisos = lazy(() => import('./paginas/avisos/lista'))
const ListaTurmas = lazy(() => import('./paginas/turmas/lista'))
const ListaEventos = lazy(() => import('./paginas/eventos/lista'))
const NovoEvento = lazy(() => import('./paginas/eventos/novo'))
const EditarEvento = lazy(() => import('./paginas/eventos/editar'))
const HistoricoEvento = lazy(() => import('./paginas/eventos/historico'))
const DetalheTurma = lazy(() => import('./paginas/turmas/detalhe'))
const Solicitacoes = lazy(() => import('./paginas/solicitacoes'))
const Usuarios = lazy(() => import('./paginas/usuarios'))

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
            <Route path="/eventos" element={<ListaEventos />} />
            <Route path="/eventos/novo" element={<NovoEvento />} />
            <Route path="/eventos/:id/editar" element={<EditarEvento />} />
            <Route path="/eventos/:id" element={<HistoricoEvento />} />
            <Route path="/turmas" element={<ListaTurmas />} />
            <Route path="/turmas/:id" element={<DetalheTurma />} />
            <Route path="/solicitacoes" element={<Solicitacoes />} />
            <Route element={<ExigirSessao perfis={['administrador', 'coordenacao']} />}>
              <Route path="/usuarios" element={<Usuarios />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Routes>
    </Suspense>
  )
}
