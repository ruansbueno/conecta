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
    const q = url.searchParams.get('q')?.toLowerCase()
    if (q) turmas = turmas.filter((t) => `${t.codigo} ${t.nome}`.toLowerCase().includes(q))
    return json(res, 200, pagina(turmas, url))
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
    const aviso = existente ? estado.editarAviso(existente, corpo) : estado.criarAviso(corpo, usuario)
    return json(res, existente ? 200 : 201, aviso)
  }
  if (metodo === 'GET' && avisoId) {
    const aviso = estado.avisos.find((a) => a.id === avisoId)
    if (!aviso) return erro(res, 404, 'AVISO_NAO_ENCONTRADO')
    if (!gestao && aviso.autor.id !== usuario.id) return erro(res, 403, 'SEM_PERMISSAO')
    return json(res, 200, aviso)
  }
  if (metodo === 'GET' && caminho === '/gestao/avisos') {
    const meus = gestao ? estado.avisos : estado.avisos.filter((a) => a.autor.id === usuario.id)
    return json(res, 200, pagina(meus, url))
  }

  return erro(res, 404, 'NAO_ENCONTRADO')
}

createServer((req, res) => {
  tratar(req, res).catch((e) => {
    console.error(e)
    erro(res, 500, 'ERRO_INTERNO')
  })
}).listen(PORTA, () => console.log(`servidor falso na porta ${PORTA}`))
