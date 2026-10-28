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
