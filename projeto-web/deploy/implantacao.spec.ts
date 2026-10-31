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

test('nenhuma violação da CSP ao entrar e navegar', async ({ page }) => {
  await page.addInitScript(() => {
    ;(window as unknown as { violacoes: string[] }).violacoes = []
    document.addEventListener('securitypolicyviolation', (e) =>
      (window as unknown as { violacoes: string[] }).violacoes.push(`${e.violatedDirective} ${e.blockedURI}`),
    )
  })
  await page.goto('/login')
  await page.getByLabel('Usuário').fill('coord.teste')
  await page.getByLabel('Senha').fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel$/)
  await page.goto('/avisos/novo')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  expect(await page.evaluate(() => (window as unknown as { violacoes: string[] }).violacoes)).toEqual([])
})

test('fontes têm os cabeçalhos de segurança e o nginx não informa a versão', async ({ request }) => {
  const r = await request.get('/fonts/inter-400-latin.woff2')
  expect(r.status()).toBe(200)
  expect(r.headers()['x-content-type-options']).toBe('nosniff')
  expect(r.headers()['strict-transport-security']).toContain('max-age=')
  expect(r.headers()['server']).toBe('nginx')
})

async function entrarComo(page: import('@playwright/test').Page, usuario: string) {
  await page.goto('/login')
  await page.getByLabel('Usuário').fill(usuario)
  await page.getByLabel('Senha').fill('senha-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel$/)
}

test('escrita pela API real: o CSRF assinado da sessão passa (sair encerra a sessão)', async ({ page, context }) => {
  await entrarComo(page, 'coord.teste')

  await page.getByRole('button', { name: 'Sair' }).click()

  await expect(page).toHaveURL(/\/login$/)
  expect((await context.cookies()).map((c) => c.name)).not.toContain('conecta_sessao')
})

test('CSRF válido de outra sessão, plantado no navegador, é recusado pela API real (RF-33, v2.2)', async ({ page, context, request }) => {
  const outra = await request.post('/api/auth/login', { data: { username: 'aluno.teste', password: 'senha-teste' } })
  expect(outra.status()).toBe(200)
  const plantado = (await request.storageState()).cookies.find((c) => c.name === 'conecta_csrf')!
  await entrarComo(page, 'coord.teste')
  await context.addCookies([{ ...plantado, name: 'conecta_csrf' }])

  await page.getByRole('button', { name: 'Sair' }).click()

  await expect(page.getByText('Não foi possível confirmar a sessão. Recarregue a página e tente de novo.')).toBeVisible()
  await expect(page).toHaveURL(/\/painel$/)
})
