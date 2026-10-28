import { describe, expect, it } from 'vitest'

import {
  avisoGestaoSchema,
  loginSchema,
  paginaSchema,
  turmaSchema,
  usuarioSessaoSchema,
} from '../../src/api/schemas'
import { avisoGestao, me, meDocente, pagina, respostaLogin, turma } from '../fixtures'

describe('esquemas do contrato', () => {
  it('login descarta o access_token: a web nunca guarda o token (RW-02)', () => {
    const r = loginSchema.parse(respostaLogin)

    expect(r).not.toHaveProperty('access_token')
    expect(r.usuario.perfil).toBe('coordenacao')
  })

  it('usuário da sessão com turmas', () => {
    expect(usuarioSessaoSchema.parse(meDocente).turmas[0].papel).toBe('docente')
    expect(usuarioSessaoSchema.parse(me).turmas).toEqual([])
  })

  it('perfil desconhecido não quebra', () => {
    expect(usuarioSessaoSchema.parse({ ...me, perfil: 'monitor' }).perfil).toBe('monitor')
  })

  it('aviso de gestão: datas viram Date (inclusive com microssegundos) e nulos ficam nulos', () => {
    const a = avisoGestaoSchema.parse(avisoGestao)

    expect(a.criadoEm).toBeInstanceOf(Date)
    expect(a.criadoEm.toISOString()).toBe('2026-10-01T12:00:00.123Z')
    expect(a.arquivadoEm).toBeNull()
    expect(a.versaoAtual).toBe(2)
    expect(a.destinos[1]).toEqual({ tipo: 'semestre', turma: null, semestre: 3 })
  })

  it('destino de tipo novo da API é aceito e mantém o valor cru', () => {
    const a = avisoGestaoSchema.parse({
      ...avisoGestao,
      destinos: [{ tipo: 'curso', turma: null, semestre: null }],
    })

    expect(a.destinos[0].tipo).toBe('curso')
  })

  it('turma de gestão e envelope de página', () => {
    const p = paginaSchema(turmaSchema).parse(pagina([turma], 42))

    expect(p.total).toBe(42)
    expect(p.items[0].totalAlunos).toBe(38)
    expect(p.items[0].semestreCurso).toBe(3)
  })

  it('campo obrigatório ausente é recusado', () => {
    expect(() => avisoGestaoSchema.parse({ ...avisoGestao, titulo: undefined })).toThrow()
  })
})
