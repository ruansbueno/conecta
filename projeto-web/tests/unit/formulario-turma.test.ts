import { describe, expect, it } from 'vitest'

import { dadosDaTurma, formularioDaTurma, turmaVazia, validarTurma } from '../../src/lib/formulario-turma'

const valida = { codigo: 'SI-3A', nome: 'Sistemas para Internet 3A', semestre: '3', periodo: '2026/2', inscricoesAbertas: true }

describe('validação local da turma (RW-24)', () => {
  it('turma válida não tem erros', () => {
    expect(validarTurma(valida)).toEqual({})
  })

  it('código, nome, semestre de 1 a 12 e período AAAA/N', () => {
    expect(validarTurma({ ...valida, codigo: '  ' }).codigo).toBe('Informe o código da turma.')
    expect(validarTurma({ ...valida, codigo: 'x'.repeat(41) }).codigo).toBe('O código tem no máximo 40 caracteres.')
    expect(validarTurma({ ...valida, nome: 'SI' }).nome).toBe('O nome precisa ter entre 3 e 120 caracteres.')
    for (const s of ['', '0', '13', '2.5', 'três']) {
      expect(validarTurma({ ...valida, semestre: s }).semestre).toBe('Escolha um semestre de 1 a 12.')
    }
    for (const p of ['2026', '2026/3', '26/2', '2026-2', '']) {
      expect(validarTurma({ ...valida, periodo: p }).periodo).toBe('Use o formato AAAA/N, com N igual a 1 ou 2 (ex.: 2026/2).')
    }
  })

  it('converte para o contrato (sem espaços nas pontas) e volta para o formulário', () => {
    expect(dadosDaTurma({ ...valida, codigo: ' SI-3A ', nome: ' Sistemas 3A ' })).toEqual({
      codigo: 'SI-3A',
      nome: 'Sistemas 3A',
      semestreCurso: 3,
      periodoLetivo: '2026/2',
      inscricoesAbertas: true,
    })
    expect(
      formularioDaTurma({ codigo: 'SI-3A', nome: 'Sistemas 3A', semestreCurso: 3, periodoLetivo: '2026/2', inscricoesAbertas: false }),
    ).toEqual({ codigo: 'SI-3A', nome: 'Sistemas 3A', semestre: '3', periodo: '2026/2', inscricoesAbertas: false })
    expect(turmaVazia().inscricoesAbertas).toBe(false)
  })
})
