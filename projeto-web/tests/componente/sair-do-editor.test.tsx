// useSairDoEditor: Descartar volta para a página anterior só quando ela é da aplicação.
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router'
import { describe, expect, it } from 'vitest'

import { useSairDoEditor } from '../../src/paginas/comum'

function Editor() {
  const sair = useSairDoEditor('/avisos/42')
  return <button onClick={sair}>Descartar</button>
}

function Onde() {
  const navegar = useNavigate()
  return (
    <>
      <output>{useLocation().pathname}</output>
      <button onClick={() => navegar('/avisos/42/editar')}>Abrir o editor</button>
      <button onClick={() => navegar('/avisos/42/editar', { replace: true })}>Voltar do login</button>
    </>
  )
}

function montar(inicial: string) {
  window.history.replaceState(null, '', inicial)
  render(
    <BrowserRouter>
      <Onde />
      <Routes>
        <Route path="/avisos/42/editar" element={<Editor />} />
        <Route path="*" element={null} />
      </Routes>
    </BrowserRouter>,
  )
}

describe('useSairDoEditor', () => {
  it('vindo de uma página da aplicação, volta no histórico', async () => {
    montar('/avisos/42')
    await userEvent.click(screen.getByRole('button', { name: 'Abrir o editor' }))
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/avisos/42'))
    expect(window.history.state?.idx).toBe(0)
  })

  it('link aberto direto e passado pelo login (replace): substitui o editor pelo destino', async () => {
    montar('/login')
    await userEvent.click(screen.getByRole('button', { name: 'Voltar do login' }))
    await userEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^\/avisos\/42$/))
  })
})
