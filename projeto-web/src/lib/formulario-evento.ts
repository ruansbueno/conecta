// Formulário de evento (plan-f2 D-F2-5): o que a interface guarda enquanto se edita, a validação
// antes de enviar (a API valida de novo e tem a palavra final) e o envio só do que mudou.
import { z } from 'zod'

import type { EdicaoEvento, NovoEvento } from '../api/recursos/eventos'
import type { Destino, DestinoEscolhido } from '../api/schemas'
import { LIMITE_DESTINOS, mesmosDestinos } from './formulario-aviso'

export interface FormularioEvento {
  titulo: string
  tipo: string
  /** "AAAA-MM-DDTHH:MM", hora local (campo datetime-local). */
  inicio: string
  /** Vazio: evento pontual. */
  fim: string
  local: string
  descricao: string
  destinos: DestinoEscolhido[]
}

export type CampoEvento = keyof FormularioEvento
export type ErrosEvento = Partial<Record<CampoEvento, string>>

export const formularioEventoVazio = (): FormularioEvento => ({
  titulo: '',
  tipo: '',
  inicio: '',
  fim: '',
  local: '',
  descricao: '',
  destinos: [],
})

const esquema = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, 'Informe um título com ao menos 3 caracteres.')
    .max(150, 'O título pode ter até 150 caracteres.'),
  tipo: z.string().min(1, 'Escolha o tipo do evento.'),
  inicio: z.string().min(1, 'Informe a data e a hora de início.'),
  local: z.string().trim().max(120, 'O local pode ter até 120 caracteres.'),
  descricao: z.string().trim().max(5000, 'A descrição pode ter até 5000 caracteres.'),
  destinos: z
    .array(z.unknown())
    .min(1, 'Escolha ao menos um destino.')
    .max(LIMITE_DESTINOS, `Um evento pode ter até ${LIMITE_DESTINOS} destinos.`),
})

const quando = (v: string) => (v ? new Date(v) : null)

export function validarEvento(f: FormularioEvento): ErrosEvento {
  const erros: ErrosEvento = {}
  const r = esquema.safeParse(f)
  if (!r.success) {
    for (const issue of r.error.issues) erros[issue.path[0] as CampoEvento] ??= issue.message
  }
  // O campo datetime-local entrega vazio quando falta a data ou a hora; o editor guarda "incompleto".
  for (const c of ['inicio', 'fim'] as const) {
    if (f[c] && Number.isNaN(new Date(f[c]).getTime())) erros[c] = 'Complete a data e a hora.'
  }
  const inicio = quando(f.inicio)
  const fim = quando(f.fim)
  if (!erros.inicio && !erros.fim && inicio && fim && fim <= inicio) erros.fim = 'O fim precisa ser depois do início.'
  return erros
}

export function novoEvento(f: FormularioEvento): NovoEvento {
  return {
    titulo: f.titulo.trim(),
    tipo: f.tipo,
    inicio: new Date(f.inicio),
    fim: quando(f.fim),
    local: f.local,
    descricao: f.descricao,
    destinos: f.destinos,
  }
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')
/** Date → "AAAA-MM-DDTHH:MM" na hora local, como o campo datetime-local espera. */
const paraCampo = (d: Date) =>
  `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}T${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`

export const escolhidoDoDestino = (d: Destino): DestinoEscolhido => ({
  tipo: d.tipo,
  ...(d.turma ? { turmaId: d.turma.id, turmaNome: d.turma.nome } : {}),
  ...(d.semestre !== null ? { semestre: d.semestre } : {}),
})

interface EventoEditavel {
  titulo: string
  tipo: string
  inicio: Date
  fim: Date | null
  local: string | null
  descricao: string | null
  destinos: Destino[]
}

export const formularioDoEvento = (e: EventoEditavel): FormularioEvento => ({
  titulo: e.titulo,
  tipo: e.tipo,
  inicio: paraCampo(e.inicio),
  fim: e.fim ? paraCampo(e.fim) : '',
  local: e.local ?? '',
  descricao: e.descricao ?? '',
  destinos: e.destinos.map(escolhidoDoDestino),
})

/** PATCH parcial: só o que mudou em relação ao evento gravado (vazio = nada a enviar). */
export function edicaoDoEvento(f: FormularioEvento, e: EventoEditavel): EdicaoEvento {
  const atual = formularioDoEvento(e)
  const edicao: EdicaoEvento = {}
  if (f.titulo.trim() !== atual.titulo) edicao.titulo = f.titulo.trim()
  if (f.tipo !== atual.tipo) edicao.tipo = f.tipo
  if (f.inicio !== atual.inicio) edicao.inicio = new Date(f.inicio)
  if (f.fim !== atual.fim) edicao.fim = quando(f.fim)
  if (f.local.trim() !== atual.local) edicao.local = f.local
  if (f.descricao.trim() !== atual.descricao) edicao.descricao = f.descricao
  if (!mesmosDestinos(f.destinos, atual.destinos)) edicao.destinos = f.destinos
  return edicao
}
