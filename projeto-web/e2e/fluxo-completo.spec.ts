import { expect, test } from '@playwright/test'

import { alterarVinculo, avisosNaApi, avisosNoAplicativo, entrar, estaNaGestao, reiniciarApi } from './apoio'

const TURMA_3B = '00000000-0000-4000-8000-000000000002'

test.beforeEach(async () => {
  await reiniciarApi()
})

// A web publica e a API registra com o destino certo; a entrega ao aplicativo é conferida aqui pelo
// servidor falso (com a mesma regra de alcance da API) e, contra a API real, pelo e2e da E2 (T128).
test('coordenação publica pela web → a API registra o destino → só quem está na turma recebe (SC-001)', async ({ page }) => {
  const TITULO = 'Prova de Banco de Dados remarcada'
  // Aluno Dois fica na 3B: mesmo semestre da 3A, outra turma — pega um destino largo demais.
  await alterarVinculo('aluno2.teste', TURMA_3B)
  expect(await avisosNoAplicativo('aluno.teste')).not.toContain(TITULO)

  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Novo aviso' }).click()
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await page.getByLabel('Título').fill(TITULO)
  await page.getByLabel('Conteúdo').fill('Nova data: sexta, 19h, Lab 4.')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()

  // A API registrou, com o destino escolhido.
  const [aviso] = await avisosNaApi()
  expect(aviso.titulo).toBe(TITULO)
  expect((aviso.destinos as { tipo: string; turma: { nome: string } }[]).map((d) => d.turma.nome)).toEqual(['TADS 3º Sem A'])

  // O aplicativo de quem está na turma recebe; o de quem não está, não.
  expect(await avisosNoAplicativo('aluno.teste')).toContain(TITULO)
  expect(await avisosNoAplicativo('aluno2.teste')).not.toContain(TITULO)
  expect(await avisosNoAplicativo('coord.teste')).not.toContain(TITULO)

  // E o painel da coordenação já conta o aviso.
  await page.getByRole('link', { name: 'Painel' }).click()
  await expect(page.getByRole('region', { name: 'Avisos ativos' }).getByText('1', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Avisos recentes' })).toContainText(TITULO)
})
