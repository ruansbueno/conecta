// API falsa para o Playwright (D13): implementa o contrato da API de verdade — cookie de sessão
// httpOnly, cookie CSRF legível e exigência de X-CSRF-Token nas escritas por cookie — e sabe
// forçar 401, 403, 409, 422 e lentidão pelos endpoints /__controle/*.
// Roda direto no Node 24 (TypeScript sem etapa de build): node e2e/servidor-falso/servidor.ts
import { randomUUID } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { estadoInicial, type Estado } from './dados.ts'

const PORTA = Number(process.env.PORTA ?? 8787)
let estado: Estado = estadoInicial()

type Falha = { metodo: string; caminho: string; status: number; code: string; vezes: number }
let falhas: Falha[] = []
let lentidaoMs = 0

const json = (res: ServerResponse, status: number, corpo?: unknown, cabecalhos: Record<string, string | string[]> = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...cabecalhos })
  res.end(corpo === undefined ? undefined : JSON.stringify(corpo))
}
const erro = (res: ServerResponse, status: number, code: string, detail = code, errors?: object[]) =>
  json(res, status, { detail, code, ...(errors ? { errors } : {}) })

const cookies = (req: IncomingMessage) =>
  Object.fromEntries(
    (req.headers.cookie ?? '').split(/;\s*/).filter(Boolean).map((c) => {
      const i = c.indexOf('=')
      return [c.slice(0, i), c.slice(i + 1)]
    }),
  )

async function corpoJson(req: IncomingMessage): Promise<Record<string, unknown> | null> {
  let bruto = ''
  for await (const parte of req) bruto += parte
  if (!bruto) return {}
  try {
    return JSON.parse(bruto)
  } catch {
    return null
  }
}

function usuarioDaSessao(req: IncomingMessage) {
  const auth = req.headers.authorization?.replace(/^Bearer /, '')
  const token = auth ?? cookies(req).conecta_sessao
  return token ? estado.sessoes.get(token) : undefined
}

const pagina = <T>(itens: T[], url: URL) => {
  const limit = Number(url.searchParams.get('limit') ?? 20)
  const offset = Number(url.searchParams.get('offset') ?? 0)
  return { items: itens.slice(offset, offset + limit), total: itens.length, limit, offset }
}

async function tratar(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const metodo = req.method ?? 'GET'
  const caminho = url.pathname

  // --- controle dos testes ---------------------------------------------------------------
  if (caminho === '/__controle/reiniciar') {
    estado = estadoInicial()
    falhas = []
    lentidaoMs = 0
    return json(res, 204)
  }
  if (caminho === '/__controle/falhar') {
    const f = (await corpoJson(req)) as Falha
    falhas.push({ ...f, vezes: f.vezes ?? 1 })
    return json(res, 204)
  }
  if (caminho === '/__controle/lentidao') {
    lentidaoMs = Number(((await corpoJson(req)) as { ms: number }).ms)
    return json(res, 204)
  }
  if (caminho === '/__controle/vinculo') {
    const { username, turmaId, remover } = (await corpoJson(req)) as { username: string; turmaId: string; remover?: boolean }
    const u = estado.usuarios.find((x) => x.username === username)!
    u.turmas = remover ? u.turmas.filter((t) => t !== turmaId) : [...u.turmas, turmaId]
    return json(res, 204)
  }
  if (caminho === '/__controle/estado') return json(res, 200, { avisos: estado.avisos })

  if (lentidaoMs) await new Promise((r) => setTimeout(r, lentidaoMs))
  const falha = falhas.find((f) => f.metodo === metodo && f.caminho === caminho && f.vezes > 0)
  if (falha) {
    falha.vezes--
    return erro(res, falha.status, falha.code)
  }

  // --- sessão -----------------------------------------------------------------------------
  if (metodo === 'POST' && caminho === '/auth/login') {
    const corpo = await corpoJson(req)
    const { username, password } = (corpo ?? {}) as { username?: string; password?: string }
    if (!username || !password) {
      return erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', [
        ...(!username ? [{ campo: 'username', mensagem: 'campo obrigatório' }] : []),
        ...(!password ? [{ campo: 'password', mensagem: 'campo obrigatório' }] : []),
      ])
    }
    const u = estado.usuarios.find((x) => x.username === username)
    if (!u || password !== 'senha-teste') return erro(res, 401, 'CREDENCIAIS_INVALIDAS')
    if (!u.ativo) return erro(res, 403, 'USUARIO_INATIVO')
    const token = `tok-${randomUUID()}`
    estado.sessoes.set(token, u.id)
    const atributos = 'Secure; SameSite=Strict; Path=/; Max-Age=86400'
    return json(
      res,
      200,
      { access_token: token, token_type: 'bearer', expires_in: 86400, usuario: estado.publico(u) },
      { 'Set-Cookie': [`conecta_sessao=${token}; HttpOnly; ${atributos}`, `conecta_csrf=csrf-${randomUUID()}; ${atributos}`] },
    )
  }

  const usuarioId = usuarioDaSessao(req)
  const usuario = estado.usuarios.find((u) => u.id === usuarioId)
  if (!usuario) return erro(res, 401, 'NAO_AUTENTICADO')
  if (!usuario.ativo) return erro(res, 403, 'USUARIO_INATIVO')
  const porCookie = !req.headers.authorization
  if (porCookie && ['POST', 'PATCH', 'DELETE'].includes(metodo)) {
    const c = cookies(req).conecta_csrf
    if (!c || req.headers['x-csrf-token'] !== c) return erro(res, 403, 'CSRF_INVALIDO')
  }

  if (metodo === 'DELETE' && caminho === '/auth/sessao') {
    const expira = 'Secure; SameSite=Strict; Path=/; Max-Age=0'
    return json(res, 204, undefined, { 'Set-Cookie': [`conecta_sessao=; HttpOnly; ${expira}`, `conecta_csrf=; ${expira}`] })
  }
  if (metodo === 'GET' && caminho === '/me') return json(res, 200, estado.me(usuario))

  if (!caminho.startsWith('/gestao/')) return erro(res, 404, 'NAO_ENCONTRADO')
  if (usuario.perfil === 'aluno') return erro(res, 403, 'SEM_PERMISSAO')
  const gestao = usuario.perfil === 'administrador' || usuario.perfil === 'coordenacao'

  // --- turmas -----------------------------------------------------------------------------
  if (metodo === 'GET' && caminho === '/gestao/turmas') {
    let turmas = estado.turmas
    if (!gestao) turmas = turmas.filter((t) => usuario.turmas.includes(t.id))
    const ativa = url.searchParams.get('ativa')
    if (ativa) turmas = turmas.filter((t) => String(t.ativa) === ativa)
    const semestre = url.searchParams.get('semestre_curso')
    if (semestre) turmas = turmas.filter((t) => String(t.semestre_curso) === semestre)
    const periodo = url.searchParams.get('periodo_letivo')
    if (periodo) turmas = turmas.filter((t) => t.periodo_letivo === periodo)
    const q = url.searchParams.get('q')?.toLowerCase()
    if (q) turmas = turmas.filter((t) => `${t.codigo} ${t.nome}`.toLowerCase().includes(q))
    return json(res, 200, pagina(turmas.map(estado.turmaSaida), url))
  }

  /** Mesmas regras do contrato §11 (POST inteiro; PATCH só o que veio). */
  const validarTurma = (corpo: Record<string, unknown>, parcial: boolean) => {
    const errors: { campo: string; mensagem: string }[] = []
    const tem = (c: string) => !parcial || c in corpo
    const codigo = corpo.codigo as string | undefined
    if (tem('codigo') && (!codigo || codigo.length > 40)) errors.push({ campo: 'codigo', mensagem: 'de 1 a 40 caracteres' })
    const nome = corpo.nome as string | undefined
    if (tem('nome') && (!nome || nome.length < 3 || nome.length > 120)) errors.push({ campo: 'nome', mensagem: 'de 3 a 120 caracteres' })
    const s = corpo.semestre_curso as number | undefined
    if (tem('semestre_curso') && !(Number.isInteger(s) && s! >= 1 && s! <= 12)) errors.push({ campo: 'semestre_curso', mensagem: 'de 1 a 12' })
    const p = corpo.periodo_letivo as string | undefined
    if (tem('periodo_letivo') && !/^\d{4}\/[12]$/.test(p ?? '')) errors.push({ campo: 'periodo_letivo', mensagem: 'formato AAAA/N' })
    return errors
  }

  const turmaId = caminho.match(/^\/gestao\/turmas\/([^/]+)/)?.[1]
  const turmaAlvo = turmaId ? estado.turmas.find((t) => t.id === turmaId) : undefined
  if (turmaId && !turmaAlvo) return erro(res, 404, 'TURMA_NAO_ENCONTRADA')
  const escrita = metodo !== 'GET'
  if ((caminho === '/gestao/turmas' || turmaAlvo) && escrita && !gestao) return erro(res, 403, 'SEM_PERMISSAO')

  if (metodo === 'POST' && caminho === '/gestao/turmas') {
    const corpo = (await corpoJson(req)) ?? {}
    const errors = validarTurma(corpo, false)
    if (errors.length) return erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', errors)
    if (estado.turmas.some((t) => t.codigo === corpo.codigo)) return erro(res, 409, 'CODIGO_TURMA_DUPLICADO')
    const agora = new Date().toISOString()
    const nova = {
      id: randomUUID(),
      codigo: corpo.codigo as string,
      nome: corpo.nome as string,
      semestre_curso: corpo.semestre_curso as number,
      periodo_letivo: corpo.periodo_letivo as string,
      inscricoes_abertas: Boolean(corpo.inscricoes_abertas),
      ativa: true,
      criado_em: agora,
      atualizado_em: agora,
    }
    estado.turmas.push(nova)
    return json(res, 201, estado.turmaSaida(nova))
  }

  if (turmaAlvo && caminho === `/gestao/turmas/${turmaAlvo.id}`) {
    if (!gestao && !usuario.turmas.includes(turmaAlvo.id)) return erro(res, 403, 'SEM_PERMISSAO')
    if (metodo === 'GET') return json(res, 200, estado.turmaSaida(turmaAlvo))
    if (metodo === 'DELETE') {
      turmaAlvo.ativa = false
      return json(res, 204)
    }
    if (metodo === 'PATCH') {
      const corpo = (await corpoJson(req)) ?? {}
      const errors = validarTurma(corpo, true)
      if (errors.length) return erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', errors)
      if ('codigo' in corpo && estado.turmas.some((t) => t.codigo === corpo.codigo && t.id !== turmaAlvo.id)) {
        return erro(res, 409, 'CODIGO_TURMA_DUPLICADO')
      }
      Object.assign(turmaAlvo, corpo, { atualizado_em: new Date().toISOString() })
      return json(res, 200, estado.turmaSaida(turmaAlvo))
    }
  }

  // --- vínculos ---------------------------------------------------------------------------
  if (turmaAlvo && caminho.startsWith(`/gestao/turmas/${turmaAlvo.id}/vinculos`)) {
    if (!gestao && !usuario.turmas.includes(turmaAlvo.id)) return erro(res, 403, 'SEM_PERMISSAO')
    const alvoId = caminho.split('/vinculos/')[1]
    if (metodo === 'GET' && !alvoId) return json(res, 200, pagina(estado.vinculosDa(turmaAlvo.id, url.searchParams.get('papel')), url))
    if (metodo === 'POST' && !alvoId) {
      const { usuario_id, papel } = ((await corpoJson(req)) ?? {}) as { usuario_id?: string; papel?: string }
      if (papel !== 'docente' && papel !== 'aluno') {
        return erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', [{ campo: 'papel', mensagem: 'docente ou aluno' }])
      }
      const pessoa = estado.usuarios.find((u) => u.id === usuario_id)
      if (!pessoa) return erro(res, 404, 'USUARIO_NAO_ENCONTRADO')
      if (pessoa.perfil !== papel) return erro(res, 409, 'PERFIL_INCOMPATIVEL')
      if (pessoa.turmas.includes(turmaAlvo.id)) return erro(res, 409, 'JA_VINCULADO')
      estado.vincular(turmaAlvo.id, pessoa)
      return json(res, 201, estado.vinculosDa(turmaAlvo.id).find((v) => v.usuario.id === pessoa.id))
    }
    if (metodo === 'DELETE' && alvoId) {
      const pessoa = estado.usuarios.find((u) => u.id === alvoId && u.turmas.includes(turmaAlvo.id))
      if (!pessoa) return erro(res, 404, 'VINCULO_NAO_ENCONTRADO')
      pessoa.turmas = pessoa.turmas.filter((t) => t !== turmaAlvo.id)
      return json(res, 204)
    }
  }

  // --- avisos -----------------------------------------------------------------------------
  const avisoId = caminho.match(/^\/gestao\/avisos\/([^/]+)$/)?.[1]
  if ((metodo === 'POST' && caminho === '/gestao/avisos') || (metodo === 'PATCH' && avisoId)) {
    const corpo = await corpoJson(req)
    if (!corpo) return erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', [{ campo: 'body', mensagem: 'JSON inválido' }])
    const existente = avisoId ? estado.avisos.find((a) => a.id === avisoId) : undefined
    if (avisoId && !existente) return erro(res, 404, 'AVISO_NAO_ENCONTRADO')
    if (existente && !gestao && existente.autor.id !== usuario.id) return erro(res, 403, 'SEM_PERMISSAO')
    if (existente && existente.situacao !== 'ativo') return erro(res, 409, 'AVISO_NAO_EDITAVEL')
    const resultado = estado.validarAviso(corpo, usuario, gestao, !!existente)
    if (!('ok' in resultado)) {
      return erro(res, resultado.status, resultado.erro, resultado.erro, resultado.errors)
    }
    if (!existente) return json(res, 201, estado.criarAviso(corpo, usuario))
    const editado = estado.editarAviso(existente, corpo, usuario)
    if (!editado) return erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', [{ campo: 'body', mensagem: 'nenhuma alteração' }])
    return json(res, 200, editado)
  }
  if (metodo === 'GET' && avisoId) {
    const aviso = estado.avisos.find((a) => a.id === avisoId)
    if (!aviso || (aviso.situacao === 'excluido' && !gestao)) return erro(res, 404, 'AVISO_NAO_ENCONTRADO')
    if (!gestao && aviso.autor.id !== usuario.id) return erro(res, 403, 'SEM_PERMISSAO')
    return json(res, 200, aviso)
  }
  if (metodo === 'GET' && caminho === '/gestao/avisos') {
    const situacao = url.searchParams.get('situacao')
    if (situacao === 'excluido' && !gestao) return erro(res, 403, 'SEM_PERMISSAO')
    const agora = new Date()
    const agendado = (a: (typeof estado.avisos)[number]) =>
      a.situacao === 'ativo' && typeof a.publicar_em === 'string' && new Date(a.publicar_em) > agora
    const q = url.searchParams.get('q')?.toLowerCase()
    const autorId = url.searchParams.get('autor_id')
    const turmaId = url.searchParams.get('turma_id')
    const itens = estado.avisos.filter(
      (a) =>
        (gestao || a.autor.id === usuario.id) &&
        (situacao === 'agendado'
          ? agendado(a)
          : situacao === 'ativo'
            ? a.situacao === 'ativo' && !agendado(a)
            : situacao
              ? a.situacao === situacao
              : a.situacao !== 'excluido') &&
        (!q || `${a.titulo} ${a.conteudo}`.toLowerCase().includes(q)) &&
        (!autorId || a.autor.id === autorId) &&
        (!turmaId || (a.destinos as { turma: { id: string } | null }[]).some((d) => d.turma?.id === turmaId)),
    )
    return json(res, 200, pagina(itens, url))
  }

  const acao = caminho.match(/^\/gestao\/avisos\/([^/]+)\/(arquivar|desarquivar|versoes|historico)$/)
  if (acao) {
    const [, id, nome] = acao
    const aviso = estado.avisos.find((a) => a.id === id)
    if (!aviso || (aviso.situacao === 'excluido' && !gestao)) return erro(res, 404, 'AVISO_NAO_ENCONTRADO')
    if (!gestao && aviso.autor.id !== usuario.id) return erro(res, 403, 'SEM_PERMISSAO')
    if (metodo === 'GET' && (nome === 'versoes' || nome === 'historico')) {
      const a = estado.auditoria.get(id) ?? { versoes: [], eventos: [] }
      return json(res, 200, pagina(nome === 'versoes' ? a.versoes : a.eventos, url))
    }
    if (metodo === 'POST' && nome === 'arquivar') {
      if (aviso.situacao !== 'ativo') return erro(res, 409, 'AVISO_SITUACAO_INVALIDA')
      return json(res, 200, estado.mudarSituacao(aviso, usuario, 'arquivado', 'arquivado'))
    }
    if (metodo === 'POST' && nome === 'desarquivar') {
      if (aviso.situacao !== 'arquivado') return erro(res, 409, 'AVISO_SITUACAO_INVALIDA')
      return json(res, 200, estado.mudarSituacao(aviso, usuario, 'ativo', 'desarquivado'))
    }
  }
  if (metodo === 'DELETE' && avisoId) {
    const aviso = estado.avisos.find((a) => a.id === avisoId)
    if (!aviso || aviso.situacao === 'excluido') return erro(res, 404, 'AVISO_NAO_ENCONTRADO')
    if (!gestao && aviso.autor.id !== usuario.id) return erro(res, 403, 'SEM_PERMISSAO')
    estado.mudarSituacao(aviso, usuario, 'excluido', 'excluido')
    return json(res, 204)
  }

  // --- solicitações ----------------------------------------------------------------------
  if (metodo === 'GET' && caminho === '/gestao/solicitacoes') {
    const status = url.searchParams.get('status') ?? 'pendente'
    const turmaId = url.searchParams.get('turma_id')
    const itens = estado.solicitacoes
      .filter((s) => s.status === status && (!turmaId || s.turmaId === turmaId))
      .filter((s) => gestao || usuario.turmas.includes(s.turmaId))
      .sort((x, y) => x.solicitada_em.localeCompare(y.solicitada_em))
      .map(estado.solicitacaoSaida)
    return json(res, 200, pagina(itens, url))
  }
  const decisao = caminho.match(/^\/gestao\/solicitacoes\/([^/]+)\/(aprovar|recusar)$/)
  if (metodo === 'POST' && decisao) {
    const [, id, acao] = decisao
    const s = estado.solicitacoes.find((x) => x.id === id)
    if (!s) return erro(res, 404, 'SOLICITACAO_NAO_ENCONTRADA')
    if (!gestao && !usuario.turmas.includes(s.turmaId)) return erro(res, 403, 'SEM_PERMISSAO')
    if (s.status !== 'pendente') return erro(res, 409, 'SOLICITACAO_NAO_PENDENTE')
    const corpo = ((await corpoJson(req)) ?? {}) as { motivo?: string }
    if (acao === 'recusar' && corpo.motivo && corpo.motivo.length > 300) {
      return erro(res, 422, 'VALIDATION_ERROR', 'Dados inválidos', [{ campo: 'motivo', mensagem: 'até 300 caracteres' }])
    }
    const aluno = estado.usuarios.find((u) => u.id === s.alunoId)!
    Object.assign(s, { decidida_em: new Date().toISOString(), decidida_por: { id: usuario.id, nome: usuario.nome } })
    if (acao === 'aprovar' && aluno.turmas.includes(s.turmaId)) {
      // Vínculo criado por outra via entre o pedido e a decisão: a API recusa e marca a solicitação.
      s.status = 'recusada'
      return erro(res, 409, 'JA_VINCULADO')
    }
    if (acao === 'aprovar') {
      s.status = 'aprovada'
      estado.vincular(s.turmaId, aluno, 'solicitacao')
    } else {
      s.status = 'recusada'
      s.motivo_recusa = corpo.motivo?.trim() || null
    }
    return json(res, 200, estado.solicitacaoSaida(s))
  }

  // --- usuários (só para o filtro de autor nesta etapa) -----------------------------------
  if (metodo === 'GET' && caminho === '/gestao/usuarios') {
    if (!gestao) return erro(res, 403, 'SEM_PERMISSAO')
    const perfil = url.searchParams.get('perfil')
    const ativo = url.searchParams.get('ativo')
    const q = url.searchParams.get('q')?.toLowerCase()
    const itens = estado.usuarios
      .filter((u) => !perfil || u.perfil === perfil)
      .filter((u) => !ativo || String(u.ativo) === ativo)
      .filter((u) => !q || `${u.nome} ${u.username}`.toLowerCase().includes(q))
      .map((u) => ({ ...estado.publico(u), ativo: u.ativo, ultimo_login_em: null }))
    return json(res, 200, pagina(itens, url))
  }

  return erro(res, 404, 'NAO_ENCONTRADO')
}

createServer((req, res) => {
  tratar(req, res).catch((e) => {
    console.error(e)
    erro(res, 500, 'ERRO_INTERNO')
  })
}).listen(PORTA, () => console.log(`servidor falso na porta ${PORTA}`))
