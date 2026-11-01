import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  edicaoDoEvento,
  formularioDoEvento,
  formularioEventoVazio,
  novoEvento,
  validarEvento,
} from '../../src/lib/formulario-evento'

const TODOS = [{ tipo: 'todos' }]
const preenchido = {
  ...formularioEventoVazio(),
  titulo: 'Defesas de TCC II',
  tipo: 'banca',
  inicio: '2026-11-24T14:00',
  fim: '2026-11-24T18:00',
  local: 'Sala 203',
  descricao: '',
  destinos: TODOS,
}

describe('formulário de evento (plan-f2 D-F2-5)', () => {
  it('válido não tem erros', () => {
    expect(validarEvento(preenchido)).toEqual({})
  })

  it('obrigatórios: título de 3 a 150, tipo, início e ao menos um destino', () => {
    expect(validarEvento(formularioEventoVazio())).toEqual({
      titulo: 'Informe um título com ao menos 3 caracteres.',
      tipo: 'Escolha o tipo do evento.',
      inicio: 'Informe a data e a hora de início.',
      destinos: 'Escolha ao menos um destino.',
    })
    expect(validarEvento({ ...preenchido, titulo: 'x'.repeat(151) }).titulo).toBe('O título pode ter até 150 caracteres.')
  })

  it('fim é opcional, mas, se houver, vem depois do início', () => {
    expect(validarEvento({ ...preenchido, fim: '' })).toEqual({})
    expect(validarEvento({ ...preenchido, fim: '2026-11-24T14:00' }).fim).toBe('O fim precisa ser depois do início.')
  })

  it('data ou hora incompleta não vira evento pontual em silêncio', () => {
    expect(validarEvento({ ...preenchido, fim: 'incompleto' }).fim).toBe('Complete a data e a hora.')
    expect(validarEvento({ ...preenchido, inicio: 'incompleto' }).inicio).toBe('Complete a data e a hora.')
  })

  describe('hora que não existe no fuso (horário de verão)', () => {
    // Nova York adianta o relógio de 02:00 para 03:00 em 14/03/2027: 02:30 não existe lá.
    beforeEach(() => {
      vi.stubEnv('TZ', 'America/New_York')
    })
    afterEach(() => {
      vi.unstubAllEnvs()
    })

    it('é recusada no campo, em vez de virar outra hora em silêncio', () => {
      const mensagem = 'Este horário não existe neste fuso por causa do horário de verão. Escolha outro.'
      expect(validarEvento({ ...preenchido, inicio: '2027-03-14T02:30', fim: '2027-03-14T05:00' }).inicio).toBe(mensagem)
      expect(validarEvento({ ...preenchido, inicio: '2027-03-14T01:00', fim: '2027-03-14T02:15' }).fim).toBe(mensagem)
    })

    it('a hora que existe (inclusive a repetida, quando o relógio volta) passa', () => {
      expect(validarEvento({ ...preenchido, inicio: '2027-03-14T03:00', fim: '2027-03-14T05:00' })).toEqual({})
      expect(validarEvento({ ...preenchido, inicio: '2026-11-01T01:30', fim: '2026-11-01T03:00' })).toEqual({})
    })
  })

  it('limites de local, descrição e destinos', () => {
    expect(validarEvento({ ...preenchido, local: 'x'.repeat(121) }).local).toBe('O local pode ter até 120 caracteres.')
    expect(validarEvento({ ...preenchido, descricao: 'x'.repeat(5001) }).descricao).toBe(
      'A descrição pode ter até 5000 caracteres.',
    )
    const muitos = Array.from({ length: 21 }, (_, i) => ({ tipo: 'turma', turmaId: `t${i}` }))
    expect(validarEvento({ ...preenchido, destinos: muitos }).destinos).toBe('Um evento pode ter até 20 destinos.')
  })

  it('novo evento: datas locais viram Date; fim vazio é pontual', () => {
    const e = novoEvento({ ...preenchido, fim: '', titulo: '  Defesas  ' })

    expect(e.titulo).toBe('Defesas')
    expect(e.inicio).toEqual(new Date(2026, 10, 24, 14, 0))
    expect(e.fim).toBeNull()
    expect(e.destinos).toEqual(TODOS)
  })

  it('editar: o formulário parte do evento e só o que mudou é enviado', () => {
    const evento = {
      titulo: 'Defesas de TCC II',
      tipo: 'banca',
      inicio: new Date(2026, 10, 24, 14, 0),
      fim: new Date(2026, 10, 24, 18, 0),
      local: 'Sala 203',
      descricao: null,
      destinos: [{ tipo: 'todos', turma: null, semestre: null }],
    }
    const form = formularioDoEvento(evento)
    expect(form).toEqual(preenchido)

    expect(edicaoDoEvento({ ...form, local: 'Lab 4', fim: '' }, evento)).toEqual({ local: 'Lab 4', fim: null })
    expect(edicaoDoEvento(form, evento)).toEqual({})
  })
})
