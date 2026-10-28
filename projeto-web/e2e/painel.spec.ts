import { expect, test } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

test('painel da coordenação: números de toda a gestão e o contador na barra lateral', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  await expect(page.getByRole('heading', { level: 1, name: /Marina/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Solicitações pendentes' }).getByText('3', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Turmas ativas' }).getByText('4', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Avisos ativos' }).getByText('0', { exact: true })).toBeVisible()
  await expect(page.getByText('Nenhum aviso publicado ainda.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Solicitações, 3 pendentes' })).toBeVisible()
})

test('painel do docente: só as turmas e solicitações dele, como a API restringe', async ({ page }) => {
  await entrar(page, 'docente.teste')
  await estaNaGestao(page)

  await expect(page.getByText('Você leciona em 2 turmas. Pode publicar avisos e decidir solicitações apenas nelas.')).toBeVisible()
  const turmas = page.getByRole('region', { name: 'Minhas turmas', exact: true })
  await expect(turmas.getByRole('listitem').filter({ hasText: 'TADS 3º Sem A' })).toContainText('1 solicitação')
  await expect(turmas.getByRole('listitem').filter({ hasText: 'TADS 5º Sem A' })).toContainText('1 solicitação')
  await expect(turmas.getByRole('listitem').filter({ hasText: 'TADS 3º Sem B' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Solicitações, 2 pendentes' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Turmas ativas' })).toHaveCount(0)
})
