import './lib/zod-sem-eval'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'

import './estilos/globals.css'
import { Rotas } from './rotas'
import { SessaoProvider } from './sessao/contexto'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessaoProvider>
        <Rotas />
      </SessaoProvider>
    </BrowserRouter>
  </StrictMode>,
)
