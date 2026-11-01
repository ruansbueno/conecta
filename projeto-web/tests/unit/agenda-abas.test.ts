import { describe, expect, it } from 'vitest'

import {
  abaDaUrl,
  consultaDaAba,
  diasDoCalendario,
  eventosDoDia,
  faixaDoEvento,
  janelaDoMes,
  mesDaUrl,
  mesNaUrl,
  outroMes,
} from '../../src/lib/agenda'

// Datas locais: os testes rodam no fuso do navegador, como a interface.
const local = (a: number, m: number, d: number, h = 0, min = 0) => new Date(a, m - 1, d, h, min)

describe('abas da agenda (plan-f2 D-F2-1)', () => {
  it('aba da URL, com Próximos como padrão', () => {
    expect(abaDaUrl(null)).toBe('proximos')
    expect(abaDaUrl('realizados')).toBe('realizados')
    expect(abaDaUrl('qualquer')).toBe('proximos')
  })

  it('cada aba vira uma consulta da API', () => {
    const nov = { ano: 2026, mes: 11 }
    expect(consultaDaAba('proximos', nov)).toEqual({ situacao: 'ativo', quando: 'proximos' })
    expect(consultaDaAba('realizados', nov)).toEqual({ situacao: 'ativo', quando: 'realizados' })
    expect(consultaDaAba('arquivados', nov)).toEqual({ situacao: 'arquivado' })
    // A grade mostra semanas inteiras: pede do primeiro ao último dia dela, não só o mês.
    expect(consultaDaAba('mes', nov)).toEqual({ situacao: 'ativo', de: local(2026, 10, 26), ate: local(2026, 12, 7) })
  })

  it('mês da URL no formato AAAA-MM; inválido ou ausente vira o mês de hoje', () => {
    const hoje = local(2026, 10, 31, 15)
    expect(mesDaUrl('2026-11', hoje)).toEqual({ ano: 2026, mes: 11 })
    expect(mesDaUrl(null, hoje)).toEqual({ ano: 2026, mes: 10 })
    expect(mesDaUrl('2026-13', hoje)).toEqual({ ano: 2026, mes: 10 })
    expect(mesNaUrl({ ano: 2027, mes: 1 })).toBe('2027-01')
  })

  it('navegar entre meses atravessa o ano', () => {
    expect(outroMes({ ano: 2026, mes: 12 }, 1)).toEqual({ ano: 2027, mes: 1 })
    expect(outroMes({ ano: 2026, mes: 1 }, -1)).toEqual({ ano: 2025, mes: 12 })
  })

  it('janela do mês: do dia 1 ao dia 1 do mês seguinte, no fuso local', () => {
    expect(janelaDoMes({ ano: 2026, mes: 12 })).toEqual({ de: local(2026, 12, 1), ate: local(2027, 1, 1) })
  })
})

describe('calendário do mês (D-F2-7)', () => {
  it('semanas completas de segunda a domingo cobrindo o mês', () => {
    const dias = diasDoCalendario({ ano: 2026, mes: 11 })

    // Novembro de 2026 começa num domingo e termina numa segunda.
    expect(dias[0]).toEqual(local(2026, 10, 26))
    expect(dias.at(-1)).toEqual(local(2026, 12, 6))
    expect(dias.length % 7).toBe(0)
  })

  it('evento de vários dias aparece em cada dia que toca; o que termina à meia-noite, não no dia seguinte', () => {
    const semana = { inicio: local(2026, 11, 2, 19), fim: local(2026, 11, 4, 22) }
    const ateMeiaNoite = { inicio: local(2026, 11, 9, 20), fim: local(2026, 11, 10) }
    const pontual = { inicio: local(2026, 11, 3, 10), fim: null }

    expect(eventosDoDia([semana, ateMeiaNoite, pontual], local(2026, 11, 3))).toEqual([semana, pontual])
    expect(eventosDoDia([semana, ateMeiaNoite], local(2026, 11, 4))).toEqual([semana])
    expect(eventosDoDia([semana, ateMeiaNoite], local(2026, 11, 5))).toEqual([])
    expect(eventosDoDia([ateMeiaNoite], local(2026, 11, 10))).toEqual([])
  })
})

describe('faixa de horário do cartão (D-F2-6)', () => {
  it('no mesmo dia: início e fim', () => {
    expect(faixaDoEvento({ tipo: 'prova', inicio: local(2026, 10, 16, 19, 10), fim: local(2026, 10, 16, 20, 50) })).toBe(
      '19:10 – 20:50',
    )
  })

  it('sem fim: só a hora de início; data importante sem fim é prazo', () => {
    expect(faixaDoEvento({ tipo: 'palestra', inicio: local(2026, 10, 21, 19), fim: null })).toBe('19:00')
    expect(faixaDoEvento({ tipo: 'data_importante', inicio: local(2026, 10, 31, 23, 59), fim: null })).toBe('até 23:59')
  })

  it('vários dias: de um dia a outro', () => {
    expect(faixaDoEvento({ tipo: 'outro', inicio: local(2026, 9, 2, 8), fim: local(2026, 9, 4, 22) })).toBe(
      'de 02/09 a 04/09',
    )
  })

  it('termina à meia-noite do dia seguinte: conta como o mesmo dia', () => {
    expect(faixaDoEvento({ tipo: 'outro', inicio: local(2026, 9, 2, 20), fim: local(2026, 9, 3) })).toBe('20:00 – 00:00')
  })

  it('vira a noite e dura menos de um dia: datas e horas, para não perder as horas', () => {
    expect(faixaDoEvento({ tipo: 'outro', inicio: local(2026, 9, 2, 22), fim: local(2026, 9, 3, 2) })).toBe(
      '02/09 22:00 – 03/09 02:00',
    )
  })

  it('na virada do ano, as duas datas levam o ano', () => {
    expect(faixaDoEvento({ tipo: 'outro', inicio: local(2026, 12, 30, 8), fim: local(2027, 1, 2, 18) })).toBe(
      'de 30/12/2026 a 02/01/2027',
    )
    expect(faixaDoEvento({ tipo: 'outro', inicio: local(2026, 12, 31, 22), fim: local(2027, 1, 1, 2) })).toBe(
      '31/12/2026 22:00 – 01/01/2027 02:00',
    )
  })
})
