// Agenda e grade de horários do servidor falso (plan-f2 D-F2-15): /gestao/eventos e
// /gestao/turmas/{id}/horarios, fiéis ao contrato da E3 (projeto-api/specs/002-agenda-horarios).
import { randomUUID } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'

import type { TurmaFalsa, UsuarioFalso } from './dados.ts'

const TIPOS = ['palestra', 'banca', 'reuniao', 'formatura', 'prova', 'data_importante', 'outro']
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const ISO_COM_FUSO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/
const UUID = /^[0-9a-f-]{36}$/i

interface DestinoIn {
  tipo: string
  turma_id?: string
  semestre?: number
}

export interface EventoFalso {
  id: string
  titulo: string
  descricao: string | null
  tipo: string
  inicio: string
  fim: string | null
  local: string | null
  autor: { id: string; nome: string }
  situacao: string
  versao_atual: number
  criado_em: string
  editado_em: string | null
  arquivado_em: string | null
  destinos: { tipo: string; turma: { id: string; nome: string } | null; semestre: number | null }[]
}

export interface AulaFalsa {
  id: string
  turma_id: string
  dia_semana: number
  inicio: string
  fim: string
  disciplina: string
  local: string | null
  docente_id: string | null
}

type Erro = { campo: string; mensagem: string }

const hora = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

export function agendaInicial(turmas: TurmaFalsa[], usuarios: UsuarioFalso[]) {
  const eventos: EventoFalso[] = []
  const auditoria = new Map<string, { versoes: Record<string, unknown>[]; eventos: Record<string, unknown>[] }>()
  const aulas: AulaFalsa[] = []
  const quem = (username: string) => usuarios.find((u) => u.username === username)!
  const [a, b] = turmas

  const canonicos = (e: EventoFalso) =>
    e.destinos
      .map((d) => ({ tipo: d.tipo, turma_id: d.turma?.id ?? null, semestre: d.semestre }))
      .sort((x, y) => `${x.tipo}${x.turma_id}${x.semestre}`.localeCompare(`${y.tipo}${y.turma_id}${y.semestre}`))

  function registrar(e: EventoFalso, u: UsuarioFalso, tipo: string, versao: number | null, alteracoes: unknown = null) {
    const reg = auditoria.get(e.id) ?? { versoes: [], eventos: [] }
    auditoria.set(e.id, reg)
    const agora = new Date().toISOString()
    if (versao !== null) {
      const { titulo, descricao, tipo: tipoEvento, inicio, fim, local } = e
      reg.versoes.unshift({
        versao,
        titulo,
        descricao,
        tipo: tipoEvento,
        inicio,
        fim,
        local,
        destinos: canonicos(e),
        criada_por: { id: u.id, nome: u.nome },
        criada_em: agora,
      })
    }
    reg.eventos.unshift({ id: randomUUID(), tipo, usuario: { id: u.id, nome: u.nome }, ocorrido_em: agora, versao, alteracoes })
  }

  const destinoSaida = (d: DestinoIn) => ({
    tipo: d.tipo,
    turma: d.turma_id ? { id: d.turma_id, nome: turmas.find((t) => t.id === d.turma_id)!.nome } : null,
    semestre: d.semestre ?? null,
  })

  function criar(corpo: Record<string, unknown>, u: UsuarioFalso): EventoFalso {
    const agora = new Date().toISOString()
    const e: EventoFalso = {
      id: randomUUID(),
      titulo: corpo.titulo as string,
      descricao: (corpo.descricao as string | undefined) ?? null,
      tipo: corpo.tipo as string,
      inicio: new Date(corpo.inicio as string).toISOString(),
      fim: corpo.fim ? new Date(corpo.fim as string).toISOString() : null,
      local: (corpo.local as string | undefined) ?? null,
      autor: { id: u.id, nome: u.nome },
      situacao: 'ativo',
      versao_atual: 1,
      criado_em: agora,
      editado_em: null,
      arquivado_em: null,
      destinos: (corpo.destinos as DestinoIn[]).map(destinoSaida),
    }
    eventos.push(e)
    registrar(e, u, 'criado', 1)
    return e
  }

  // Massa inicial, como o seed da API: em andamento, próximos, encerrado e arquivado.
  const coord = quem('coord.teste')
  const docente = quem('docente.teste')
  criar({ titulo: 'Semana acadêmica', tipo: 'palestra', inicio: hora(-24), fim: hora(48), local: 'Auditório', destinos: [{ tipo: 'todos' }] }, coord)
  criar({ titulo: 'Prova de Banco de Dados II', tipo: 'prova', inicio: hora(72), fim: hora(74), local: 'Lab 4', destinos: [{ tipo: 'turma', turma_id: a.id }] }, docente)
  criar({ titulo: 'Palestra: carreira em TI', tipo: 'palestra', inicio: hora(144), fim: hora(146), local: 'Auditório', destinos: [{ tipo: 'todos' }] }, coord)
  criar({ titulo: 'Reunião de colegiado', tipo: 'reuniao', inicio: hora(-120), fim: hora(-118), local: 'Sala 101', destinos: [{ tipo: 'docentes' }] }, coord)
  const formatura = criar({ titulo: 'Formatura 2026/1', tipo: 'formatura', inicio: hora(-1440), fim: hora(-1437), local: 'Ginásio', destinos: [{ tipo: 'todos' }] }, coord)
  formatura.situacao = 'arquivado'
  formatura.arquivado_em = hora(-1000)
  registrar(formatura, coord, 'arquivado', null)

  aulas.push(
    { id: randomUUID(), turma_id: a.id, dia_semana: 1, inicio: '19:10', fim: '20:50', disciplina: 'Banco de Dados II', local: 'Lab 4', docente_id: docente.id },
    { id: randomUUID(), turma_id: a.id, dia_semana: 1, inicio: '21:00', fim: '22:40', disciplina: 'Engenharia de Software', local: 'Sala 203', docente_id: null },
    { id: randomUUID(), turma_id: a.id, dia_semana: 3, inicio: '19:10', fim: '20:50', disciplina: 'Redes de Computadores', local: 'Lab 5', docente_id: null },
    { id: randomUUID(), turma_id: b.id, dia_semana: 1, inicio: '19:10', fim: '20:50', disciplina: 'Algoritmos', local: 'lab 4', docente_id: null },
  )

  return { eventos, auditoria, aulas, registrar, criar, destinoSaida, canonicos }
}

export type Agenda = ReturnType<typeof agendaInicial>

interface Contexto {
  req: IncomingMessage
  res: ServerResponse
  url: URL
  metodo: string
  caminho: string
  usuario: UsuarioFalso
  gestao: boolean
  agenda: Agenda
  turmas: TurmaFalsa[]
  usuarios: UsuarioFalso[]
  corpoJson: (req: IncomingMessage) => Promise<Record<string, unknown> | null>
  json: (res: ServerResponse, status: number, corpo?: unknown) => void
  erro: (res: ServerResponse, status: number, code: string, detail?: string, errors?: object[]) => void
  pagina: <T>(itens: T[], url: URL) => unknown
}

const termino = (e: EventoFalso) => new Date(e.fim ?? e.inicio).getTime()

function validarEvento(corpo: Record<string, unknown>, atual: EventoFalso | null, ctx: Contexto): Erro[] | { status: number; code: string } | null {
  const errors: Erro[] = []
  const edicao = atual !== null
  const tem = (c: string) => c in corpo
  const texto = (c: string, min: number, max: number, obrigatorio: boolean) => {
    if (!tem(c)) return obrigatorio && !edicao && errors.push({ campo: c, mensagem: 'campo obrigatório' })
    const v = corpo[c]
    if (v === null) return (obrigatorio && errors.push({ campo: c, mensagem: `${c} não pode ser nulo` })) || undefined
    if (typeof v !== 'string' || v.trim().length < min || v.length > max) errors.push({ campo: c, mensagem: `deve ter entre ${min} e ${max} caracteres` })
  }
  texto('titulo', 3, 150, true)
  texto('descricao', 1, 5000, false)
  texto('local', 1, 120, false)
  if ((!edicao || tem('tipo')) && !TIPOS.includes(corpo.tipo as string)) errors.push({ campo: 'tipo', mensagem: 'tipo inválido' })
  for (const c of ['inicio', 'fim']) {
    if (tem(c) && corpo[c] !== null && !(typeof corpo[c] === 'string' && ISO_COM_FUSO.test(corpo[c] as string))) {
      errors.push({ campo: c, mensagem: 'data e hora com fuso' })
    }
  }
  if (!edicao && !tem('inicio')) errors.push({ campo: 'inicio', mensagem: 'campo obrigatório' })
  const destinos = corpo.destinos as DestinoIn[] | undefined
  if ((!edicao || tem('destinos')) && (!Array.isArray(destinos) || destinos.length < 1 || destinos.length > 20)) {
    errors.push({ campo: 'destinos', mensagem: 'de 1 a 20 destinos' })
  }
  if (errors.length) return errors
  const inicio = new Date((tem('inicio') ? corpo.inicio : atual?.inicio) as string).getTime()
  const fimBruto = tem('fim') ? corpo.fim : atual?.fim
  if (fimBruto && new Date(fimBruto as string).getTime() <= inicio) return [{ campo: 'fim', mensagem: 'deve ser maior que inicio' }]
  for (const [i, d] of (destinos ?? []).entries()) {
    const turma = d.turma_id ? ctx.turmas.find((t) => t.id === d.turma_id) : undefined
    if (d.turma_id && !turma) return { status: 404, code: 'TURMA_NAO_ENCONTRADA' }
    if (!ctx.gestao && (d.tipo !== 'turma' || !ctx.usuario.turmas.includes(d.turma_id!))) return { status: 403, code: 'DESTINO_NAO_PERMITIDO' }
    if (turma && !turma.ativa) return [{ campo: `destinos.${i}.turma_id`, mensagem: 'turma inativa' }]
  }
  return null
}

/** Trata as rotas da agenda e da grade; `false` quando a rota não é dela. */
export async function tratarAgenda(ctx: Contexto): Promise<boolean> {
  const { res, url, metodo, caminho, usuario, gestao, agenda, json, erro } = ctx
  const invalido = (errors: Erro[]) => erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', errors)

  // --- eventos ----------------------------------------------------------------------------
  if (metodo === 'GET' && caminho === '/gestao/eventos') {
    const p = url.searchParams
    const situacao = p.get('situacao')
    const quando = p.get('quando')
    if (situacao && !['ativo', 'arquivado', 'excluido'].includes(situacao)) return (invalido([{ campo: 'situacao', mensagem: 'situação inválida' }]), true)
    if (quando && !['proximos', 'realizados'].includes(quando)) return (invalido([{ campo: 'quando', mensagem: 'valor inválido' }]), true)
    if (situacao === 'excluido' && !gestao) return (erro(res, 403, 'SEM_PERMISSAO'), true)
    const turmaId = p.get('turma_id')
    if (turmaId && !UUID.test(turmaId)) return (invalido([{ campo: 'turma_id', mensagem: 'UUID inválido' }]), true)
    if (turmaId && !ctx.turmas.some((t) => t.id === turmaId)) return (erro(res, 404, 'TURMA_NAO_ENCONTRADA'), true)
    const de = p.get('de') ? new Date(p.get('de')!).getTime() : null
    const ate = p.get('ate') ? new Date(p.get('ate')!).getTime() : null
    if (de !== null && ate !== null && ate < de) return (invalido([{ campo: 'ate', mensagem: 'deve ser maior ou igual a de' }]), true)
    const q = p.get('q')?.trim().toLowerCase()
    const agora = Date.now()
    const itens = agenda.eventos.filter((e) => {
      const ini = new Date(e.inicio).getTime()
      const fim = e.fim ? new Date(e.fim).getTime() : null
      return (
        (gestao || e.autor.id === usuario.id) &&
        (situacao ? e.situacao === situacao : e.situacao !== 'excluido') &&
        (!p.get('tipo') || e.tipo === p.get('tipo')) &&
        (!p.get('autor_id') || e.autor.id === p.get('autor_id')) &&
        (!turmaId || e.destinos.some((d) => d.turma?.id === turmaId)) &&
        // Janela [de, ate) por sobreposição; de == ate é vazia (contracts E3 §1).
        !(de !== null && de === ate) &&
        (ate === null || ini < ate) &&
        (de === null || ini >= de || (fim !== null && fim > de)) &&
        (!q || `${e.titulo} ${e.descricao ?? ''} ${e.local ?? ''}`.toLowerCase().includes(q)) &&
        (quando !== 'proximos' || termino(e) >= agora) &&
        (quando !== 'realizados' || termino(e) < agora)
      )
    })
    itens.sort((x, y) => x.inicio.localeCompare(y.inicio) || x.id.localeCompare(y.id))
    if (quando === 'realizados') itens.reverse()
    return (json(res, 200, ctx.pagina(itens, url)), true)
  }

  const eventoId = caminho.match(/^\/gestao\/eventos\/([^/]+)/)?.[1]
  const sufixo = caminho.match(/^\/gestao\/eventos\/[^/]+\/(arquivar|desarquivar|versoes|historico)$/)?.[1]
  if (metodo === 'POST' && caminho === '/gestao/eventos') {
    const corpo = await ctx.corpoJson(ctx.req)
    if (!corpo) return (invalido([{ campo: 'body', mensagem: 'JSON inválido' }]), true)
    const v = validarEvento(corpo, null, ctx)
    if (Array.isArray(v)) return (invalido(v), true)
    if (v) return (erro(res, v.status, v.code), true)
    return (json(res, 201, agenda.criar(corpo, usuario)), true)
  }
  if (eventoId && (sufixo || /^\/gestao\/eventos\/[^/]+$/.test(caminho))) {
    const e = agenda.eventos.find((x) => x.id === eventoId)
    const auditar = sufixo === 'versoes' || sufixo === 'historico'
    // Excluído: a gestão ainda o lê e audita; o PATCH dá 409 (não editável), como na API.
    const visivel = e && (e.situacao !== 'excluido' || metodo === 'PATCH' || (gestao && metodo === 'GET'))
    if (!e || !visivel) return (erro(res, 404, 'EVENTO_NAO_ENCONTRADO'), true)
    if (!gestao && e.autor.id !== usuario.id) return (erro(res, 403, 'SEM_PERMISSAO'), true)
    if (metodo === 'GET' && !sufixo) return (json(res, 200, e), true)
    if (metodo === 'GET' && auditar) {
      const reg = agenda.auditoria.get(e.id)!
      return (json(res, 200, ctx.pagina(sufixo === 'versoes' ? reg.versoes : reg.eventos, url)), true)
    }
    const doDocenteAinda = () => e.destinos.every((d) => d.tipo === 'turma' && usuario.turmas.includes(d.turma!.id))
    if (metodo === 'POST' && (sufixo === 'arquivar' || sufixo === 'desarquivar')) {
      const [de, para] = sufixo === 'arquivar' ? ['ativo', 'arquivado'] : ['arquivado', 'ativo']
      if (e.situacao !== de) return (erro(res, 409, 'EVENTO_SITUACAO_INVALIDA'), true)
      if (para === 'ativo' && !gestao && !doDocenteAinda()) return (erro(res, 403, 'DESTINO_NAO_PERMITIDO'), true)
      e.situacao = para
      e.arquivado_em = para === 'arquivado' ? new Date().toISOString() : null
      agenda.registrar(e, usuario, sufixo === 'arquivar' ? 'arquivado' : 'desarquivado', null)
      return (json(res, 200, e), true)
    }
    if (metodo === 'DELETE' && !sufixo) {
      e.situacao = 'excluido'
      agenda.registrar(e, usuario, 'excluido', null)
      return (json(res, 204), true)
    }
    if (metodo === 'PATCH' && !sufixo) {
      const corpo = await ctx.corpoJson(ctx.req)
      if (!corpo || Object.keys(corpo).length === 0) return (invalido([{ campo: 'body', mensagem: 'informe ao menos um campo' }]), true)
      if (e.situacao !== 'ativo') return (erro(res, 409, 'EVENTO_NAO_EDITAVEL'), true)
      if (!('destinos' in corpo) && !gestao && !doDocenteAinda()) return (erro(res, 403, 'DESTINO_NAO_PERMITIDO'), true)
      const v = validarEvento(corpo, e, ctx)
      if (Array.isArray(v)) return (invalido(v), true)
      if (v) return (erro(res, v.status, v.code), true)
      const alteracoes: Record<string, { de: unknown; para: unknown }> = {}
      for (const campo of ['titulo', 'descricao', 'tipo', 'inicio', 'fim', 'local'] as const) {
        if (!(campo in corpo)) continue
        let novo = corpo[campo] as string | null
        if ((campo === 'inicio' || campo === 'fim') && novo) novo = new Date(novo).toISOString()
        if (novo !== e[campo]) alteracoes[campo] = { de: e[campo], para: novo }
      }
      const antes = agenda.canonicos(e)
      const destinosAntes = e.destinos
      if (corpo.destinos) e.destinos = (corpo.destinos as DestinoIn[]).map(agenda.destinoSaida)
      const depois = agenda.canonicos(e)
      if (JSON.stringify(antes) !== JSON.stringify(depois)) alteracoes.destinos = { de: antes, para: depois }
      if (Object.keys(alteracoes).length === 0) {
        e.destinos = destinosAntes
        return (invalido([{ campo: 'body', mensagem: 'nenhuma alteração' }]), true)
      }
      for (const [campo, { para }] of Object.entries(alteracoes)) {
        if (campo !== 'destinos') (e as unknown as Record<string, unknown>)[campo] = para
      }
      e.versao_atual += 1
      e.editado_em = new Date().toISOString()
      agenda.registrar(e, usuario, 'editado', e.versao_atual, alteracoes)
      return (json(res, 200, e), true)
    }
  }

  // --- grade de horários (só administração e coordenação) ------------------------------------
  const grade = caminho.match(/^\/gestao\/turmas\/([^/]+)\/horarios(?:\/([^/]+))?$/)
  if (grade) {
    if (!gestao) return (erro(res, 403, 'SEM_PERMISSAO'), true)
    const [, turmaId, aulaId] = grade
    const turma = ctx.turmas.find((t) => t.id === turmaId)
    if (!turma) return (erro(res, 404, 'TURMA_NAO_ENCONTRADA'), true)
    const saida = (x: AulaFalsa) => {
      const docente = ctx.usuarios.find((u) => u.id === x.docente_id)
      return {
        id: x.id,
        turma_id: x.turma_id,
        dia_semana: x.dia_semana,
        inicio: x.inicio,
        fim: x.fim,
        disciplina: x.disciplina,
        local: x.local,
        docente: docente ? { id: docente.id, nome: docente.nome } : null,
      }
    }
    if (metodo === 'GET' && !aulaId) {
      const itens = agenda.aulas
        .filter((x) => x.turma_id === turmaId)
        .sort((x, y) => x.dia_semana - y.dia_semana || x.inicio.localeCompare(y.inicio))
        .map(saida)
      return (json(res, 200, ctx.pagina(itens, url)), true)
    }
    const aula = aulaId ? agenda.aulas.find((x) => x.id === aulaId && x.turma_id === turmaId) : undefined
    if (aulaId && !aula) return (erro(res, 404, 'HORARIO_NAO_ENCONTRADO'), true)
    if (metodo === 'DELETE' && aula) {
      agenda.aulas.splice(agenda.aulas.indexOf(aula), 1)
      return (json(res, 204), true)
    }
    if ((metodo === 'POST' && !aulaId) || (metodo === 'PATCH' && aula)) {
      const corpo = await ctx.corpoJson(ctx.req)
      if (!corpo || (aula && Object.keys(corpo).length === 0)) return (invalido([{ campo: 'body', mensagem: 'informe ao menos um campo' }]), true)
      const errors: Erro[] = []
      const novo = { ...(aula ?? { local: null, docente_id: null }), ...corpo } as AulaFalsa
      if (!Number.isInteger(novo.dia_semana) || novo.dia_semana < 1 || novo.dia_semana > 7) errors.push({ campo: 'dia_semana', mensagem: 'de 1 a 7' })
      for (const c of ['inicio', 'fim'] as const) if (!HORA.test(String(novo[c]))) errors.push({ campo: c, mensagem: 'deve estar no formato HH:MM' })
      const disciplina = String(novo.disciplina ?? '').trim()
      if (disciplina.length < 2 || disciplina.length > 120) errors.push({ campo: 'disciplina', mensagem: 'deve ter entre 2 e 120 caracteres' })
      if (novo.local !== null && (typeof novo.local !== 'string' || !novo.local.trim() || novo.local.length > 80)) errors.push({ campo: 'local', mensagem: 'deve ter entre 1 e 80 caracteres' })
      if (errors.length) return (invalido(errors), true)
      if (novo.fim <= novo.inicio) return (invalido([{ campo: aula && 'inicio' in corpo && !('fim' in corpo) ? 'inicio' : 'fim', mensagem: 'fim deve ser depois do início' }]), true)
      if (novo.docente_id && novo.docente_id !== aula?.docente_id) {
        const docente = ctx.usuarios.find((u) => u.id === novo.docente_id)
        if (!docente) return (erro(res, 404, 'USUARIO_NAO_ENCONTRADO'), true)
        if (docente.perfil !== 'docente') return (erro(res, 409, 'PERFIL_INCOMPATIVEL', 'O docente informado não tem perfil docente'), true)
      }
      novo.disciplina = disciplina
      novo.local = novo.local?.trim() ?? null
      if (aula && JSON.stringify(saida(novo)) === JSON.stringify(saida(aula))) return (invalido([{ campo: 'body', mensagem: 'nenhuma alteração' }]), true)
      const gravada: AulaFalsa = aula ? Object.assign(aula, novo) : { ...novo, id: randomUUID(), turma_id: turmaId }
      if (!aula) agenda.aulas.push(gravada)
      // Conflitos: turmas ativas do mesmo período, mesmo dia, sobreposição estrita (contracts E3 §10).
      const normal = (s: string | null) => (s ? s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().split(/\s+/).filter(Boolean).join(' ') : '')
      const conflitos = !turma.ativa
        ? []
        : agenda.aulas
            .filter((x) => x.id !== gravada.id && x.dia_semana === gravada.dia_semana && x.inicio < gravada.fim && gravada.inicio < x.fim)
            .filter((x) => {
              const t = ctx.turmas.find((tt) => tt.id === x.turma_id)!
              return t.ativa && t.periodo_letivo === turma.periodo_letivo
            })
            .flatMap((x) => {
              const t = ctx.turmas.find((tt) => tt.id === x.turma_id)!
              const base = { local: x.local, horario_id: x.id, turma: { id: t.id, codigo: t.codigo, nome: t.nome }, inicio: x.inicio, fim: x.fim }
              return [
                ...(normal(x.local) && normal(x.local) === normal(gravada.local) ? [{ tipo: 'sala', ...base }] : []),
                ...(gravada.docente_id && gravada.docente_id === x.docente_id ? [{ tipo: 'docente', ...base }] : []),
              ]
            })
      return (json(res, aula ? 200 : 201, { horario: saida(gravada), conflitos }), true)
    }
  }
  return false
}
