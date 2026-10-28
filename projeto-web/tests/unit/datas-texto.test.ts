import { describe, expect, it } from 'vitest'

import { dataCurta, dataHora, dataRelativa } from '../../src/lib/datas'
import { iniciais, quantidade, trecho } from '../../src/lib/texto'

describe('datas (pt-BR, fuso de quem acessa)', () => {
  const agora = new Date(2026, 9, 25, 15, 0) // 25/10/2026 15:00 local

  it('relativa: agora, minutos, horas, ontem, dia da semana e data curta', () => {
    const antes = (ms: number) => new Date(agora.getTime() - ms)
    expect(dataRelativa(antes(20_000), agora)).toBe('agora')
    expect(dataRelativa(antes(5 * 60_000), agora)).toBe('há 5 min')
    expect(dataRelativa(antes(2 * 3600_000), agora)).toBe('há 2 h')
    expect(dataRelativa(new Date(2026, 9, 24, 23, 50), agora)).toBe('ontem')
    expect(dataRelativa(new Date(2026, 9, 19, 9, 12), agora)).toBe('seg, 09:12')
    expect(dataRelativa(new Date(2026, 8, 12, 10), agora)).toBe('12 set')
    expect(dataRelativa(new Date(2025, 11, 3, 10), agora)).toBe('3 dez 2025')
  })

  it('data e hora completas e data curta', () => {
    expect(dataHora(new Date(2026, 9, 16, 8, 0))).toBe('16/10/2026, 08:00')
    expect(dataCurta(new Date(2026, 9, 16, 8, 0))).toBe('16 out, 08:00')
  })

  it('converte o UTC da API para o fuso local', () => {
    const utc = new Date('2026-10-25T12:00:00Z')
    const local = `${String(utc.getHours()).padStart(2, '0')}:${String(utc.getMinutes()).padStart(2, '0')}`
    expect(dataHora(utc)).toContain(local)
  })
})

describe('texto', () => {
  it('iniciais: primeiro e último nome, sem partículas', () => {
    expect(iniciais('Ricardo Lemos')).toBe('RL')
    expect(iniciais('Maria da Silva')).toBe('MS')
    expect(iniciais('Helena')).toBe('HE')
    expect(iniciais('')).toBe('?')
  })

  it('trecho corta em limite de palavra com reticências', () => {
    const longo = Array(60).fill('palavra').join(' ')
    const t = trecho(longo, 160)
    expect(t.length).toBeLessThanOrEqual(161)
    expect(t.endsWith('…')).toBe(true)
    expect(t).not.toContain('palavr…')
    expect(trecho('curto', 160)).toBe('curto')
  })
})

describe('quantidade', () => {
  it('concorda o plural e agrupa milhares em pt-BR', () => {
    expect(quantidade(1, 'aluno')).toBe('1 aluno')
    expect(quantidade(0, 'docente')).toBe('0 docentes')
    expect(quantidade(1248, 'aluno')).toBe('1.248 alunos')
  })
})
