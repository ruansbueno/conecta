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

test('nova turma e recusa com motivo: sem rede, o digitado fica; com rede, o mesmo envio funciona', async ({ page, context }) => {
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
  await turma.getByRole('button', { name: 'Criar turma' }).click()
  await expect(turma).toBeHidden()
  await expect(page.getByRole('row', { name: /SI-9A/ })).toBeVisible()

  await page.goto('/solicitacoes')
  await page.getByRole('button', { name: /^Recusar/ }).first().click()
  const recusa = page.getByRole('dialog')
  await recusa.getByLabel('Motivo (opcional)').fill('Turma completa neste semestre')
  await context.setOffline(true)
  await recusa.getByRole('button', { name: 'Recusar solicitação' }).click()
  await expect(recusa.getByRole('alert')).toHaveText(semConexao)
  await expect(recusa.getByLabel('Motivo (opcional)')).toHaveValue('Turma completa neste semestre')
  await context.setOffline(false)
  await recusa.getByRole('button', { name: 'Recusar solicitação' }).click()
  await expect(page.getByRole('status').filter({ hasText: /^Solicitação de .+ recusada\.$/ })).toBeVisible()
})

test('editar aviso: sem rede, a alteração fica; com rede, salva a versão 2', async ({ page, context }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/avisos/novo')
  await page.getByLabel('Título').fill('Aviso original')
  await page.getByLabel('Conteúdo').fill('Primeira versão.')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await page.getByRole('link', { name: 'Aviso original', exact: true }).click()
  await page.getByRole('link', { name: 'Editar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible()

  await page.getByLabel('Conteúdo').fill('Segunda versão, escrita sem rede.')
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('alert')).toHaveText(semConexao)
  await expect(page.getByLabel('Conteúdo')).toHaveValue('Segunda versão, escrita sem rede.')

  await context.setOffline(false)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Alterações salvas. Esta é a versão 2.' })).toBeVisible()
})

test('editar turma e vincular: sem rede, o digitado e a escolha ficam; com rede, salvam', async ({ page, context }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/turmas')
  await page.getByRole('row', { name: /TADS-3B/ }).getByRole('link', { name: /^Vínculos de/ }).click()

  await page.getByRole('button', { name: 'Editar turma' }).click()
  const edicao = page.getByRole('dialog', { name: 'Editar turma' })
  await edicao.getByLabel('Nome').fill('TADS 3º Sem B — noite')
  await context.setOffline(true)
  await edicao.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(edicao.getByRole('alert')).toHaveText(semConexao)
  await expect(edicao.getByLabel('Nome')).toHaveValue('TADS 3º Sem B — noite')
  await context.setOffline(false)
  await edicao.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Turma atualizada.' })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'TADS 3º Sem B — noite' })).toBeVisible()

  await page.getByRole('button', { name: 'Vincular docente' }).click()
  const vincular = page.getByRole('dialog', { name: 'Vincular docente' })
  await vincular.getByRole('searchbox').fill('ricardo')
  await vincular.getByRole('radio', { name: /Ricardo Lemos/ }).check()
  await context.setOffline(true)
  await vincular.getByRole('button', { name: 'Vincular' }).click()
  await expect(vincular.getByRole('alert')).toHaveText(semConexao)
  await expect(vincular.getByRole('radio', { name: /Ricardo Lemos/ })).toBeChecked()
  await context.setOffline(false)
  await vincular.getByRole('button', { name: 'Vincular' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Ricardo Lemos agora está na turma como docente.' })).toBeVisible()
})

test('alterar perfil: sem rede, a escolha fica; com rede, salva', async ({ page, context }) => {
  await entrar(page, 'admin.teste')
  await estaNaGestao(page)
  await page.goto('/usuarios')
  await page.getByRole('button', { name: 'Alterar perfil de Marina Duarte' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Alterar perfil de acesso' })
  await dialogo.getByRole('radio', { name: 'Docente' }).check()
  await context.setOffline(true)
  await dialogo.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(dialogo.getByRole('alert')).toHaveText(semConexao)
  await expect(dialogo.getByRole('radio', { name: 'Docente' })).toBeChecked()
  await context.setOffline(false)
  await dialogo.getByRole('button', { name: 'Salvar perfil' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Marina Duarte agora tem o perfil Docente.' })).toBeVisible()
})
