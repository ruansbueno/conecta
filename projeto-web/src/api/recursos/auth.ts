import { requisitar } from '../cliente'
import { loginSchema, usuarioSessaoSchema } from '../schemas'

/** POST /auth/login: a API grava o cookie de sessão httpOnly; o corpo traz só o usuário. */
export async function login(username: string, password: string) {
  const r = await requisitar('POST', '/auth/login', {
    corpo: { username, password },
    esquema: loginSchema,
    semSessao: true,
  })
  return r.usuario
}

export const me = () => requisitar('GET', '/me', { esquema: usuarioSessaoSchema })

/** DELETE /auth/sessao: a API apaga os cookies; o JavaScript nunca toca o de sessão. */
export const encerrarSessaoNaApi = () => requisitar('DELETE', '/auth/sessao')
