// Massa do servidor falso, com os mesmos nomes do seed da API (projeto-api/scripts/seed_dev_data.py).
import { randomUUID } from 'node:crypto'

export interface UsuarioFalso {
  id: string
  username: string
  nome: string
  perfil: string
  ativo: boolean
  turmas: string[] // em que leciona ou estuda
}

export interface AvisoFalso {
  id: string
  titulo: unknown
  conteudo: unknown
  autor: { id: string; nome: string }
  situacao: string
  publicar_em: unknown
  publicado_em: unknown
  versao_atual: number
  criado_em: string
  editado_em: string | null
  arquivado_em: string | null
  destinos: unknown[]
}

type Validacao =
  | { ok: true }
  | { erro: string; status: number; errors?: { campo: string; mensagem: string }[] }

interface DestinoIn {
  tipo: string
  turma_id?: string
  semestre?: number
}

const TURMAS = [
  ['TADS-3A-2026-2', 'TADS 3º Sem A', 3],
  ['TADS-3B-2026-2', 'TADS 3º Sem B', 3],
  ['TADS-3C-2026-2', 'TADS 3º Sem C', 3],
  ['TADS-5A-2026-2', 'TADS 5º Sem A', 5],
] as const

export function estadoInicial() {
  const turmas = TURMAS.map(([codigo, nome, semestre], i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    codigo,
    nome,
    semestre_curso: semestre,
    periodo_letivo: '2026/2',
    inscricoes_abertas: true,
    ativa: true,
    criado_em: '2026-08-01T12:00:00Z',
    atualizado_em: '2026-08-01T12:00:00Z',
    total_alunos: 30 + i,
    total_docentes: 2,
  }))
  const [a, , , d] = turmas.map((t) => t.id)
  const usuarios: UsuarioFalso[] = [
    { id: randomUUID(), username: 'admin.teste', nome: 'Administrador de Teste', perfil: 'administrador', ativo: true, turmas: [] },
    { id: randomUUID(), username: 'coord.teste', nome: 'Marina Duarte', perfil: 'coordenacao', ativo: true, turmas: [] },
    { id: randomUUID(), username: 'docente.teste', nome: 'Ricardo Lemos', perfil: 'docente', ativo: true, turmas: [a, d] },
    { id: randomUUID(), username: 'aluno.teste', nome: 'Aluno de Teste', perfil: 'aluno', ativo: true, turmas: [a] },
    { id: randomUUID(), username: 'inativo.teste', nome: 'Inativo de Teste', perfil: 'docente', ativo: false, turmas: [] },
  ]
  const avisos: AvisoFalso[] = []

  const destinoSaida = (d: DestinoIn) => ({
    tipo: d.tipo,
    turma: d.turma_id ? { id: d.turma_id, nome: turmas.find((t) => t.id === d.turma_id)!.nome } : null,
    semestre: d.semestre ?? null,
  })

  return {
    turmas,
    usuarios,
    avisos,
    sessoes: new Map<string, string>(),
    publico: (u: UsuarioFalso) => ({ id: u.id, username: u.username, nome: u.nome, perfil: u.perfil }),
    me: (u: UsuarioFalso) => ({
      id: u.id,
      username: u.username,
      nome: u.nome,
      perfil: u.perfil,
      turmas: turmas
        .filter((t) => u.turmas.includes(t.id))
        .map((t) => ({ id: t.id, codigo: t.codigo, nome: t.nome, papel: u.perfil === 'docente' ? 'docente' : 'aluno' })),
    }),
    validarAviso(corpo: Record<string, unknown>, u: UsuarioFalso, gestao: boolean, edicao: boolean): Validacao {
      const errors: { campo: string; mensagem: string }[] = []
      const titulo = corpo.titulo as string | undefined
      const conteudo = corpo.conteudo as string | undefined
      const destinos = corpo.destinos as DestinoIn[] | undefined
      if (!edicao || titulo !== undefined) {
        if (!titulo || titulo.length < 3 || titulo.length > 150) errors.push({ campo: 'titulo', mensagem: 'deve ter entre 3 e 150 caracteres' })
      }
      if (!edicao || conteudo !== undefined) {
        if (!conteudo || conteudo.length > 5000) errors.push({ campo: 'conteudo', mensagem: 'deve ter entre 1 e 5000 caracteres' })
      }
      if (!edicao || destinos !== undefined) {
        if (!destinos || destinos.length < 1 || destinos.length > 20) errors.push({ campo: 'destinos', mensagem: 'de 1 a 20 destinos' })
      }
      const publicarEm = corpo.publicar_em as string | null | undefined
      if (publicarEm && new Date(publicarEm) <= new Date()) errors.push({ campo: 'publicar_em', mensagem: 'deve ser uma data futura' })
      if (errors.length) return { erro: 'VALIDATION_ERROR', status: 422, errors }
      for (const d of destinos ?? []) {
        if (d.turma_id && !turmas.some((t) => t.id === d.turma_id)) return { erro: 'TURMA_NAO_ENCONTRADA', status: 404 }
        if (!gestao && (d.tipo !== 'turma' || !u.turmas.includes(d.turma_id!))) return { erro: 'DESTINO_NAO_PERMITIDO', status: 403 }
      }
      return { ok: true }
    },
    criarAviso(corpo: Record<string, unknown>, u: UsuarioFalso): AvisoFalso {
      const agora = new Date().toISOString()
      const aviso: AvisoFalso = {
        id: randomUUID(),
        titulo: corpo.titulo,
        conteudo: corpo.conteudo,
        autor: { id: u.id, nome: u.nome },
        situacao: 'ativo',
        publicar_em: corpo.publicar_em ?? null,
        publicado_em: corpo.publicar_em ?? agora,
        versao_atual: 1,
        criado_em: agora,
        editado_em: null,
        arquivado_em: null,
        destinos: (corpo.destinos as DestinoIn[]).map(destinoSaida),
      }
      avisos.unshift(aviso)
      return aviso
    },
    editarAviso(aviso: AvisoFalso, corpo: Record<string, unknown>): AvisoFalso {
      if ('titulo' in corpo) aviso.titulo = corpo.titulo
      if ('conteudo' in corpo) aviso.conteudo = corpo.conteudo
      if ('publicar_em' in corpo) aviso.publicar_em = corpo.publicar_em
      if (corpo.destinos) aviso.destinos = (corpo.destinos as DestinoIn[]).map(destinoSaida)
      aviso.versao_atual += 1
      aviso.editado_em = new Date().toISOString()
      return aviso
    },
  }
}

export type Estado = ReturnType<typeof estadoInicial>
