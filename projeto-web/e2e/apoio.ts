import { expect, type Page } from '@playwright/test'

const API = 'http://localhost:8787'

/** Estado limpo do servidor falso antes de cada teste. */
export async function reiniciarApi() {
  await fetch(`${API}/__controle/reiniciar`, { method: 'POST' })
}

/** Próxima chamada `metodo caminho` à API falha com o status e o code dados. */
export async function falharProxima(metodo: string, caminho: string, status: number, code: string, vezes = 1) {
  await fetch(`${API}/__controle/falhar`, {
    method: 'POST',
    body: JSON.stringify({ metodo, caminho, status, code, vezes }),
  })
}

export async function alterarVinculo(username: string, turmaId: string, remover = false) {
  await fetch(`${API}/__controle/vinculo`, { method: 'POST', body: JSON.stringify({ username, turmaId, remover }) })
}

export async function avisosNaApi(): Promise<Record<string, unknown>[]> {
  const estado = (await (await fetch(`${API}/__controle/estado`)).json()) as { avisos: Record<string, unknown>[] }
  return estado.avisos
}

export async function entrar(page: Page, usuario: string, destino = '/login') {
  await page.goto(destino)
  await page.getByLabel('Usuário').fill(usuario)
  await page.getByLabel('Senha').fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()
}

export async function estaNaGestao(page: Page) {
  // Abaixo de 1024 px a navegação fica na gaveta, aberta pelo botão "Abrir menu" (spec 003).
  await expect(
    page.getByRole('navigation', { name: 'Navegação principal' }).or(page.getByRole('button', { name: 'Abrir menu' })),
  ).toBeVisible()
}

/** O que o aplicativo mostra a uma pessoa: entra pela API (Bearer, como o app) e lê GET /avisos. */
export async function avisosNoAplicativo(username: string): Promise<string[]> {
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'senha-teste' }),
  })
  const { access_token } = (await login.json()) as { access_token: string }
  const r = await fetch(`${API}/avisos`, { headers: { Authorization: `Bearer ${access_token}` } })
  return ((await r.json()) as { items: { titulo: string }[] }).items.map((a) => a.titulo)
}
