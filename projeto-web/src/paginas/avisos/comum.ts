// Peças compartilhadas pelas páginas de novo aviso e de edição.
import { useCallback, useEffect, useState } from 'react'

import { ApiError } from '../../api/erros'
import { listarTurmas } from '../../api/recursos/turmas'
import type { Turma } from '../../api/schemas'
import type { FormularioAviso } from '../../lib/formulario-aviso'
import { apagarRascunho, salvarRascunho, type ChaveRascunho } from '../../lib/rascunho'

export type Carga<T> = { estado: 'carregando' } | { estado: 'pronto'; dados: T } | { estado: 'erro'; mensagem: string }

export const mensagemDe = (e: unknown) =>
  e instanceof ApiError ? e.mensagem : new ApiError({ code: 'ERRO_DESCONHECIDO' }).mensagem

/**
 * Turmas ativas que podem ser destino. O docente recebe só as suas (quem filtra é a API). A busca
 * do seletor filtra estas 100 no navegador.
 */
export function useTurmasDestino() {
  const [carga, setCarga] = useState<Carga<Turma[]>>({ estado: 'carregando' })

  const carregar = useCallback(async () => {
    try {
      const { items } = await listarTurmas({ ativa: true, limit: 100 })
      setCarga({ estado: 'pronto', dados: items })
      return items
    } catch (e) {
      setCarga({ estado: 'erro', mensagem: mensagemDe(e) })
      return null
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregar()
  }, [carregar])

  return { carga, recarregar: carregar }
}

/** Guarda o formulário a cada mudança (RW-42); sem nada escrito, não deixa rascunho. */
export function useRascunhoAutomatico(chave: ChaveRascunho, f: FormularioAviso, ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    if (!f.titulo.trim() && !f.conteudo.trim() && f.destinos.length === 0) apagarRascunho(chave)
    else salvarRascunho(chave, { titulo: f.titulo, conteudo: f.conteudo, destinos: f.destinos })
  }, [chave, f, ativo])
}

/** Depois de um DESTINO_NAO_PERMITIDO, tira do formulário as turmas que o docente perdeu. */
export const soTurmasPermitidas = (f: FormularioAviso, turmas: Turma[]): FormularioAviso => ({
  ...f,
  destinos: f.destinos.filter((d) => d.tipo !== 'turma' || turmas.some((t) => t.id === d.turmaId)),
})
