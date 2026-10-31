import { execSync } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { expect, test } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

test('o token nunca chega ao JavaScript nem ao armazenamento do navegador (RW-02, SC-003)', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  const sessao = (await page.context().cookies()).find((c) => c.name === 'conecta_sessao')!
  const visto = await page.evaluate(() => ({
    cookie: document.cookie,
    local: JSON.stringify({ ...localStorage }),
    session: JSON.stringify({ ...sessionStorage }),
  }))

  expect(sessao.httpOnly).toBe(true)
  expect(sessao.secure).toBe(true)
  expect(sessao.sameSite).toBe('Strict')
  expect(visto.cookie).not.toContain('conecta_sessao')
  expect(visto.cookie).not.toContain(sessao.value)
  expect(visto.local).not.toContain(sessao.value)
  expect(visto.session).not.toContain(sessao.value)
})

test('o pacote servido não contém segredo (RW-44)', () => {
  // Fora do projeto: dentro dele, o servidor de desenvolvimento observaria a pasta do build.
  const saida = mkdtempSync(join(tmpdir(), 'conecta-build-'))
  execSync(`node_modules/.bin/vite build --outDir ${saida} --emptyOutDir`, { stdio: 'ignore' })
  const pasta = join(saida, 'assets')
  const conteudo = readdirSync(pasta)
    .map((f) => readFileSync(join(pasta, f), 'utf8'))
    .join('\n')
  rmSync(saida, { recursive: true })

  for (const proibido of [/senha-teste/, /JWT_SECRET/, /CSRF_SECRET/, /DATABASE_URL/, /eyJhbGciOi/, /BEGIN [A-Z ]*PRIVATE KEY/]) {
    expect(conteudo).not.toMatch(proibido)
  }
})
