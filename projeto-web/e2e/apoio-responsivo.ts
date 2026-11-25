// Spec 003 (responsividade): larguras de referência e a verificação de que a página não rola na
// horizontal, usadas por responsivo.spec.ts e acessibilidade.spec.ts.
import { expect, type Locator, type Page } from '@playwright/test'

export const LARGURAS = { estreito: 360, celular: 390, tablet: 768 } as const

export const TEMAS = ['claro', 'escuro'] as const

/** Antes de abrir a página: escolhe o tema guardado (spec 002). */
export async function usarTema(page: Page, tema: (typeof TEMAS)[number]) {
  await page.addInitScript((t) => localStorage.setItem('conecta:tema', t), tema)
}

/** RR-22: nada na página passa da largura da janela. */
export async function semRolagemLateral(page: Page) {
  const medidas = await page.evaluate(() => {
    const doc = document.documentElement
    // A casca rola no <main>: ele também não pode ter rolagem lateral.
    const main = document.querySelector('main')
    return { doc: doc.scrollWidth, janela: window.innerWidth, main: main?.scrollWidth ?? 0, mainVisivel: main?.clientWidth ?? 0 }
  })
  expect(medidas.doc, `documento ${medidas.doc} > janela ${medidas.janela}`).toBeLessThanOrEqual(medidas.janela)
  expect(medidas.main, `<main> rola: ${medidas.main} > ${medidas.mainVisivel}`).toBeLessThanOrEqual(medidas.mainVisivel)
}

/** Na casca quem rola é o <main>: o documento em si nunca passa da altura da janela (sem espaço
 * vazio embaixo). */
export async function semRolagemDoDocumento(page: Page) {
  const { doc, janela } = await page.evaluate(() => ({ doc: document.documentElement.scrollHeight, janela: window.innerHeight }))
  expect(doc, `documento com ${doc} px de altura numa janela de ${janela}`).toBeLessThanOrEqual(janela)
}

export async function caixa(alvo: Locator) {
  const b = await alvo.boundingBox()
  expect(b, 'elemento sem caixa (invisível?)').not.toBeNull()
  return b!
}

/** Publica um aviso pela tela, na largura de desktop, e volta à largura pedida. */
export async function publicarAviso(page: Page, titulo: string, largura: number) {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/avisos/novo')
  await page.getByLabel('Título').fill(titulo)
  await page.getByLabel('Conteúdo').fill('Conteúdo do aviso de teste.')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  await page.setViewportSize({ width: largura, height: 844 })
}

/** Largura útil do conteúdo: o <main> menos as margens laterais. */
export async function larguraDoConteudo(page: Page) {
  return page.locator('main').evaluate((m) => {
    const s = getComputedStyle(m)
    return m.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight)
  })
}
