// Esquemas zod do contrato (D9). Validam toda resposta da API e convertem para o formato da
// interface: camelCase e datas como Date. Campo desconhecido é descartado; enum desconhecido é
// aceito como texto, para a tela não quebrar quando a API crescer.
import { z } from 'zod'

const data = z.iso.datetime({ offset: true }).transform((s) => new Date(s))
const dataOuNulo = data.nullable()

export const PERFIS = ['administrador', 'coordenacao', 'docente', 'aluno'] as const
export type Perfil = (typeof PERFIS)[number]

export const turmaDoUsuarioSchema = z.object({
  id: z.string(),
  codigo: z.string(),
  nome: z.string(),
  papel: z.string(),
})

const usuarioBase = z.object({
  id: z.string(),
  username: z.string(),
  nome: z.string(),
  perfil: z.string(),
})

/** POST /auth/login. O access_token do corpo é do aplicativo: descartado aqui (RW-02). */
export const loginSchema = z.object({ usuario: usuarioBase, expires_in: z.number() })

export const usuarioSessaoSchema = usuarioBase.extend({ turmas: z.array(turmaDoUsuarioSchema) })
export type UsuarioSessao = z.infer<typeof usuarioSessaoSchema>

export const turmaSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    nome: z.string(),
    semestre_curso: z.number(),
    periodo_letivo: z.string(),
    inscricoes_abertas: z.boolean(),
    ativa: z.boolean(),
    criado_em: data,
    atualizado_em: data,
    total_alunos: z.number(),
    total_docentes: z.number(),
  })
  .transform((t) => ({
    id: t.id,
    codigo: t.codigo,
    nome: t.nome,
    semestreCurso: t.semestre_curso,
    periodoLetivo: t.periodo_letivo,
    inscricoesAbertas: t.inscricoes_abertas,
    ativa: t.ativa,
    criadoEm: t.criado_em,
    atualizadoEm: t.atualizado_em,
    totalAlunos: t.total_alunos,
    totalDocentes: t.total_docentes,
  }))
export type Turma = z.infer<typeof turmaSchema>

export const destinoSchema = z.object({
  tipo: z.string(),
  turma: z.object({ id: z.string(), nome: z.string() }).nullable(),
  semestre: z.number().nullable(),
})
export type Destino = z.infer<typeof destinoSchema>

const pessoaSchema = z.object({ id: z.string(), nome: z.string() })

export const avisoGestaoSchema = z
  .object({
    id: z.string(),
    titulo: z.string(),
    conteudo: z.string(),
    autor: pessoaSchema,
    situacao: z.string(),
    publicar_em: dataOuNulo,
    publicado_em: data,
    versao_atual: z.number(),
    criado_em: data,
    editado_em: dataOuNulo,
    arquivado_em: dataOuNulo,
    destinos: z.array(destinoSchema),
  })
  .transform((a) => ({
    id: a.id,
    titulo: a.titulo,
    conteudo: a.conteudo,
    autor: a.autor,
    situacao: a.situacao,
    publicarEm: a.publicar_em,
    publicadoEm: a.publicado_em,
    versaoAtual: a.versao_atual,
    criadoEm: a.criado_em,
    editadoEm: a.editado_em,
    arquivadoEm: a.arquivado_em,
    destinos: a.destinos,
  }))
export type AvisoGestao = z.infer<typeof avisoGestaoSchema>

export const usuarioGestaoSchema = usuarioBase
  .extend({ ativo: z.boolean(), ultimo_login_em: dataOuNulo })
  .transform(({ ultimo_login_em, ...u }) => ({ ...u, ultimoLoginEm: ultimo_login_em }))
export type UsuarioGestao = z.infer<typeof usuarioGestaoSchema>

/** Usuário com as turmas a que está vinculado (GET /gestao/usuarios/{id}). */
export const usuarioDetalheSchema = usuarioBase
  .extend({ ativo: z.boolean(), ultimo_login_em: dataOuNulo, turmas: z.array(turmaDoUsuarioSchema) })
  .transform(({ ultimo_login_em, ...u }) => ({ ...u, ultimoLoginEm: ultimo_login_em }))
export type UsuarioDetalhe = z.infer<typeof usuarioDetalheSchema>

export const vinculoSchema = z
  .object({
    usuario: z.object({ id: z.string(), username: z.string(), nome: z.string() }),
    papel: z.string(),
    origem: z.string(),
    criado_em: data,
  })
  .transform(({ criado_em, ...v }) => ({ ...v, criadoEm: criado_em }))
export type Vinculo = z.infer<typeof vinculoSchema>

export const solicitacaoGestaoSchema = z
  .object({
    id: z.string(),
    aluno: z.object({ id: z.string(), username: z.string(), nome: z.string() }),
    turma: z.object({ id: z.string(), codigo: z.string(), nome: z.string() }),
    status: z.string(),
    solicitada_em: data,
    decidida_em: dataOuNulo,
    decidida_por: pessoaSchema.nullable(),
    motivo_recusa: z.string().nullable(),
  })
  .transform((s) => ({
    id: s.id,
    aluno: s.aluno,
    turma: s.turma,
    status: s.status,
    solicitadaEm: s.solicitada_em,
    decididaEm: s.decidida_em,
    decididaPor: s.decidida_por,
    motivoRecusa: s.motivo_recusa,
  }))
export type SolicitacaoGestao = z.infer<typeof solicitacaoGestaoSchema>

export const versaoSchema = z
  .object({
    versao: z.number(),
    titulo: z.string(),
    conteudo: z.string(),
    publicar_em: dataOuNulo,
    destinos: z.array(
      z.object({ tipo: z.string(), turma_id: z.string().nullable(), semestre: z.number().nullable() }),
    ),
    criada_por: pessoaSchema,
    criada_em: data,
  })
  .transform((v) => ({
    versao: v.versao,
    titulo: v.titulo,
    conteudo: v.conteudo,
    publicarEm: v.publicar_em,
    destinos: v.destinos,
    criadaPor: v.criada_por,
    criadaEm: v.criada_em,
  }))
export type Versao = z.infer<typeof versaoSchema>

export const eventoSchema = z
  .object({
    id: z.string(),
    tipo: z.string(),
    usuario: pessoaSchema,
    ocorrido_em: data,
    versao: z.number().nullable(),
    alteracoes: z.record(z.string(), z.object({ de: z.unknown(), para: z.unknown() })).nullable(),
  })
  .transform(({ ocorrido_em, ...e }) => ({ ...e, ocorridoEm: ocorrido_em }))
export type EventoHistorico = z.infer<typeof eventoSchema>

// --- Agenda (E3, contracts §4–9). "Evento" aqui é o da agenda; o do histórico é `eventoSchema`.

export const eventoAgendaSchema = z
  .object({
    id: z.string(),
    titulo: z.string(),
    descricao: z.string().nullable(),
    tipo: z.string(),
    inicio: data,
    fim: dataOuNulo,
    local: z.string().nullable(),
    autor: pessoaSchema,
    situacao: z.string(),
    versao_atual: z.number(),
    criado_em: data,
    editado_em: dataOuNulo,
    arquivado_em: dataOuNulo,
    destinos: z.array(destinoSchema),
  })
  .transform((e) => ({
    id: e.id,
    titulo: e.titulo,
    descricao: e.descricao,
    tipo: e.tipo,
    inicio: e.inicio,
    fim: e.fim,
    local: e.local,
    autor: e.autor,
    situacao: e.situacao,
    versaoAtual: e.versao_atual,
    criadoEm: e.criado_em,
    editadoEm: e.editado_em,
    arquivadoEm: e.arquivado_em,
    destinos: e.destinos,
  }))
export type EventoAgenda = z.infer<typeof eventoAgendaSchema>

export const versaoEventoSchema = z
  .object({
    versao: z.number(),
    titulo: z.string(),
    descricao: z.string().nullable(),
    tipo: z.string(),
    inicio: data,
    fim: dataOuNulo,
    local: z.string().nullable(),
    destinos: z.array(
      z.object({ tipo: z.string(), turma_id: z.string().nullable(), semestre: z.number().nullable() }),
    ),
    criada_por: pessoaSchema,
    criada_em: data,
  })
  .transform(({ criada_por, criada_em, ...v }) => ({ ...v, criadaPor: criada_por, criadaEm: criada_em }))
export type VersaoEvento = z.infer<typeof versaoEventoSchema>

// --- Grade de horários (E3, contracts §3, §10–13). Horas em "HH:MM", sem data.

export const aulaSchema = z
  .object({
    id: z.string(),
    turma_id: z.string(),
    dia_semana: z.number(),
    inicio: z.string(),
    fim: z.string(),
    disciplina: z.string(),
    local: z.string().nullable(),
    docente: pessoaSchema.nullable(),
  })
  .transform((a) => ({
    id: a.id,
    turmaId: a.turma_id,
    diaSemana: a.dia_semana,
    inicio: a.inicio,
    fim: a.fim,
    disciplina: a.disciplina,
    local: a.local,
    docente: a.docente,
  }))
export type Aula = z.infer<typeof aulaSchema>

export const conflitoSchema = z
  .object({
    tipo: z.string(),
    local: z.string().nullable(),
    horario_id: z.string(),
    turma: z.object({ id: z.string(), codigo: z.string(), nome: z.string() }),
    inicio: z.string(),
    fim: z.string(),
  })
  .transform(({ horario_id, ...c }) => ({
    tipo: c.tipo,
    local: c.local,
    horarioId: horario_id,
    turma: c.turma,
    inicio: c.inicio,
    fim: c.fim,
  }))
export type Conflito = z.infer<typeof conflitoSchema>

export const aulaComConflitosSchema = z.object({
  horario: aulaSchema,
  conflitos: z.array(conflitoSchema),
})

export const paginaSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), total: z.number(), limit: z.number(), offset: z.number() })
export type Pagina<T> = { items: T[]; total: number; limit: number; offset: number }

/** Destino como a interface o guarda ao montar um aviso (o nome da turma serve só para exibir). */
export interface DestinoEscolhido {
  tipo: string
  turmaId?: string
  turmaNome?: string
  semestre?: number
}

/** Turma como a interface a cria ou edita (contrato §11, campos de POST). */
export interface DadosTurma {
  codigo: string
  nome: string
  semestreCurso: number
  periodoLetivo: string
  inscricoesAbertas: boolean
}
