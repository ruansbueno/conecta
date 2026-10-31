import { afterEach, describe, expect, it, vi } from 'vitest'

import { criarAula, editarAula, gradeDaTurma, removerAula } from '../../src/api/recursos/horarios'
import { conflito, horario, pagina } from '../fixtures'

function api(status: number, corpo?: unknown) {
  const fn = vi.fn(async () => new Response(corpo === undefined ? null : JSON.stringify(corpo), { status }))
  vi.stubGlobal('fetch', fn)
  return fn
}
const chamada = (fn: ReturnType<typeof api>) => {
  const [url, init] = fn.mock.calls[0] as unknown as [string, RequestInit]
  return { url, metodo: init.method, corpo: init.body ? JSON.parse(init.body as string) : undefined }
}

describe('recurso da grade de horários (contracts E3 §10–13)', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('grade da turma: pede tudo de uma vez e converte a aula', async () => {
    const fn = api(200, pagina([horario]))

    const r = await gradeDaTurma('t1')

    expect(chamada(fn).url).toBe('/api/gestao/turmas/t1/horarios?limit=100')
    expect(r.items[0]).toEqual({
      id: horario.id,
      turmaId: horario.turma_id,
      diaSemana: 1,
      inicio: '19:10',
      fim: '20:50',
      disciplina: 'Banco de Dados II',
      local: 'Lab 4',
      docente: { id: horario.docente.id, nome: 'Helena Prado' },
    })
  })

  it('criar devolve a aula e os conflitos; local e docente vazios não vão', async () => {
    const fn = api(201, { horario, conflitos: [conflito] })

    const r = await criarAula('t1', {
      diaSemana: 1,
      inicio: '19:10',
      fim: '20:50',
      disciplina: 'Banco de Dados II',
      local: '',
      docenteId: '',
    })

    expect(chamada(fn)).toEqual({
      url: '/api/gestao/turmas/t1/horarios',
      metodo: 'POST',
      corpo: { dia_semana: 1, inicio: '19:10', fim: '20:50', disciplina: 'Banco de Dados II' },
    })
    expect(r.conflitos).toEqual([
      {
        tipo: 'sala',
        local: 'Lab 4',
        horarioId: conflito.horario_id,
        turma: conflito.turma,
        inicio: '19:10',
        fim: '20:50',
      },
    ])
  })

  it('editar manda null para tirar local e docente', async () => {
    const fn = api(200, { horario, conflitos: [] })

    await editarAula('t1', 'h1', { local: '', docenteId: '' })

    expect(chamada(fn)).toEqual({
      url: '/api/gestao/turmas/t1/horarios/h1',
      metodo: 'PATCH',
      corpo: { local: null, docente_id: null },
    })
  })

  it('remover', async () => {
    const fn = api(204)

    await removerAula('t1', 'h1')

    expect(chamada(fn)).toMatchObject({ url: '/api/gestao/turmas/t1/horarios/h1', metodo: 'DELETE' })
  })
})
