import { expect, test } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

test('painel da coordenação: números de toda a gestão e o contador na barra lateral', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  await expect(page.getByRole('heading', { level: 1, name: /Marina/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Solicitações pendentes' })).toContainText('3')
  await expect(page.getByRole('region', { name: 'Turmas ativas' })).toContainText('4')
  await expect(page.getByRole('region', { name: 'Avisos ativos' })).toContainText('0')
  await expect(page.getByText('Nenhum aviso publicado ainda.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Solicitações, 3 pendentes' })).toBeVisible()
})

test('painel do docente: só as turmas e solicitações dele, como a API restringe', async ({ page }) => {
  await entrar(page, 'docente.teste')
  await estaNaGestao(page)

  await expect(page.getByText('Você leciona em 2 turmas. Pode publicar avisos e decidir solicitações apenas nelas.')).toBeVisible()
  const turmas = page.getByRole('region', { name: 'Minhas turmas' })
  await expect(turmas.getByRole('listitem', { name: 'TADS 3º Sem A' })).toContainText('1 solicitação')
  await expect(turmas.getByRole('listitem', { name: 'TADS 5º Sem A' })).toContainText('1 solicitação')
  await expect(turmas.getByRole('listitem', { name: 'TADS 3º Sem B' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Solicitações, 2 pendentes' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Turmas ativas' })).toHaveCount(0)
})
