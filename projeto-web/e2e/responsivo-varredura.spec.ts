// Spec 003, RR-22: nenhuma tela da gestão rola na horizontal em 360, 390, 768 e 1024 px, nos dois
// temas — como coordenação, como docente, no login e em "sem permissão".
import { expect, test, type Page } from '@playwright/test'

import { entrar, reiniciarApi } from './apoio'
import { publicarAviso, semRolagemLateral, TEMAS, usarTema } from './apoio-responsivo'

test.describe.configure({ timeout: 180_000 })

test.beforeEach(async () => {
  await reiniciarApi()
})

const LARGURAS_VARRIDAS = [360, 390, 768, 1024] as const

/** Primeiro link de um tipo na tela (o servidor falso gera ids novos a cada reinício). */
async function primeiro(page: Page, rota: string, seletor: string) {
  await page.goto(rota)
  const link = page.locator(seletor).first()
  await expect(link).toBeVisible()
  return (await link.getAttribute('href'))!
}

async function conferir(page: Page, rotas: string[], largura: number) {
  await page.setViewportSize({ width: largura, height: 900 })
  for (const rota of rotas) {
    await page.goto(rota)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    // Espera o conteúdo trocar o esqueleto de carregamento antes de medir.
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0)
    await test.step(`${rota} em ${largura} px`, () => semRolagemLateral(page))
  }
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await usarTema(page, tema)
    })

    test('nenhuma tela da coordenação rola na horizontal', async ({ page }) => {
      await entrar(page, 'coord.teste')
      await expect(page).toHaveURL(/\/painel$/)
      await publicarAviso(page, 'Aviso da varredura', 1280)
      const aviso = await primeiro(page, '/avisos', 'main a[href^="/avisos/"]:not([href$="/novo"]):not([href$="/editar"])')
      const evento = await primeiro(page, '/eventos', 'main h3 a[href^="/eventos/"]')
      const turma = await primeiro(page, '/turmas', 'main a[href^="/turmas/"]')
      const rotas = [
        '/painel', '/avisos', '/avisos/novo', aviso, `${aviso}?aba=historico`, `${aviso}/editar`,
        '/eventos', '/eventos?aba=mes', '/eventos/novo', evento, `${evento}/editar`,
        '/turmas', turma, `${turma}/horarios`, '/horarios', '/solicitacoes', '/usuarios', '/usuarios?aba=aguardando',
      ]
      for (const largura of LARGURAS_VARRIDAS) await conferir(page, rotas, largura)
    })

    test('nenhuma tela do docente rola na horizontal', async ({ page }) => {
      await entrar(page, 'docente.teste')
      await expect(page).toHaveURL(/\/painel$/)
      const rotas = ['/painel', '/avisos', '/avisos/novo', '/eventos', '/turmas', '/solicitacoes']
      for (const largura of LARGURAS_VARRIDAS) await conferir(page, rotas, largura)
    })

    test('login e sem permissão não rolam na horizontal', async ({ page }) => {
      for (const largura of LARGURAS_VARRIDAS) {
        await page.setViewportSize({ width: largura, height: 900 })
        await page.goto('/login')
        await expect(page.getByRole('heading', { name: 'Acesso à gestão' })).toBeVisible()
        await semRolagemLateral(page)
      }
      await entrar(page, 'aluno.teste')
      await expect(page.getByRole('heading', { name: /A gestão é para/ })).toBeVisible()
      for (const largura of LARGURAS_VARRIDAS) {
        await page.setViewportSize({ width: largura, height: 900 })
        await semRolagemLateral(page)
      }
    })
  })
}
