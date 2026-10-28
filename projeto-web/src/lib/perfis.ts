// O que cada perfil pode fazer, como na matriz de permissões da API (spec da API §3; RW-33).
export const PERFIS_DE_ACESSO = [
  { id: 'administrador', rotulo: 'Administrador', descricao: 'Gerencia usuários, perfis e tudo que a coordenação faz.' },
  { id: 'coordenacao', rotulo: 'Coordenação', descricao: 'Gerencia turmas, vínculos, solicitações e avisos para qualquer público.' },
  { id: 'docente', rotulo: 'Docente', descricao: 'Publica avisos e aprova solicitações apenas das turmas em que leciona.' },
  { id: 'aluno', rotulo: 'Aluno', descricao: 'Pelo aplicativo: consulta avisos e as próprias turmas e pede inscrição em turmas.' },
] as const

export type PerfilDeAcesso = (typeof PERFIS_DE_ACESSO)[number]['id']

export const rotuloDoPerfil = (perfil: string) => PERFIS_DE_ACESSO.find((p) => p.id === perfil)?.rotulo ?? perfil
