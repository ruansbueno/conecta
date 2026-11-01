// Regras puras da grade de horários (plan-f2 D-F2-8 a D-F2-12): montagem da grade semanal,
// docentes da grade, texto dos conflitos e o formulário da aula.
import type { DadosAula } from '../api/recursos/horarios'
import type { Aula, Conflito } from '../api/schemas'

/** `dia_semana` da API: 1 é segunda, 7 é domingo. */
export const NOME_DIA: Record<number, string> = {
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
  7: 'Domingo',
}

const UTEIS = [1, 2, 3, 4, 5]

export interface LinhaDaGrade {
  inicio: string
  /** Aulas por dia, pela hora de fim; dia sem aula tem lista vazia. */
  celulas: Record<number, Aula[]>
}

export interface Grade {
  dias: number[]
  linhas: LinhaDaGrade[]
}

/** Segunda a sexta sempre, sábado e domingo só com aula; uma linha por início distinto. */
export function montarGrade(aulas: Aula[]): Grade {
  const dias = [...UTEIS, ...[6, 7].filter((d) => aulas.some((a) => a.diaSemana === d))]
  const inicios = [...new Set(aulas.map((a) => a.inicio))].sort()
  const linhas = inicios.map((inicio) => ({
    inicio,
    celulas: Object.fromEntries(
      dias.map((d) => [
        d,
        aulas.filter((a) => a.diaSemana === d && a.inicio === inicio).sort((a, b) => a.fim.localeCompare(b.fim)),
      ]),
    ),
  }))
  return { dias, linhas }
}

export interface DocenteDaGrade {
  id: string
  nome: string
  disciplinas: string[]
}

const ordem = (a: string, b: string) => a.localeCompare(b, 'pt-BR')

export function docentesDaGrade(aulas: Aula[]): DocenteDaGrade[] {
  const porId = new Map<string, { nome: string; disciplinas: Set<string> }>()
  for (const a of aulas) {
    if (!a.docente) continue
    const d = porId.get(a.docente.id) ?? { nome: a.docente.nome, disciplinas: new Set<string>() }
    d.disciplinas.add(a.disciplina)
    porId.set(a.docente.id, d)
  }
  return [...porId]
    .map(([id, d]) => ({ id, nome: d.nome, disciplinas: [...d.disciplinas].sort(ordem) }))
    .sort((a, b) => ordem(a.nome, b.nome))
}

/** Conflito é aviso, não erro (RW-46): a aula já está salva. O dia é o da aula salva. */
export function textoDoConflito(c: Conflito, salva: Aula): string {
  const onde = `${c.turma.codigo}, ${NOME_DIA[salva.diaSemana]?.toLowerCase()}, ${c.inicio}–${c.fim}.`
  if (c.tipo === 'sala') return `Sala ${c.local ?? salva.local} também ocupada por ${onde}`
  if (c.tipo === 'docente' && salva.docente) return `${salva.docente.nome} também dá aula em ${onde}`
  return `Choque de horário com ${onde}`
}

/** Campos como o formulário os guarda: tudo texto, o dia também (valor do select). */
export interface FormularioAula {
  diaSemana: string
  inicio: string
  fim: string
  disciplina: string
  local: string
  docenteId: string
}

export type CampoAula = keyof FormularioAula
export type ErrosAula = Partial<Record<CampoAula, string>>

export const aulaNova = (dia = 1, inicio = ''): FormularioAula => ({
  diaSemana: String(dia),
  inicio,
  fim: '',
  disciplina: '',
  local: '',
  docenteId: '',
})

export const formularioDaAula = (a: Aula): FormularioAula => ({
  diaSemana: String(a.diaSemana),
  inicio: a.inicio,
  fim: a.fim,
  disciplina: a.disciplina,
  local: a.local ?? '',
  docenteId: a.docente?.id ?? '',
})

/** As mesmas regras da API (contracts E3 §10), para o erro aparecer antes do envio. */
export function validarAula(f: FormularioAula): ErrosAula {
  const erros: ErrosAula = {}
  const disciplina = f.disciplina.trim()
  if (!disciplina) erros.disciplina = 'Informe a disciplina.'
  else if (disciplina.length < 2 || disciplina.length > 120) erros.disciplina = 'A disciplina precisa ter de 2 a 120 caracteres.'
  if (!f.inicio) erros.inicio = 'Informe a hora de início.'
  if (!f.fim) erros.fim = 'Informe a hora de fim.'
  else if (f.inicio && f.fim <= f.inicio) erros.fim = 'O fim precisa ser depois do início.'
  if (f.local.trim().length > 80) erros.local = 'O local pode ter até 80 caracteres.'
  return erros
}

export const dadosDaAula = (f: FormularioAula): DadosAula => ({
  diaSemana: Number(f.diaSemana),
  inicio: f.inicio,
  fim: f.fim,
  disciplina: f.disciplina.trim(),
  local: f.local.trim(),
  docenteId: f.docenteId,
})

/** PATCH só com o que mudou (texto comparado sem os espaços das pontas). */
export function edicaoDaAula(atual: Aula, f: FormularioAula): Partial<DadosAula> {
  const novo = dadosDaAula(f)
  const antes = dadosDaAula(formularioDaAula(atual))
  return Object.fromEntries(
    (Object.keys(novo) as (keyof DadosAula)[]).filter((k) => novo[k] !== antes[k]).map((k) => [k, novo[k]]),
  ) as Partial<DadosAula>
}
