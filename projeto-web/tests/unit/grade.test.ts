import { describe, expect, it } from 'vitest'

import type { Aula, Conflito } from '../../src/api/schemas'
import {
  aulaNova,
  docentesDaGrade,
  edicaoDaAula,
  formularioDaAula,
  montarGrade,
  NOME_DIA,
  textoDoConflito,
  validarAula,
} from '../../src/lib/grade'

const helena = { id: 'd1', nome: 'Helena Prado' }
const ricardo = { id: 'd2', nome: 'Ricardo Lemos' }
let seq = 0
const aula = (diaSemana: number, inicio: string, fim: string, disciplina: string, docente: Aula['docente'] = null, local: string | null = null): Aula => ({
  id: `a${++seq}`,
  turmaId: 't1',
  diaSemana,
  inicio,
  fim,
  disciplina,
  local,
  docente,
})

describe('montagem da grade (plan-f2 D-F2-8)', () => {
  it('segunda a sexta sempre, mesmo sem aula', () => {
    expect(montarGrade([]).dias).toEqual([1, 2, 3, 4, 5])
    expect(montarGrade([]).linhas).toEqual([])
  })

  it('sábado e domingo só quando há aula neles', () => {
    expect(montarGrade([aula(6, '08:00', '10:00', 'Estágio')]).dias).toEqual([1, 2, 3, 4, 5, 6])
    expect(montarGrade([aula(7, '08:00', '10:00', 'Estágio')]).dias).toEqual([1, 2, 3, 4, 5, 7])
  })

  it('linhas pelos inícios distintos, em ordem, e cada aula na célula do seu dia', () => {
    const bd = aula(1, '19:10', '20:50', 'Banco de Dados II')
    const es = aula(1, '21:00', '22:40', 'Engenharia de Software')
    const est = aula(5, '20:00', '20:50', 'Estatística')
    const redes = aula(2, '19:10', '20:00', 'Redes')
    const { linhas } = montarGrade([es, est, bd, redes])
    expect(linhas.map((l) => l.inicio)).toEqual(['19:10', '20:00', '21:00'])
    expect(linhas[0].celulas[1]).toEqual([bd])
    expect(linhas[0].celulas[2]).toEqual([redes])
    expect(linhas[0].celulas[3]).toEqual([])
    expect(linhas[1].celulas[5]).toEqual([est])
  })

  it('duas aulas no mesmo dia e início ficam na mesma célula, pela hora de fim', () => {
    const longa = aula(3, '19:10', '22:40', 'Projeto')
    const curta = aula(3, '19:10', '20:00', 'Tutoria')
    expect(montarGrade([longa, curta]).linhas[0].celulas[3]).toEqual([curta, longa])
  })
})

describe('docentes nesta grade (D-F2-12)', () => {
  it('cada docente, em ordem alfabética, com as disciplinas que dá na turma, sem repetir', () => {
    const lista = docentesDaGrade([
      aula(1, '19:10', '20:50', 'Redes', ricardo),
      aula(1, '21:00', '22:40', 'Banco de Dados II', helena),
      aula(3, '19:10', '20:50', 'Banco de Dados II', helena),
      aula(4, '19:10', '20:50', 'Programação Web', ricardo),
      aula(5, '19:10', '20:50', 'Sem docente'),
    ])
    expect(lista).toEqual([
      { id: 'd1', nome: 'Helena Prado', disciplinas: ['Banco de Dados II'] },
      { id: 'd2', nome: 'Ricardo Lemos', disciplinas: ['Programação Web', 'Redes'] },
    ])
  })
})

describe('texto do conflito (RW-46, D-F2-10)', () => {
  const outra = { id: 't2', codigo: 'SI-3B', nome: 'SI 3º Sem B' }
  const base = { horarioId: 'h9', turma: outra, inicio: '19:10', fim: '20:50' }
  const salva = aula(1, '19:30', '21:00', 'Banco de Dados II', helena, 'Lab 4')

  it('sala: o local, a outra turma, o dia e as horas da aula de lá', () => {
    const c: Conflito = { ...base, tipo: 'sala', local: 'Lab 4' }
    expect(textoDoConflito(c, salva)).toBe('Sala Lab 4 também ocupada por SI-3B, segunda, 19:10–20:50.')
  })

  it('docente: o nome de quem foi escolhido para a aula salva', () => {
    const c: Conflito = { ...base, tipo: 'docente', local: null }
    expect(textoDoConflito(c, salva)).toBe('Helena Prado também dá aula em SI-3B, segunda, 19:10–20:50.')
  })

  it('tipo desconhecido não quebra a mensagem', () => {
    const c: Conflito = { ...base, tipo: 'outro', local: null }
    expect(textoDoConflito(c, salva)).toBe('Choque de horário com SI-3B, segunda, 19:10–20:50.')
  })
})

describe('formulário da aula (D-F2-9)', () => {
  it('nova aula começa no dia e no início da célula, com fim vazio', () => {
    expect(aulaNova(2, '19:10')).toEqual({ diaSemana: '2', inicio: '19:10', fim: '', disciplina: '', local: '', docenteId: '' })
    expect(aulaNova()).toEqual({ diaSemana: '1', inicio: '', fim: '', disciplina: '', local: '', docenteId: '' })
  })

  it('valida como a API: disciplina de 2 a 120, horas preenchidas, fim depois do início, local até 80', () => {
    expect(validarAula({ ...aulaNova(1, '19:10'), fim: '20:50', disciplina: 'BD' })).toEqual({})
    expect(validarAula(aulaNova())).toEqual({
      disciplina: 'Informe a disciplina.',
      inicio: 'Informe a hora de início.',
      fim: 'Informe a hora de fim.',
    })
    expect(validarAula({ ...aulaNova(1, '19:10'), fim: '19:10', disciplina: ' B ' }).disciplina).toBe(
      'A disciplina precisa ter de 2 a 120 caracteres.',
    )
    expect(validarAula({ ...aulaNova(1, '19:10'), fim: '19:00', disciplina: 'BD' }).fim).toBe(
      'O fim precisa ser depois do início.',
    )
    expect(validarAula({ ...aulaNova(1, '19:10'), fim: '20:00', disciplina: 'BD', local: 'x'.repeat(81) }).local).toBe(
      'O local pode ter até 80 caracteres.',
    )
  })

  it('edição manda só o que mudou; local e docente vazios tiram o valor', () => {
    const atual = aula(1, '19:10', '20:50', 'Banco de Dados II', helena, 'Lab 4')
    const f = formularioDaAula(atual)
    expect(f).toEqual({ diaSemana: '1', inicio: '19:10', fim: '20:50', disciplina: 'Banco de Dados II', local: 'Lab 4', docenteId: 'd1' })
    expect(edicaoDaAula(atual, f)).toEqual({})
    expect(edicaoDaAula(atual, { ...f, diaSemana: '3', local: '', docenteId: '', disciplina: ' Banco de Dados II ' })).toEqual({
      diaSemana: 3,
      local: '',
      docenteId: '',
    })
  })

  it('nomes dos dias de segunda (1) a domingo (7)', () => {
    expect(NOME_DIA[1]).toBe('Segunda')
    expect(NOME_DIA[7]).toBe('Domingo')
  })
})
