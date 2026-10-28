import { expect, test, type Page } from '@playwright/test'

import { alterarVinculo, avisosNaApi, entrar, estaNaGestao, reiniciarApi } from './apoio'

const TURMA_3A = '00000000-0000-4000-8000-000000000001'

test.beforeEach(async () => {
  await reiniciarApi()
})

async function abrirEditor(page: Page, usuario: string) {
  await entrar(page, usuario)
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Novo aviso' }).click()
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
}

async function escrever(page: Page, titulo: string, conteudo: string) {
  await page.getByLabel('Título').fill(titulo)
  await page.getByLabel('Conteúdo').fill(conteudo)
}

test('coordenação publica para três turmas', async ({ page }) => {
  await abrirEditor(page, 'coord.teste')
  await escrever(page, 'Semana Acadêmica 2026/2', 'Programação completa no site do curso.')

  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Adicionar destino' })
  for (const c of ['TADS-3A', 'TADS-3B', 'TADS-3C']) await dialogo.getByRole('checkbox', { name: new RegExp(c) }).check()
  await dialogo.getByRole('button', { name: 'Adicionar 3 destinos' }).click()

  const previa = page.getByRole('region', { name: 'Como aparece no aplicativo' })
  await expect(previa.getByText('Semana Acadêmica 2026/2')).toBeVisible()
  await expect(previa.getByText('+1')).toBeVisible()

  await page.getByRole('button', { name: 'Publicar aviso' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  await expect(page.getByRole('row', { name: /Semana Acadêmica 2026\/2/ })).toBeVisible()
  const [aviso] = await avisosNaApi()
  expect(aviso.titulo).toBe('Semana Acadêmica 2026/2')
  expect((aviso.destinos as { tipo: string }[]).map((d) => d.tipo)).toEqual(['turma', 'turma', 'turma'])
})

test('docente publica para a turma em que leciona', async ({ page }) => {
  await abrirEditor(page, 'docente.teste')
  await expect(page.getByRole('checkbox', { name: /TADS-3B/ })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /Todos os usuários/ })).toBeDisabled()
  await escrever(page, 'Lista de exercícios 5', 'Entrega até 28/10.')

  await page.getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('button', { name: 'Publicar aviso' }).click()

  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Meus avisos' })).toBeVisible()
  expect((await avisosNaApi())[0].autor).toMatchObject({ nome: 'Ricardo Lemos' })
})

test('docente que perdeu o vínculo é recusado e não perde o texto', async ({ page }) => {
  await abrirEditor(page, 'docente.teste')
  await escrever(page, 'Lista de exercícios 5', 'Entrega até 28/10.')
  await page.getByRole('checkbox', { name: /TADS-3A/ }).check()

  await alterarVinculo('docente.teste', TURMA_3A, true)
  await page.getByRole('button', { name: 'Publicar aviso' }).click()

  await expect(page.getByRole('alert')).toHaveText('Você só pode publicar para as turmas em que leciona.')
  await expect(page.getByRole('checkbox', { name: /TADS-3A/ })).toHaveCount(0)
  await expect(page.getByLabel('Título')).toHaveValue('Lista de exercícios 5')
  await expect(page.getByLabel('Conteúdo')).toHaveValue('Entrega até 28/10.')
  expect(await avisosNaApi()).toHaveLength(0)
})

test('o rascunho sobrevive a recarregar a página', async ({ page }) => {
  await abrirEditor(page, 'coord.teste')
  await escrever(page, 'Texto que não pode se perder', 'Conteúdo longo.')

  await page.reload()

  await expect(page.getByLabel('Título')).toHaveValue('Texto que não pode se perder')
  await expect(page.getByText(/Rascunho recuperado/)).toBeVisible()
})
