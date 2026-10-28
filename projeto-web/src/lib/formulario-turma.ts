// Formulário da turma: estado como texto (como os campos o têm), validação local com as regras do
// contrato §11 e conversão para o recurso. A API valida de novo e tem a palavra final.
import { z } from 'zod'

import type { DadosTurma } from '../api/schemas'

export interface FormularioTurma {
  codigo: string
  nome: string
  semestre: string
  periodo: string
  inscricoesAbertas: boolean
}

export type CampoTurma = 'codigo' | 'nome' | 'semestre' | 'periodo'
export type ErrosTurma = Partial<Record<CampoTurma, string>>

/** Campo do formulário para cada campo do contrato (`errors[]` de VALIDATION_ERROR). */
export const CAMPO_DO_CONTRATO: Record<string, CampoTurma> = {
  codigo: 'codigo',
  nome: 'nome',
  semestre_curso: 'semestre',
  periodo_letivo: 'periodo',
}

export const turmaVazia = (): FormularioTurma => ({ codigo: '', nome: '', semestre: '', periodo: '', inscricoesAbertas: false })

const esquema = z.object({
  codigo: z.string().trim().min(1, 'Informe o código da turma.').max(40, 'O código tem no máximo 40 caracteres.'),
  nome: z.string().trim().min(3, 'O nome precisa ter entre 3 e 120 caracteres.').max(120, 'O nome precisa ter entre 3 e 120 caracteres.'),
  semestre: z.string().regex(/^(?:[1-9]|1[0-2])$/, 'Escolha um semestre de 1 a 12.'),
  periodo: z.string().trim().regex(/^\d{4}\/[12]$/, 'Use o formato AAAA/N, com N igual a 1 ou 2 (ex.: 2026/2).'),
})

export function validarTurma(f: FormularioTurma): ErrosTurma {
  const r = esquema.safeParse(f)
  const erros: ErrosTurma = {}
  if (!r.success) for (const issue of r.error.issues) erros[issue.path[0] as CampoTurma] ??= issue.message
  return erros
}

export const dadosDaTurma = (f: FormularioTurma): DadosTurma => ({
  codigo: f.codigo.trim(),
  nome: f.nome.trim(),
  semestreCurso: Number(f.semestre),
  periodoLetivo: f.periodo.trim(),
  inscricoesAbertas: f.inscricoesAbertas,
})

export const formularioDaTurma = (t: DadosTurma): FormularioTurma => ({
  codigo: t.codigo,
  nome: t.nome,
  semestre: String(t.semestreCurso),
  periodo: t.periodoLetivo,
  inscricoesAbertas: t.inscricoesAbertas,
})
