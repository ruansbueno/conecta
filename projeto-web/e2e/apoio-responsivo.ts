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

export async function caixa(alvo: Locator) {
  const b = await alvo.boundingBox()
  expect(b, 'elemento sem caixa (invisível?)').not.toBeNull()
  return b!
}
