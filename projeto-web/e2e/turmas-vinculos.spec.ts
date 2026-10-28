import { expect, test, type Page } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

async function abrirTurmas(page: Page, usuario = 'coord.teste') {
  await entrar(page, usuario)
  await estaNaGestao(page)
  await page.getByRole('link', { name: usuario === 'docente.teste' ? 'Minhas turmas' : 'Turmas' }).click()
  await expect(page.getByRole('table', { name: /Turmas/ })).toBeVisible()
}

const status = (page: Page, texto: string) => expect(page.getByRole('status').filter({ hasText: texto })).toBeVisible()

test('criar turma e recusar código duplicado', async ({ page }) => {
  await abrirTurmas(page)

  await page.getByRole('button', { name: 'Nova turma' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Nova turma' })
  await dialogo.getByLabel('Código').fill('SI-7A')
  await dialogo.getByLabel('Nome').fill('Sistemas para Internet 7A')
  await dialogo.getByLabel('Semestre do curso').selectOption('7º')
  await dialogo.getByLabel('Período letivo').fill('2026/2')
  await dialogo.getByRole('button', { name: 'Criar turma' }).click()

  await status(page, 'Turma SI-7A criada.')
  await expect(page.getByRole('row', { name: /SI-7A/ })).toContainText('Sistemas para Internet 7A')

  await page.getByRole('button', { name: 'Nova turma' }).click()
  const outro = page.getByRole('dialog', { name: 'Nova turma' })
  await outro.getByLabel('Código').fill('SI-7A')
  await outro.getByLabel('Nome').fill('Duplicada')
  await outro.getByLabel('Semestre do curso').selectOption('7º')
  await outro.getByLabel('Período letivo').fill('2026/2')
  await outro.getByRole('button', { name: 'Criar turma' }).click()

  await expect(outro.getByText('Já existe uma turma com este código.')).toBeVisible()
  await expect(outro.getByLabel('Nome')).toHaveValue('Duplicada')
})

test('vincular docente, remover vínculo e desativar a turma', async ({ page }) => {
  await abrirTurmas(page)
  await page.getByRole('row', { name: /TADS-3B/ }).getByRole('link', { name: /^Vínculos de/ }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'TADS 3º Sem B' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Dados da turma' })).toContainText('0 alunos · 0 docentes')

  // Vincular
  await page.getByRole('button', { name: 'Vincular docente' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Vincular docente' })
  await dialogo.getByRole('searchbox').fill('ricardo')
  await dialogo.getByRole('radio', { name: /Ricardo Lemos/ }).check()
  await dialogo.getByRole('button', { name: 'Vincular' }).click()
  await status(page, 'Ricardo Lemos agora está na turma como docente.')
  await expect(page.getByRole('row', { name: /Ricardo Lemos/ })).toContainText('Vínculo pela gestão')
  await expect(page.getByRole('region', { name: 'Dados da turma' })).toContainText('0 alunos · 1 docente')

  // Quem já está na turma não pode ser vinculado de novo
  await page.getByRole('button', { name: 'Vincular docente' }).click()
  await page.getByRole('dialog').getByRole('searchbox').fill('ricardo')
  await expect(page.getByRole('dialog').getByRole('radio', { name: /Ricardo Lemos/ })).toBeDisabled()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click()

  // Remover, com o alerta de perda de acesso
  await page.getByRole('button', { name: 'Remover vínculo de Ricardo Lemos' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('perde na hora o acesso aos avisos desta turma')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover vínculo' }).click()
  await status(page, 'Vínculo de Ricardo Lemos removido.')
  await expect(page.getByText('Nenhum vínculo')).toBeVisible()

  // Desativar
  await page.getByRole('button', { name: 'Desativar turma' }).click()
  await expect(page.getByRole('alertdialog')).toContainText('vínculos são preservados')
  await page.getByRole('alertdialog').getByRole('button', { name: 'Desativar turma' }).click()
  await status(page, 'Turma desativada.')
  await expect(page.getByRole('region', { name: 'Dados da turma' })).toContainText('Inativa')

  await page.getByRole('link', { name: 'Voltar às turmas' }).click()
  await expect(page.getByRole('row', { name: /TADS-3B/ })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Inativas' }).click()
  await expect(page.getByRole('row', { name: /TADS-3B/ })).toContainText('Inativa')
})

test('docente vê só as turmas em que leciona, sem ações de gestão', async ({ page }) => {
  await abrirTurmas(page, 'docente.teste')

  await expect(page.getByRole('row')).toHaveCount(3) // cabeçalho + TADS-3A e TADS-5A
  await expect(page.getByRole('button', { name: 'Nova turma' })).toHaveCount(0)
  await page.getByRole('row', { name: /TADS-3A/ }).getByRole('link', { name: /^Vínculos de/ }).click()
  await expect(page.getByRole('table', { name: /Vínculos/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Remover vínculo/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Vincular aluno' })).toHaveCount(0)
})
