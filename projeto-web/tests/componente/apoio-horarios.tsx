// Apoio dos testes de horários (F2, T13): uma turma com grade, docentes e a página montada.
import { screen } from '@testing-library/react'

import Grade from '../../src/paginas/horarios/grade'
import { conflito, horario, pagina, turma } from '../fixtures'
import { abrirEm, apiAgenda, type Rotas } from './apoio-agenda'

export const TURMA = { ...turma, codigo: 'SI-3A', nome: 'Sistemas para Internet 3A' }
export const ID = TURMA.id
export const CAMINHO = `/gestao/turmas/${ID}/horarios`

export const HELENA = { id: '22bb0000-0000-4000-8000-000000000001', nome: 'Helena Prado' }
export const RICARDO = { id: '22bb0000-0000-4000-8000-000000000002', nome: 'Ricardo Lemos' }
const docente = (p: { id: string; nome: string }) => ({
  ...p,
  username: p.nome.toLowerCase().replace(' ', '.'),
  perfil: 'docente',
  ativo: true,
  ultimo_login_em: null,
})

export const BD = { ...horario, turma_id: ID, docente: HELENA }
export const REDES = {
  ...horario,
  id: 'c9d80000-0000-4000-8000-000000000002',
  turma_id: ID,
  dia_semana: 2,
  fim: '20:00',
  disciplina: 'Redes de Computadores',
  local: 'Lab 2',
  docente: RICARDO,
}
export const ES = {
  ...horario,
  id: 'c9d80000-0000-4000-8000-000000000003',
  turma_id: ID,
  dia_semana: 1,
  inicio: '21:00',
  fim: '22:40',
  disciplina: 'Engenharia de Software',
  local: null,
  docente: null,
}

export { conflito }

export function apiHorarios(rotas: Rotas = {}) {
  return apiAgenda({
    [`GET /gestao/turmas/${ID}`]: { status: 200, corpo: TURMA },
    [`GET ${CAMINHO}`]: { status: 200, corpo: pagina([BD, REDES, ES]) },
    'GET /gestao/usuarios': { status: 200, corpo: pagina([docente(HELENA), docente(RICARDO)]) },
    ...rotas,
  })
}

export async function abrirGrade() {
  abrirEm(`/turmas/${ID}/horarios`, '/turmas/:id/horarios', <Grade />, ['/horarios', '/avisos/novo', '/sem-permissao'])
  return screen.findByRole('table', { name: /grade semanal/i })
}
