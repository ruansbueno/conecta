// Peças compartilhadas pelas páginas da gestão.
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { ApiError } from '../api/erros'

export type Carga<T> = { estado: 'carregando' } | { estado: 'pronto'; dados: T } | { estado: 'erro'; mensagem: string; repetivel?: boolean }

export const mensagemDe = (e: unknown) =>
  e instanceof ApiError ? e.mensagem : new ApiError({ code: 'ERRO_DESCONHECIDO' }).mensagem

/**
 * Mensagem trazida de outra página no estado da navegação ("Aviso publicado."): lida uma vez e
 * tirada do histórico, para não voltar ao recarregar ou ao navegar de volta.
 */
export function useMensagemTrazida(): string | undefined {
  const location = useLocation()
  const navegar = useNavigate()
  const [mensagem] = useState(() => (location.state as { mensagem?: string } | null)?.mensagem)
  useEffect(() => {
    if (location.state) navegar({ search: location.search }, { replace: true, state: null })
  }, [location.state, location.search, navegar])
  return mensagem
}
