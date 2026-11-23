// Spec 003 (responsividade): comportamento por largura, nos dois temas. O desktop (1440 px) é
// coberto pelas demais suítes, que não mudam.
import { expect, test } from '@playwright/test'

import { entrar, reiniciarApi } from './apoio'
import { LARGURAS, semRolagemLateral, TEMAS, usarTema } from './apoio-responsivo'

test.beforeEach(async () => {
  await reiniciarApi()
})

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await usarTema(page, tema)
    })

    test.describe('casca (RR-01 a RR-05)', () => {
      test('390 px: menu abre, navega para Turmas e fecha', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        const abrir = page.getByRole('button', { name: 'Abrir menu' })
        await expect(abrir).toBeVisible()
        await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden()

        await abrir.click()
        const gaveta = page.getByRole('dialog', { name: 'Menu' })
        await expect(gaveta).toBeVisible()
        await gaveta.getByRole('link', { name: 'Turmas' }).click()

        await expect(page).toHaveURL(/\/turmas$/)
        await expect(gaveta).toBeHidden()
        await expect(abrir).toBeFocused()
      })

      test('1023 px mostra "Abrir menu" e esconde a barra lateral; 1024 px o contrário', async ({ page }) => {
        await page.setViewportSize({ width: 1023, height: 800 })
        await entrar(page, 'coord.teste')
        const abrir = page.getByRole('button', { name: 'Abrir menu' })
        const lateral = page.getByRole('navigation', { name: 'Navegação principal' })
        await expect(abrir).toBeVisible()
        await expect(lateral).toBeHidden()

        await page.setViewportSize({ width: 1024, height: 800 })
        await expect(abrir).toBeHidden()
        await expect(lateral).toBeVisible()
      })

      test('gaveta aberta fecha ao alargar a janela para 1024 px', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.tablet, height: 1024 })
        await entrar(page, 'coord.teste')
        await page.getByRole('button', { name: 'Abrir menu' }).click()
        await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()

        await page.setViewportSize({ width: 1024, height: 1024 })

        await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0)
        await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
      })

      test('painel em 390 px sem rolagem lateral', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await expect(page.getByRole('heading', { level: 1, name: /Marina/ })).toBeVisible()

        await semRolagemLateral(page)
      })
    })
  })
}
