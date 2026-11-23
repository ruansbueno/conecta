// Spec 003 (responsividade): comportamento por largura, nos dois temas. O desktop (1440 px) é
// coberto pelas demais suítes, que não mudam.
import { expect, test } from '@playwright/test'

import { entrar, reiniciarApi } from './apoio'
import { caixa, LARGURAS, larguraDoConteudo, publicarAviso, semRolagemLateral, TEMAS, usarTema } from './apoio-responsivo'

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

    test.describe('cabeçalhos, abas, filtros e rodapés (RR-06 a RR-10, RR-13, RR-23)', () => {
      test('ação principal ocupa a largura do conteúdo no celular e fica ao lado do título no tablet', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/horarios')
        await page.locator('main a[href*="/horarios"]').first().click()
        const grade = page.url()
        const casos: [string, string][] = [['/avisos', 'Novo aviso'], ['/eventos', 'Novo evento'], ['/turmas', 'Nova turma'], [grade, 'Nova aula']]
        for (const [rota, acao] of casos) {
          await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
          await page.goto(rota)
          const botao = page.getByRole('main').getByRole(acao === 'Nova turma' || acao === 'Nova aula' ? 'button' : 'link', { name: acao })
          const largura = (await caixa(botao)).width
          expect(Math.abs(largura - (await larguraDoConteudo(page))), `${acao} em 390 px`).toBeLessThanOrEqual(1)

          await page.setViewportSize({ width: LARGURAS.tablet, height: 1024 })
          const titulo = await caixa(page.getByRole('heading', { level: 1 }))
          expect(Math.abs((await caixa(botao)).y - titulo.y), `${acao} em 768 px`).toBeLessThanOrEqual(8)
        }
      })

      test('botões do cabeçalho viram grade no celular', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await publicarAviso(page, 'Aviso da grade de botões', LARGURAS.celular)
        await page.getByRole('link', { name: 'Aviso da grade de botões' }).first().click()
        const botoes = [page.getByRole('button', { name: 'Arquivar', exact: true }), page.getByRole('link', { name: 'Editar', exact: true }), page.getByRole('button', { name: 'Excluir', exact: true })]
        const caixas = await Promise.all(botoes.map(caixa))
        for (const c of caixas.slice(1)) {
          expect(Math.abs(c.y - caixas[0].y)).toBeLessThanOrEqual(1)
          expect(Math.abs(c.width - caixas[0].width)).toBeLessThanOrEqual(1)
        }

        await page.goto('/turmas')
        await page.locator('main a[href^="/turmas/"]').first().click()
        const quatro = await Promise.all(
          [page.getByRole('link', { name: 'Horários' }), page.getByRole('button', { name: 'Fechar inscrições' }), page.getByRole('button', { name: 'Editar turma' }), page.getByRole('button', { name: 'Desativar turma' })].map(caixa),
        )
        expect(Math.abs(quatro[0].y - quatro[1].y)).toBeLessThanOrEqual(1)
        expect(Math.abs(quatro[2].y - quatro[3].y)).toBeLessThanOrEqual(1)
        expect(quatro[2].y).toBeGreaterThan(quatro[0].y + 20)
      })

      test('abas de Usuários rolam sem empurrar a página', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        await expect(page.getByRole('tab', { name: 'Todos' })).toBeVisible()
        await semRolagemLateral(page)
        const aguardando = page.getByRole('tab', { name: /Aguardando acesso/ })
        await aguardando.scrollIntoViewIfNeeded()
        const c = await caixa(aguardando)
        expect(c.x + c.width).toBeLessThanOrEqual(LARGURAS.celular)
        await semRolagemLateral(page)
      })

      test('busca ocupa a largura toda no celular', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/turmas')
        await page.locator('main a[href^="/turmas/"]').first().click()
        await expect(page.getByRole('heading', { name: 'Vínculos' })).toBeVisible()
        const detalhe = page.url()
        for (const rota of ['/avisos', '/eventos', '/turmas', '/usuarios', detalhe]) {
          await page.goto(rota)
          const campo = page.getByRole('main').locator('label.campo').first()
          const largura = (await caixa(campo)).width
          expect(Math.abs(largura - (await larguraDoConteudo(page))), rota).toBeLessThanOrEqual(1)
        }
      })

      test('rodapé de paginação quebra sem cortar', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        const texto = page.getByText(/^Mostrando \d+ de \d+ usuários$/)
        const nav = page.getByRole('navigation', { name: 'Paginação' })
        const limite = (await larguraDoConteudo(page)) + 16
        for (const c of [await caixa(texto), await caixa(nav)]) expect(c.x + c.width).toBeLessThanOrEqual(limite + 1)
      })

      test('botões de ícone com 40 px no celular e 36 px no desktop', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        const alterar = page.getByRole('button', { name: /^Alterar perfil de/ }).first()
        const tema = page.getByRole('button', { name: /modo noturno/ })
        for (const b of [page.getByRole('button', { name: 'Abrir menu' }), tema, alterar]) {
          const c = await caixa(b)
          expect(Math.min(c.width, c.height)).toBeGreaterThanOrEqual(40)
        }
        await page.setViewportSize({ width: 1440, height: 900 })
        expect(Math.round((await caixa(alterar)).width)).toBe(36)
      })
    })
  })
}
