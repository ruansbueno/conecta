// T076 (RW-45, D3): o build estático servido pelo nginx, com a API real no mesmo domínio sob /api.
import { expect, test } from '@playwright/test'

test('rota desconhecida cai no index.html e a aplicação decide (vai ao login)', async ({ page, request }) => {
  const r = await request.get('/avisos/qualquer/coisa')
  expect(r.status()).toBe(200)
  expect(r.headers()['content-type']).toContain('text/html')
  expect(r.headers()['cache-control']).toBe('no-cache')

  await page.goto('/turmas/nao-existe/de-jeito-nenhum')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Acesso à gestão' })).toBeVisible()
})

test('HTTP vai para HTTPS', async ({ request }) => {
  const r = await request.get(process.env.URL_HTTP ?? 'http://localhost:8080/painel', { maxRedirects: 0 })
  expect(r.status()).toBe(301)
  expect(r.headers()['location']).toMatch(/^https:\/\//)
})

test('login pela API em /api: cookie de sessão Secure e httpOnly; recarregar uma rota funda mantém a sessão', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByLabel('Usuário').fill('coord.teste')
  await page.getByLabel('Senha').fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel$/)

  const sessao = (await context.cookies()).find((c) => c.name === 'conecta_sessao')
  expect(sessao).toMatchObject({ secure: true, httpOnly: true, sameSite: 'Strict' })
  expect(await page.evaluate(() => document.cookie)).not.toContain('conecta_sessao')

  await page.goto('/avisos?situacao=ativo')
  await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible()
})

test('arquivos com hash têm cache longo; a página tem os cabeçalhos de segurança', async ({ page, request }) => {
  const r = await page.goto('/login')
  expect(r?.headers()['strict-transport-security']).toContain('max-age=')
  expect(r?.headers()['content-security-policy']).toContain("frame-ancestors 'none'")
  const script = await page.locator('script[type="module"][src^="/assets/"]').first().getAttribute('src')
  const asset = await request.get(script!)
  expect(asset.status()).toBe(200)
  expect(asset.headers()['cache-control']).toContain('immutable')
})
