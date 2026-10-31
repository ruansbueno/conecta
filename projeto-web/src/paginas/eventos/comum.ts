// Peças compartilhadas pelas páginas de novo evento e de edição.
import { useEffect } from 'react'

import type { Turma } from '../../api/schemas'
import type { FormularioEvento } from '../../lib/formulario-evento'
import { apagarRascunho, salvarRascunhoEvento, type ChaveRascunhoEvento, type RascunhoEvento } from '../../lib/rascunho'

export { useTurmasDestino } from '../avisos/comum'

/** Guarda o formulário a cada mudança (RW-42); sem nada escrito, não deixa rascunho. */
export function useRascunhoDoEvento(chave: ChaveRascunhoEvento, f: FormularioEvento, ativo: boolean) {
  useEffect(() => {
    if (!ativo) return
    const vazio = !f.titulo.trim() && !f.local.trim() && !f.descricao.trim() && !f.inicio && f.destinos.length === 0
    if (vazio) apagarRascunho(chave)
    else salvarRascunhoEvento(chave, f)
  }, [chave, f, ativo])
}

/** O docente só vê e envia turmas em que leciona (como no aviso). */
export const soTurmasDoDocente = (f: FormularioEvento, turmas: Turma[]): FormularioEvento => {
  const destinos = f.destinos.filter((d) => d.tipo === 'turma' && turmas.some((t) => t.id === d.turmaId))
  return destinos.length === f.destinos.length ? f : { ...f, destinos }
}

/** O rascunho guardado volta como formulário (sem a data em que foi salvo). */
export const formularioDoRascunho = (r: RascunhoEvento): FormularioEvento => ({
  titulo: r.titulo,
  tipo: r.tipo,
  inicio: r.inicio,
  fim: r.fim,
  local: r.local,
  descricao: r.descricao,
  destinos: r.destinos,
})
