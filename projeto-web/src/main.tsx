import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import './estilos/globals.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="p-8 font-sans text-navy">CONECTA — gestão</main>
  </StrictMode>,
)
