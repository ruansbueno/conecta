import { describe, expect, it } from 'vitest'

import { compararDestinos, destinoDoContrato } from '../../src/lib/destinos'

const nomes = new Map([
  ['t1', 'SI-3A'],
  ['t2', 'SI-3B'],
])

describe('destinos guardados em versões e alterações (sem nome de turma)', () => {
  it('ganham o nome da turma conhecida; turma desconhecida não quebra a tela', () => {
    expect(destinoDoContrato({ tipo: 'turma', turma_id: 't1', semestre: null }, nomes)).toEqual({
      tipo: 'turma',
      turma: { id: 't1', nome: 'SI-3A' },
      semestre: null,
    })
    expect(destinoDoContrato({ tipo: 'turma', turma_id: 'tx', semestre: null }, nomes).turma?.nome).toBe(
      'Turma indisponível',
    )
    expect(destinoDoContrato({ tipo: 'semestre', turma_id: null, semestre: 6 }, nomes)).toEqual({
      tipo: 'semestre',
      turma: null,
      semestre: 6,
    })
  })

  it('comparação como conjunto: adicionados, removidos e mantidos, sem depender da ordem', () => {
    const de = [
      { tipo: 'turma', turma_id: 't2', semestre: null },
      { tipo: 'turma', turma_id: 't1', semestre: null },
    ]
    const para = [
      { tipo: 'todos', turma_id: null, semestre: null },
      { tipo: 'turma', turma_id: 't1', semestre: null },
    ]
    const r = compararDestinos(de, para)
    expect(r.adicionados.map((d) => d.tipo)).toEqual(['todos'])
    expect(r.removidos.map((d) => d.turma_id)).toEqual(['t2'])
    expect(r.mantidos.map((d) => d.turma_id)).toEqual(['t1'])
  })

  it('aceita a lista em qualquer forma desconhecida sem lançar (dado de auditoria antigo)', () => {
    expect(compararDestinos(null, 'x')).toEqual({ adicionados: [], removidos: [], mantidos: [] })
  })
})
