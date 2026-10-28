// T073 (SC-004): login, lista, editor, seletor e confirmação percorridos só com o teclado — nenhum
// clique depois de abrir a página. Também confere que o foco é visível (contorno) e que, ao fechar
// um diálogo, ele volta ao botão que o abriu.
import { expect, test, type Page } from '@playwright/test'

import { avisosNaApi, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

/** Aperta Tab até o foco chegar no elemento (ou falha), como uma pessoa faria. */
async function tabAte(page: Page, alvo: ReturnType<Page['getByRole']>, limite = 40) {
  for (let i = 0; i < limite; i++) {
    if (await alvo.evaluate((el) => el === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('o foco não chegou ao elemento só com Tab')
}

async function focoVisivel(page: Page) {
  const contorno = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const s = getComputedStyle(el)
    return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
  })
  expect(contorno, 'o elemento com foco precisa de contorno visível').toBe(true)
}

test('do login à publicação de um aviso, só com o teclado', async ({ page }) => {
  await page.goto('/login')

  // Login
  await tabAte(page, page.getByLabel('Usuário'))
  await page.keyboard.type('coord.teste')
  await page.keyboard.press('Tab')
  await page.keyboard.type('senha-teste')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/painel$/)

  // Navegação: barra lateral até Avisos
  await tabAte(page, page.getByRole('link', { name: 'Avisos', exact: true }))
  await focoVisivel(page)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible()

  // Abas da lista com as setas
  await tabAte(page, page.getByRole('tab', { name: 'Ativos' }))
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Agendados' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Agendados' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowLeft')

  // Novo aviso
  await tabAte(page, page.getByRole('link', { name: 'Novo aviso' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await tabAte(page, page.getByLabel('Título'))
  await page.keyboard.type('Aviso feito só com o teclado')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Sem mouse do começo ao fim.')

  // Seletor de destinos (modal): abre, troca de aba com setas, marca com espaço, confirma
  const adicionar = page.getByRole('button', { name: 'Adicionar destino' })
  await tabAte(page, adicionar)
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: 'Adicionar destino' })
  await expect(dialogo).toBeVisible()
  await tabAte(page, dialogo.getByRole('tab', { name: 'Turmas' }))
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(dialogo.getByRole('tab', { name: 'Grupos' })).toBeFocused()
  await tabAte(page, dialogo.getByRole('checkbox', { name: 'Docentes' }))
  await page.keyboard.press('Space')
  await tabAte(page, dialogo.getByRole('button', { name: 'Adicionar 1 destino' }))
  await page.keyboard.press('Enter')
  await expect(dialogo).toBeHidden()
  await expect(adicionar).toBeFocused() // o foco volta a quem abriu o diálogo

  // Publicar
  await tabAte(page, page.getByRole('button', { name: 'Publicar aviso' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  expect((await avisosNaApi())[0].titulo).toBe('Aviso feito só com o teclado')
})

test('confirmação: Esc cancela e devolve o foco; Enter confirma', async ({ page }) => {
  await page.goto('/login')
  await tabAte(page, page.getByLabel('Usuário'))
  await page.keyboard.type('coord.teste')
  await page.keyboard.press('Tab')
  await page.keyboard.type('senha-teste')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/painel$/)

  // Uma turma qualquer: desativar pede confirmação.
  await tabAte(page, page.getByRole('link', { name: 'Turmas', exact: true }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('table', { name: /Turmas/ })).toBeVisible()
  await tabAte(page, page.getByRole('link', { name: /^Vínculos de TADS-3B/ }))
  await page.keyboard.press('Enter')
  const desativar = page.getByRole('button', { name: 'Desativar turma' })
  await tabAte(page, desativar)

  await page.keyboard.press('Enter')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(desativar).toBeFocused()

  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('alertdialog').getByRole('button', { name: 'Desativar turma' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Turma desativada.' })).toBeVisible()
  await expect(page.getByRole('status')).toBeFocused() // a mensagem recebe o foco
})
