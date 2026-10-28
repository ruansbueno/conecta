// T074 (SC-006, RW-42): com a rede caída no envio, nenhum formulário perde o que foi digitado; de
// volta a rede, o mesmo envio funciona. Erros de validação da API também preservam o texto (testes
// de componente do editor, da turma e do perfil).
import { expect, test } from '@playwright/test'

import { avisosNaApi, entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

const semConexao = 'Não foi possível conectar. Verifique a rede e tente de novo.'

test('login: sem rede, usuário e senha ficam', async ({ page, context }) => {
  await page.goto('/login')
  await page.getByLabel('Usuário').fill('coord.teste')
  await page.getByLabel('Senha').fill('senha-teste')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('alert')).toHaveText(semConexao)
  await expect(page.getByLabel('Usuário')).toHaveValue('coord.teste')
  await expect(page.getByLabel('Senha')).toHaveValue('senha-teste')

  await context.setOffline(false)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/painel$/)
})

test('editor de aviso: sem rede, título, conteúdo e destinos ficam; com rede, publica', async ({ page, context }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/avisos/novo')
  await page.getByLabel('Título').fill('Texto que não pode se perder')
  await page.getByLabel('Conteúdo').fill('Escrito com calma, enviado sem rede.')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()

  await context.setOffline(true)
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await expect(page.getByRole('alert')).toHaveText(semConexao)
  await expect(page.getByLabel('Título')).toHaveValue('Texto que não pode se perder')
  await expect(page.getByLabel('Conteúdo')).toHaveValue('Escrito com calma, enviado sem rede.')
  await expect(page.getByRole('button', { name: /Remover destino TADS 3º Sem A/ })).toBeVisible()

  await context.setOffline(false)
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  expect((await avisosNaApi())[0].titulo).toBe('Texto que não pode se perder')
})

test('nova turma e recusa com motivo: sem rede, o digitado fica no formulário', async ({ page, context }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  await page.goto('/turmas')
  await page.getByRole('button', { name: 'Nova turma' }).click()
  const turma = page.getByRole('dialog', { name: 'Nova turma' })
  await turma.getByLabel('Código').fill('SI-9A')
  await turma.getByLabel('Nome').fill('Sistemas para Internet 9A')
  await turma.getByLabel('Semestre do curso').selectOption('9º')
  await turma.getByLabel('Período letivo').fill('2026/2')
  await context.setOffline(true)
  await turma.getByRole('button', { name: 'Criar turma' }).click()
  await expect(turma.getByRole('alert')).toHaveText(semConexao)
  await expect(turma.getByLabel('Nome')).toHaveValue('Sistemas para Internet 9A')
  await context.setOffline(false)
  await turma.getByRole('button', { name: 'Cancelar' }).click()

  await page.goto('/solicitacoes')
  await page.getByRole('button', { name: /^Recusar/ }).first().click()
  const recusa = page.getByRole('dialog')
  await recusa.getByLabel('Motivo (opcional)').fill('Turma completa neste semestre')
  await context.setOffline(true)
  await recusa.getByRole('button', { name: 'Recusar solicitação' }).click()
  await expect(recusa.getByRole('alert')).toHaveText(semConexao)
  await expect(recusa.getByLabel('Motivo (opcional)')).toHaveValue('Turma completa neste semestre')
  await context.setOffline(false)
})
