// Spec 002, User Story 1: o modo noturno de ponta a ponta — escolha guardada no navegador, tema
// aplicado antes da primeira pintura, escolha que sobrevive à recarga e a sair da conta.
import { expect, test, type Page } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async ({ page }) => {
  await reiniciarApi()
  // Quando o <body> começa a ser montado, o tema já precisa estar no <html> (FR-005).
  await page.addInitScript(() => {
    new MutationObserver((_, observador) => {
      if (!document.body) return
      ;(window as unknown as { temaNoInicio?: string }).temaNoInicio = document.documentElement.dataset.tema
      observador.disconnect()
    }).observe(document, { childList: true, subtree: true })
  })
})

const temaNoInicio = (page: Page) => page.evaluate(() => (window as unknown as { temaNoInicio?: string }).temaNoInicio)
const html = (page: Page) => page.locator('html')
const FUNDO_ESCURO = 'rgb(11, 20, 36)'
const FUNDO_CLARO = 'rgb(245, 248, 252)'

test('sem escolha, segue o sistema escuro desde o primeiro quadro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/login')

  expect(await temaNoInicio(page)).toBe('escuro')
  await expect(html(page)).toHaveAttribute('data-tema', 'escuro')
  await expect(page.getByRole('button', { name: 'Desativar modo noturno' })).toBeVisible()
})

test('alternar no login, entrar, recarregar e sair: o escuro continua', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/login')
  await expect(html(page)).toHaveAttribute('data-tema', 'claro')

  await page.getByRole('button', { name: 'Ativar modo noturno' }).click()
  await expect(html(page)).toHaveAttribute('data-tema', 'escuro')
  await expect(html(page)).toHaveCSS('background-color', FUNDO_ESCURO)

  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await expect(html(page)).toHaveAttribute('data-tema', 'escuro')
  await expect(page.getByRole('banner').getByRole('button', { name: 'Desativar modo noturno' })).toBeVisible()

  await page.reload()
  await estaNaGestao(page)
  expect(await temaNoInicio(page)).toBe('escuro')

  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page.getByRole('heading', { name: 'Acesso à gestão' })).toBeVisible()
  await expect(html(page)).toHaveAttribute('data-tema', 'escuro')
  expect(await page.evaluate(() => localStorage.getItem('conecta:tema'))).toBe('escuro')
})

test('a escolha "claro" vence o sistema escuro', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => localStorage.setItem('conecta:tema', 'claro'))
  await page.goto('/login')

  expect(await temaNoInicio(page)).toBe('claro')
  await expect(html(page)).toHaveCSS('background-color', FUNDO_CLARO)
})

test('trocar o tema no meio do editor não perde o que foi digitado', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/avisos/novo')
  await page.getByLabel('Título').fill('Prova adiada')
  await page.getByLabel('Conteúdo').fill('A prova passou para a próxima semana.')

  await page.getByRole('button', { name: 'Ativar modo noturno' }).click()

  await expect(html(page)).toHaveAttribute('data-tema', 'escuro')
  await expect(page.getByLabel('Título')).toHaveValue('Prova adiada')
  await expect(page.getByLabel('Conteúdo')).toHaveValue('A prova passou para a próxima semana.')
})

test('outra aba acompanha a escolha', async ({ page, context }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/login')
  const outra = await context.newPage()
  await outra.goto('/login')
  await expect(html(outra)).toHaveAttribute('data-tema', 'claro')

  await page.getByRole('button', { name: 'Ativar modo noturno' }).click()

  await expect(html(outra)).toHaveAttribute('data-tema', 'escuro')
})
