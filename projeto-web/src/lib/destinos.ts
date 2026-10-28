// Destinos como a API os guarda em versões e alterações (`{tipo, turma_id, semestre}`, sem o nome
// da turma) e a comparação de duas listas como conjunto (RW-20).
import type { Destino } from '../api/schemas'

export interface DestinoGuardado {
  tipo: string
  turma_id: string | null
  semestre: number | null
}

const chave = (d: DestinoGuardado) => `${d.tipo}:${d.turma_id ?? ''}:${d.semestre ?? ''}`

/** Turma que a pessoa não pode mais listar (ou que sumiu) aparece sem quebrar a tela. */
export function destinoDoContrato(d: DestinoGuardado, nomes: Map<string, string>): Destino {
  return {
    tipo: d.tipo,
    turma: d.turma_id ? { id: d.turma_id, nome: nomes.get(d.turma_id) ?? 'Turma indisponível' } : null,
    semestre: d.semestre,
  }
}

const lista = (v: unknown): DestinoGuardado[] =>
  Array.isArray(v) ? v.filter((d): d is DestinoGuardado => typeof d === 'object' && d !== null && 'tipo' in d) : []

export function compararDestinos(de: unknown, para: unknown) {
  const antes = lista(de)
  const depois = lista(para)
  const chavesAntes = new Set(antes.map(chave))
  const chavesDepois = new Set(depois.map(chave))
  return {
    adicionados: depois.filter((d) => !chavesAntes.has(chave(d))),
    removidos: antes.filter((d) => !chavesDepois.has(chave(d))),
    mantidos: depois.filter((d) => chavesAntes.has(chave(d))),
  }
}
