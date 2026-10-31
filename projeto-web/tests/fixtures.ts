// Exemplos do contrato da API (projeto-api/specs/001-auth-perfil-turmas-avisos/contracts/api.md).

export const usuarioLogin = {
  id: '7b1c0e3a-6f64-4f43-8a58-2f3d5f0c1a11',
  username: 'coord.teste',
  nome: 'Maria Coordenadora',
  perfil: 'coordenacao',
}

export const respostaLogin = {
  access_token: 'eyJhbGciOi.token.assinatura',
  token_type: 'bearer',
  expires_in: 86400,
  usuario: usuarioLogin,
}

export const me = {
  ...usuarioLogin,
  turmas: [] as { id: string; codigo: string; nome: string; papel: string }[],
}

export const meDocente = {
  id: '22bb0000-0000-4000-8000-000000000002',
  username: 'docente.teste',
  nome: 'Ricardo Lemos',
  perfil: 'docente',
  turmas: [
    { id: 'c3f0a1b2-0000-4000-8000-000000000001', codigo: 'TADS-3A-2026-2', nome: 'TADS 3º Sem A', papel: 'docente' },
  ],
}

export const turma = {
  id: 'c3f0a1b2-0000-4000-8000-000000000001',
  codigo: 'TADS-3A-2026-2',
  nome: 'TADS 3º Semestre A',
  semestre_curso: 3,
  periodo_letivo: '2026/2',
  inscricoes_abertas: true,
  ativa: true,
  criado_em: '2026-08-01T12:00:00Z',
  atualizado_em: '2026-08-01T12:00:00Z',
  total_alunos: 38,
  total_docentes: 4,
}

export const avisoGestao = {
  id: 'e5d20000-0000-4000-8000-000000000001',
  titulo: 'Reunião de pais e alunos',
  conteudo: 'Será realizada na sexta, às 19h, no auditório.',
  autor: { id: '11aa0000-0000-4000-8000-000000000001', nome: 'Maria Coordenadora' },
  situacao: 'ativo',
  publicar_em: '2026-10-03T12:00:00Z',
  publicado_em: '2026-10-03T12:00:00Z',
  versao_atual: 2,
  criado_em: '2026-10-01T12:00:00.123456Z',
  editado_em: '2026-10-02T08:00:00Z',
  arquivado_em: null,
  destinos: [
    { tipo: 'turma', turma: { id: 'c3f0a1b2-0000-4000-8000-000000000001', nome: 'TADS 3º Sem A' }, semestre: null },
    { tipo: 'semestre', turma: null, semestre: 3 },
  ],
}

export const pagina = <T>(items: T[], total = items.length) => ({ items, total, limit: 20, offset: 0 })

export const erro = (code: string, detail = 'texto do servidor', errors?: object[]) => ({
  detail,
  code,
  ...(errors ? { errors } : {}),
})

export const solicitacao = {
  id: 's1',
  aluno: { id: 'a1', username: 'julia.santos', nome: 'Júlia Santos' },
  turma: { id: 't1', codigo: 'SI-3A', nome: 'Sistemas para Internet 3A' },
  status: 'pendente',
  solicitada_em: '2026-10-12T20:14:00Z',
  decidida_em: null,
  decidida_por: null,
  motivo_recusa: null,
}

export const meAdmin = {
  id: '33cc0000-0000-4000-8000-000000000003',
  username: 'admin.teste',
  nome: 'Paulo Ferraz',
  perfil: 'administrador',
  turmas: [] as { id: string; codigo: string; nome: string; papel: string }[],
}

export const eventoGestao = {
  id: 'e7e00000-0000-4000-8000-000000000001',
  titulo: 'Defesas de TCC II',
  descricao: 'Cinco defesas, com arguição aberta ao público.',
  tipo: 'banca',
  inicio: '2026-11-24T17:00:00Z',
  fim: '2026-11-24T21:00:00Z',
  local: 'Sala 203',
  autor: { id: '11aa0000-0000-4000-8000-000000000001', nome: 'Maria Coordenadora' },
  situacao: 'ativo',
  versao_atual: 2,
  criado_em: '2026-10-01T12:00:00Z',
  editado_em: '2026-10-05T09:00:00Z',
  arquivado_em: null,
  destinos: [
    { tipo: 'semestre', turma: null, semestre: 6 },
    { tipo: 'docentes', turma: null, semestre: null },
  ],
}

export const versaoEvento = {
  versao: 1,
  titulo: 'Defesas de TCC II',
  descricao: null,
  tipo: 'banca',
  inicio: '2026-11-24T17:00:00Z',
  fim: null,
  local: 'Sala 203',
  destinos: [{ tipo: 'todos', turma_id: null, semestre: null }],
  criada_por: { id: '11aa0000-0000-4000-8000-000000000001', nome: 'Maria Coordenadora' },
  criada_em: '2026-10-01T12:00:00Z',
}

export const horario = {
  id: 'c9d80000-0000-4000-8000-000000000001',
  turma_id: 'c3f0a1b2-0000-4000-8000-000000000001',
  dia_semana: 1,
  inicio: '19:10',
  fim: '20:50',
  disciplina: 'Banco de Dados II',
  local: 'Lab 4',
  docente: { id: '22bb0000-0000-4000-8000-000000000001', nome: 'Helena Prado' },
}

export const conflito = {
  tipo: 'sala',
  local: 'Lab 4',
  horario_id: 'f4e30000-0000-4000-8000-000000000001',
  turma: { id: 'd7a10000-0000-4000-8000-000000000001', codigo: 'SI-3B-2026-2', nome: 'SI 3º Sem B' },
  inicio: '19:10',
  fim: '20:50',
}
