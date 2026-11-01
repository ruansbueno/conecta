// Massa do servidor falso, com os mesmos nomes do seed da API (projeto-api/scripts/seed_dev_data.py).
import { randomUUID } from 'node:crypto'

import { agendaInicial } from './agenda.ts'

export interface UsuarioFalso {
  id: string
  username: string
  nome: string
  perfil: string
  ativo: boolean
  turmas: string[] // em que leciona ou estuda
  ultimo_login_em?: string | null
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

export interface SolicitacaoFalsa {
  id: string
  alunoId: string
  turmaId: string
  status: string
  solicitada_em: string
  decidida_em: string | null
  decidida_por: { id: string; nome: string } | null
  motivo_recusa: string | null
}

export interface TurmaFalsa {
  id: string
  codigo: string
  nome: string
  semestre_curso: number
  periodo_letivo: string
  inscricoes_abertas: boolean
  ativa: boolean
  criado_em: string
  atualizado_em: string
}

interface DestinoGuardado {
  tipo: string
  turma_id: string | null
  semestre: number | null
}

/** Versões e eventos de um aviso, imutáveis como na API (contrato §15). */
interface Auditoria {
  versoes: Record<string, unknown>[]
  eventos: Record<string, unknown>[]
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
  const turmas: TurmaFalsa[] = TURMAS.map(([codigo, nome, semestre], i) => ({
    id: `00000000-0000-4000-8000-00000000000${i + 1}`,
    codigo,
    nome,
    semestre_curso: semestre,
    periodo_letivo: '2026/2',
    inscricoes_abertas: true,
    ativa: true,
    criado_em: '2026-08-01T12:00:00Z',
    atualizado_em: '2026-08-01T12:00:00Z',
  }))
  const dia = 86_400_000
  const b = turmas[1].id
  const alunoTeste = () => usuarios.find((u) => u.username === 'aluno.teste')!
  const alunoDois = () => usuarios.find((u) => u.username === 'aluno2.teste')!
  /** Pedidos de inscrição: um antigo (espera > 3 dias) e dois recentes, em turmas de quem decide. */
  const solicitacoes: SolicitacaoFalsa[] = []

  /** Origem e data de cada vínculo (`turma:usuario`); sem registro, é da carga inicial. */
  const origens = new Map<string, { origem: string; criado_em: string }>()
  const [a, , , d] = turmas.map((t) => t.id)
  const usuarios: UsuarioFalso[] = [
    { id: randomUUID(), username: 'admin.teste', nome: 'Administrador de Teste', perfil: 'administrador', ativo: true, turmas: [] },
    { id: randomUUID(), username: 'coord.teste', nome: 'Marina Duarte', perfil: 'coordenacao', ativo: true, turmas: [] },
    { id: randomUUID(), username: 'docente.teste', nome: 'Ricardo Lemos', perfil: 'docente', ativo: true, turmas: [a, d] },
    { id: randomUUID(), username: 'aluno.teste', nome: 'Aluno de Teste', perfil: 'aluno', ativo: true, turmas: [a] },
    { id: randomUUID(), username: 'aluno2.teste', nome: 'Aluno Dois de Teste', perfil: 'aluno', ativo: true, turmas: [] },
    { id: randomUUID(), username: 'inativo.teste', nome: 'Inativo de Teste', perfil: 'docente', ativo: false, turmas: [] },
  ]
  const avisos: AvisoFalso[] = []
  const auditoria = new Map<string, Auditoria>()

  const canonicos = (aviso: AvisoFalso): DestinoGuardado[] =>
    (aviso.destinos as { tipo: string; turma: { id: string } | null; semestre: number | null }[])
      .map((d) => ({ tipo: d.tipo, turma_id: d.turma?.id ?? null, semestre: d.semestre }))
      .sort((a, b) => `${a.tipo}${a.turma_id}${a.semestre}`.localeCompare(`${b.tipo}${b.turma_id}${b.semestre}`))

  const pessoa = (u: UsuarioFalso) => ({ id: u.id, nome: u.nome })

  function registrar(aviso: AvisoFalso, u: UsuarioFalso, tipo: string, versao: number | null, alteracoes: unknown = null) {
    const a = auditoria.get(aviso.id) ?? { versoes: [], eventos: [] }
    auditoria.set(aviso.id, a)
    const agora = new Date().toISOString()
    if (versao !== null) {
      a.versoes.unshift({
        versao,
        titulo: aviso.titulo,
        conteudo: aviso.conteudo,
        publicar_em: aviso.publicar_em,
        destinos: canonicos(aviso),
        criada_por: pessoa(u),
        criada_em: agora,
      })
    }
    a.eventos.unshift({ id: randomUUID(), tipo, usuario: pessoa(u), ocorrido_em: agora, versao, alteracoes })
  }

  const destinoSaida = (d: DestinoIn) => ({
    tipo: d.tipo,
    turma: d.turma_id ? { id: d.turma_id, nome: turmas.find((t) => t.id === d.turma_id)!.nome } : null,
    semestre: d.semestre ?? null,
  })

  const agoraMs = Date.now()
  solicitacoes.push(
    { id: randomUUID(), alunoId: alunoDois().id, turmaId: b, status: 'pendente', solicitada_em: new Date(agoraMs - 5 * dia).toISOString(), decidida_em: null, decidida_por: null, motivo_recusa: null },
    { id: randomUUID(), alunoId: alunoDois().id, turmaId: turmas[0].id, status: 'pendente', solicitada_em: new Date(agoraMs - dia).toISOString(), decidida_em: null, decidida_por: null, motivo_recusa: null },
    { id: randomUUID(), alunoId: alunoTeste().id, turmaId: turmas[3].id, status: 'pendente', solicitada_em: new Date(agoraMs - 2 * dia).toISOString(), decidida_em: null, decidida_por: null, motivo_recusa: null },
  )

  /** Turma no formato de gestão: os totais contam os vínculos de verdade. */
  const turmaSaida = (t: TurmaFalsa) => ({
    ...t,
    total_alunos: usuarios.filter((u) => u.perfil === 'aluno' && u.turmas.includes(t.id)).length,
    total_docentes: usuarios.filter((u) => u.perfil === 'docente' && u.turmas.includes(t.id)).length,
  })

  return {
    turmas,
    usuarios,
    avisos,
    agenda: agendaInicial(turmas, usuarios),
    auditoria,
    turmaSaida,
    vinculosDa(turmaId: string, papel?: string | null) {
      return usuarios
        .filter((u) => u.turmas.includes(turmaId) && (u.perfil === 'docente' || u.perfil === 'aluno'))
        .filter((u) => !papel || u.perfil === papel)
        .map((u) => ({
          usuario: { id: u.id, username: u.username, nome: u.nome },
          papel: u.perfil,
          ...(origens.get(`${turmaId}:${u.id}`) ?? { origem: 'seed', criado_em: '2026-08-01T12:00:00Z' }),
        }))
    },
    vincular(turmaId: string, u: UsuarioFalso, origem = 'gestao') {
      u.turmas.push(turmaId)
      origens.set(`${turmaId}:${u.id}`, { origem, criado_em: new Date().toISOString() })
    },
    solicitacoes,
    solicitacaoSaida(s: SolicitacaoFalsa) {
      const aluno = usuarios.find((u) => u.id === s.alunoId)!
      const turma = turmas.find((t) => t.id === s.turmaId)!
      return {
        id: s.id,
        aluno: { id: aluno.id, username: aluno.username, nome: aluno.nome },
        turma: { id: turma.id, codigo: turma.codigo, nome: turma.nome },
        status: s.status,
        solicitada_em: s.solicitada_em,
        decidida_em: s.decidida_em,
        decidida_por: s.decidida_por,
        motivo_recusa: s.motivo_recusa,
      }
    },
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
      registrar(aviso, u, 'criado', 1)
      return aviso
    },
    /** `null`: nada mudou (a API responde 422 "nenhuma alteração"). */
    editarAviso(aviso: AvisoFalso, corpo: Record<string, unknown>, u: UsuarioFalso): AvisoFalso | null {
      const alteracoes: Record<string, { de: unknown; para: unknown }> = {}
      for (const campo of ['titulo', 'conteudo', 'publicar_em'] as const) {
        if (campo in corpo && corpo[campo] !== aviso[campo]) alteracoes[campo] = { de: aviso[campo], para: corpo[campo] }
      }
      const antes = canonicos(aviso)
      const destinosAntes = aviso.destinos
      if (corpo.destinos) aviso.destinos = (corpo.destinos as DestinoIn[]).map(destinoSaida)
      const depois = canonicos(aviso)
      if (JSON.stringify(antes) !== JSON.stringify(depois)) alteracoes.destinos = { de: antes, para: depois }
      if (Object.keys(alteracoes).length === 0) {
        aviso.destinos = destinosAntes
        return null
      }
      if ('titulo' in alteracoes) aviso.titulo = corpo.titulo
      if ('conteudo' in alteracoes) aviso.conteudo = corpo.conteudo
      if ('publicar_em' in alteracoes) {
        // Como a API: null publica já e grava a hora da publicação (não cai na data de criação);
        // publicado_em acompanha, inclusive no reagendamento.
        aviso.publicar_em = corpo.publicar_em ?? new Date().toISOString()
        aviso.publicado_em = aviso.publicar_em
        alteracoes.publicar_em.para = aviso.publicar_em
      }
      aviso.versao_atual += 1
      aviso.editado_em = new Date().toISOString()
      registrar(aviso, u, 'editado', aviso.versao_atual, alteracoes)
      return aviso
    },
    mudarSituacao(aviso: AvisoFalso, u: UsuarioFalso, situacao: string, evento: string) {
      aviso.situacao = situacao
      aviso.arquivado_em = situacao === 'arquivado' ? new Date().toISOString() : null
      registrar(aviso, u, evento, null)
      return aviso
    },
  }
}

export type Estado = ReturnType<typeof estadoInicial>
