import { expect, test } from '@playwright/test'

import { entrar, estaNaGestao, falharProxima, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

test('coordenação e administração chegam ao painel com Usuários na navegação', async ({ page }) => {
  for (const usuario of ['coord.teste', 'admin.teste']) {
    await page.context().clearCookies()
    await entrar(page, usuario)
    await expect(page).toHaveURL(/\/painel$/)
    await estaNaGestao(page)
    await expect(page.getByRole('link', { name: 'Usuários' })).toBeVisible()
  }
})

test('docente chega ao painel com a navegação restrita', async ({ page }) => {
  await entrar(page, 'docente.teste')

  await expect(page).toHaveURL(/\/painel$/)
  await expect(page.getByRole('link', { name: 'Meus avisos' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
})

test('aluno vê a orientação do aplicativo e a sessão é encerrada', async ({ page }) => {
  await entrar(page, 'aluno.teste')

  await expect(page.getByRole('heading', { name: /gestão é para administração/ })).toBeVisible()
  const cookies = await page.context().cookies()
  expect(cookies.find((c) => c.name === 'conecta_sessao')?.value ?? '').toBe('')
  await page.goto('/painel')
  await expect(page).toHaveURL(/\/login$/)
})

test('credencial inválida e usuário desativado ficam no login', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Usuário').fill('coord.teste')
  await page.getByLabel('Senha').fill('errada')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toHaveText('Usuário ou senha incorretos.')

  await page.getByLabel('Usuário').fill('inativo.teste')
  await page.getByLabel('Senha').fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByRole('alert')).toContainText('acesso está desativado')
})

test('rota protegida sem sessão leva ao login e depois à página pedida', async ({ page }) => {
  await page.goto('/solicitacoes?status=pendente')
  await expect(page).toHaveURL(/\/login$/)

  await page.getByLabel('Usuário').fill('coord.teste')
  await page.getByLabel('Senha').fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page).toHaveURL(/\/solicitacoes\?status=pendente$/)
})

test('sessão continua ao recarregar a página (cookie de 24 h)', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  await page.reload()

  await estaNaGestao(page)
})

test('401 no meio da navegação volta ao login com sessão expirada', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  await falharProxima('GET', '/me', 401, 'NAO_AUTENTICADO')
  // Voltar o foco para a aba recarrega o usuário (RW-10); a API responde 401.
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))

  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('alert')).toHaveText('Sua sessão expirou. Entre de novo.')
})

test('sair encerra a sessão na API e volta ao login', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  await page.getByRole('button', { name: 'Sair' }).click()

  await expect(page).toHaveURL(/\/login$/)
  await page.goto('/painel')
  await expect(page).toHaveURL(/\/login$/)
})
