import './lib/zod-sem-eval'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './estilos/globals.css'
import { aplicarTema, temaEfetivo } from './lib/tema'
import { Rotas } from './rotas'
import { SessaoProvider } from './sessao/contexto'

// public/tema-inicial.js já aplicou o tema; se ele não rodou, aplica aqui (spec 002, D-MN-4).
if (!document.documentElement.dataset.tema) aplicarTema(temaEfetivo())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessaoProvider>
        <Rotas />
      </SessaoProvider>
    </BrowserRouter>
  </StrictMode>,
)
