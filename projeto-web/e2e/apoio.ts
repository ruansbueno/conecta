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
  await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
}
