import { describe, expect, it } from 'vitest'

import { formularioVazio, mesmosDestinos, validarAviso } from '../../src/lib/formulario-aviso'

const valido = { ...formularioVazio(), titulo: 'Título', conteudo: 'Texto', destinos: [{ tipo: 'todos' }] }

describe('validação local do aviso', () => {
  it('formulário válido não tem erros', () => {
    expect(validarAviso(valido)).toEqual({})
  })

  it('título, conteúdo e destinos', () => {
    const erros = validarAviso({ ...valido, titulo: 'ab', conteudo: '  ', destinos: [] })

    expect(Object.keys(erros).sort()).toEqual(['conteudo', 'destinos', 'titulo'])
    expect(erros.destinos).toMatch(/pelo menos um destino/)
  })

  it('mais de 20 destinos', () => {
    const destinos = Array.from({ length: 21 }, (_, i) => ({ tipo: 'semestre', semestre: i }))

    expect(validarAviso({ ...valido, destinos }).destinos).toBe('No máximo 20 destinos por aviso.')
  })

  it('agendamento exige data e hora futuras', () => {
    const agora = new Date(2026, 9, 25, 12, 0)

    expect(validarAviso({ ...valido, agendar: true }, agora).publicar_em).toBe('Informe a data e a hora da publicação.')
    expect(validarAviso({ ...valido, agendar: true, data: '2026-10-25', hora: '11:00' }, agora).publicar_em).toBe(
      'Escolha uma data e hora no futuro.',
    )
    expect(validarAviso({ ...valido, agendar: true, data: '2026-10-25', hora: '13:00' }, agora).publicar_em).toBeUndefined()
  })

  it('compara destinos sem depender da ordem', () => {
    expect(mesmosDestinos([{ tipo: 'todos' }, { tipo: 'docentes' }], [{ tipo: 'docentes' }, { tipo: 'todos' }])).toBe(true)
    expect(mesmosDestinos([{ tipo: 'todos' }], [{ tipo: 'docentes' }])).toBe(false)
  })
})
