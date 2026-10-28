// Formulário do aviso: estado, validação local (D8, zod) e conversões. Puro, sem interface.
import { z } from 'zod'

import type { Destino, DestinoEscolhido } from '../api/schemas'

export const LIMITE_DESTINOS = 20
export const LIMITE_CONTEUDO = 5000

export interface FormularioAviso {
  titulo: string
  conteudo: string
  destinos: DestinoEscolhido[]
  agendar: boolean
  /** yyyy-mm-dd e HH:mm, no fuso de quem está publicando. */
  data: string
  hora: string
}

export const formularioVazio = (): FormularioAviso => ({
  titulo: '',
  conteudo: '',
  destinos: [],
  agendar: false,
  data: '',
  hora: '',
})

export type CampoAviso = 'titulo' | 'conteudo' | 'destinos' | 'publicar_em'
export type ErrosAviso = Partial<Record<CampoAviso, string>>

export const chaveDestino = (d: DestinoEscolhido) => `${d.tipo}:${d.turmaId ?? ''}:${d.semestre ?? ''}`

/** Destino no formato do chip (o mesmo da resposta da API). */
export const destinoParaExibir = (d: DestinoEscolhido): Destino => ({
  tipo: d.tipo,
  turma: d.turmaId ? { id: d.turmaId, nome: d.turmaNome ?? d.turmaId } : null,
  semestre: d.semestre ?? null,
})

export function momentoDaPublicacao(f: FormularioAviso): Date | null {
  if (!f.agendar || !f.data || !f.hora) return null
  return new Date(`${f.data}T${f.hora}`)
}

const esquema = z.object({
  titulo: z.string().trim().min(3, 'O título precisa ter entre 3 e 150 caracteres.').max(150, 'O título precisa ter entre 3 e 150 caracteres.'),
  conteudo: z.string().trim().min(1, 'Escreva o conteúdo do aviso.').max(LIMITE_CONTEUDO, 'O conteúdo passa de 5.000 caracteres.'),
  destinos: z
    .array(z.unknown())
    .min(1, 'O aviso precisa de pelo menos um destino: escolha quem vai recebê-lo.')
    .max(LIMITE_DESTINOS, 'No máximo 20 destinos por aviso.'),
})

/** Validação antes de enviar; a API valida de novo e tem a palavra final. */
export function validarAviso(f: FormularioAviso, agora = new Date()): ErrosAviso {
  const erros: ErrosAviso = {}
  const r = esquema.safeParse(f)
  if (!r.success) {
    for (const issue of r.error.issues) {
      const campo = issue.path[0] as CampoAviso
      erros[campo] ??= issue.message
    }
  }
  if (f.agendar) {
    const quando = momentoDaPublicacao(f)
    if (!quando) erros.publicar_em = 'Informe a data e a hora da publicação.'
    else if (quando <= agora) erros.publicar_em = 'Escolha uma data e hora no futuro.'
  }
  return erros
}

export const mesmosDestinos = (a: DestinoEscolhido[], b: DestinoEscolhido[]) =>
  a.length === b.length && a.map(chaveDestino).sort().join('|') === b.map(chaveDestino).sort().join('|')
