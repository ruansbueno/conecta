import { expect, test, type Browser, type Page } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

async function abrirUsuarios(page: Page, usuario = 'admin.teste') {
  await entrar(page, usuario)
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Usuários' }).click()
  await expect(page.getByRole('table', { name: /Usuários/ })).toBeVisible()
}

/** Outra pessoa, noutro navegador, usando a plataforma ao mesmo tempo. */
async function outraPessoa(browser: Browser, usuario: string) {
  const page = await (await browser.newContext()).newPage()
  await entrar(page, usuario)
  await estaNaGestao(page)
  return page
}

test('administração muda o perfil e a mudança vale na navegação seguinte da pessoa (SC-008)', async ({ page, browser }) => {
  const marina = await outraPessoa(browser, 'coord.teste')
  await expect(marina.getByRole('link', { name: 'Usuários' })).toBeVisible()

  await abrirUsuarios(page)
  await page.getByRole('button', { name: 'Alterar perfil de Marina Duarte' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Alterar perfil de acesso' })
  await expect(dialogo).toContainText('A mudança vale já na próxima ação da pessoa')
  await dialogo.getByRole('radio', { name: 'Docente' }).check()
  await dialogo.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Marina Duarte agora tem o perfil Docente.' })).toBeVisible()
  await expect(page.getByRole('row', { name: /Marina Duarte/ })).toContainText('Docente')

  // Na navegação seguinte, Marina já é docente.
  await marina.getByRole('link', { name: 'Avisos', exact: true }).click()
  await expect(marina.getByRole('link', { name: 'Meus avisos' })).toBeVisible()
  await expect(marina.getByRole('link', { name: 'Usuários' })).toHaveCount(0)
})

test('vínculos incompatíveis e último administrador são explicados', async ({ page }) => {
  await abrirUsuarios(page)

  await page.getByRole('button', { name: 'Alterar perfil de Ricardo Lemos' }).click()
  let dialogo = page.getByRole('dialog')
  await expect(dialogo).toContainText('vínculo em 2 turmas')
  await dialogo.getByRole('radio', { name: 'Aluno' }).check()
  await dialogo.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(dialogo.getByRole('alert')).toContainText('Remova os vínculos na página da turma')
  await dialogo.getByRole('button', { name: 'Cancelar' }).click()

  await page.getByRole('button', { name: 'Alterar perfil de Administrador de Teste' }).click()
  dialogo = page.getByRole('dialog')
  await expect(dialogo.getByRole('button', { name: 'Desativar usuário' })).toHaveCount(0)
  await dialogo.getByRole('radio', { name: 'Coordenação' }).check()
  await dialogo.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(dialogo.getByRole('alert')).toHaveText('É preciso manter ao menos um administrador ativo.')
})

test('desativar corta o acesso de quem está usando a plataforma', async ({ page, browser }) => {
  const ricardo = await outraPessoa(browser, 'docente.teste')

  await abrirUsuarios(page)
  await page.getByRole('button', { name: 'Alterar perfil de Ricardo Lemos' }).click()
  const dialogo = page.getByRole('dialog')
  await dialogo.getByRole('button', { name: 'Desativar usuário' }).click()
  await expect(dialogo).toContainText('perde o acesso na hora')
  await dialogo.getByRole('button', { name: 'Confirmar desativação' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Acesso de Ricardo Lemos desativado.' })).toBeVisible()
  await expect(page.getByRole('row', { name: /Ricardo Lemos/ })).toContainText('Inativo')

  await ricardo.getByRole('link', { name: 'Minhas turmas' }).click()
  await expect(ricardo.getByText('Este acesso está desativado. Procure a administração.')).toBeVisible()
})

test('coordenação vê os usuários sem a ação de alterar perfil', async ({ page }) => {
  await abrirUsuarios(page, 'coord.teste')
  await expect(page.getByRole('row', { name: /Ricardo Lemos/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Alterar perfil/ })).toHaveCount(0)
})

test('docente que abre /usuarios vê a tela sem permissão', async ({ page }) => {
  await entrar(page, 'docente.teste')
  await estaNaGestao(page)
  await page.goto('/usuarios')
  await expect(page.getByText('Esta área não está disponível para o seu perfil')).toBeVisible()
})
