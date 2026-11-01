// Peças compartilhadas pelas páginas da gestão.
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

import { ApiError } from '../api/erros'

export type Carga<T> = { estado: 'carregando' } | { estado: 'pronto'; dados: T } | { estado: 'erro'; mensagem: string; repetivel?: boolean; codigo?: string }

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

/**
 * Saída do editor ao descartar: volta para onde a pessoa estava (detalhe ou lista), em vez de abrir
 * de novo esse endereço por cima — o histórico do navegador ficaria com ele repetido e o editor
 * descartado no meio. Sem página anterior da aplicação (link aberto direto), substitui o editor.
 */
export function useSairDoEditor(destino: string) {
  const { key } = useLocation()
  const navegar = useNavigate()
  return useCallback(() => {
    if (key !== 'default') navegar(-1)
    else navegar(destino, { replace: true })
  }, [key, destino, navegar])
}
