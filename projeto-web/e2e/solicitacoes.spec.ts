import { expect, test, type Page } from '@playwright/test'

import { alterarVinculo, entrar, estaNaGestao, reiniciarApi } from './apoio'

const TURMA_3A = '00000000-0000-4000-8000-000000000001'
const TURMA_5A = '00000000-0000-4000-8000-000000000004'

test.beforeEach(async () => {
  await reiniciarApi()
})

async function abrirFila(page: Page, usuario = 'coord.teste') {
  await entrar(page, usuario)
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Solicitações' }).click()
  await expect(page.getByRole('table', { name: /Solicitações/ })).toBeVisible()
}

const linha = (page: Page, aluno: string, turma: string) =>
  page.getByRole('row').filter({ hasText: aluno }).filter({ hasText: turma })
const status = (page: Page, texto: string) => expect(page.getByRole('status').filter({ hasText: texto })).toBeVisible()

test('aprovar cria o vínculo; recusar registra o motivo', async ({ page }) => {
  await abrirFila(page)
  await expect(page.getByRole('tab', { name: 'Pendentes (3)' })).toBeVisible()
  await expect(linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem B')).toContainText(/há 5 dias/)
  await expect(page.getByText('1 solicitação esperando há mais de 3 dias')).toBeVisible()

  // Aprovar
  await linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem B').getByRole('button', { name: 'Aprovar Aluno Dois de Teste' }).click()
  await status(page, 'Aluno Dois de Teste agora está em TADS 3º Sem B.')
  await expect(linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem B')).toContainText('Aprovada')
  await expect(linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem B')).toContainText('por Marina Duarte')
  await expect(page.getByRole('tab', { name: 'Pendentes (2)' })).toBeVisible()

  // O vínculo existe na turma, com a origem certa
  await page.getByRole('link', { name: 'Turmas' }).click()
  await page.getByRole('row', { name: /TADS-3B/ }).getByRole('link', { name: /^Vínculos de/ }).click()
  await expect(page.getByRole('row', { name: /Aluno Dois de Teste/ })).toContainText('Solicitação aprovada')

  // Recusar com motivo
  await page.getByRole('link', { name: 'Solicitações' }).click()
  await linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem A').getByRole('button', { name: 'Recusar Aluno Dois de Teste' }).click()
  const dialogo = page.getByRole('dialog', { name: 'Recusar a solicitação de Aluno Dois de Teste?' })
  await dialogo.getByLabel('Motivo (opcional)').fill('Turma completa neste semestre')
  await dialogo.getByRole('button', { name: 'Recusar solicitação' }).click()
  await status(page, 'Solicitação de Aluno Dois de Teste recusada.')

  await page.getByRole('tab', { name: 'Recusadas' }).click()
  await expect(linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem A')).toContainText('Motivo: Turma completa neste semestre')
})

test('decidir uma solicitação que outra pessoa acabou de decidir (409)', async ({ page, browser }) => {
  await abrirFila(page)

  // Na outra aba, a administração aprova primeiro.
  const outra = await (await browser.newContext()).newPage()
  await abrirFila(outra, 'admin.teste')
  await linha(outra, 'Aluno Dois de Teste', 'TADS 3º Sem B').getByRole('button', { name: 'Aprovar Aluno Dois de Teste' }).click()
  await status(outra, 'agora está em TADS 3º Sem B')
  await outra.close()

  await linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem B').getByRole('button', { name: 'Recusar Aluno Dois de Teste' }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Recusar solicitação' }).click()

  await expect(page.getByRole('alert')).toHaveText('Esta solicitação já foi decidida.')
  await expect(linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem B')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'Pendentes (2)' })).toBeVisible()
})

test('docente decide só nas turmas em que leciona (403 ao perder o vínculo)', async ({ page }) => {
  await abrirFila(page, 'docente.teste')
  // Vê as das turmas 3A e 5A; não vê a da 3B.
  await expect(page.getByRole('tab', { name: 'Pendentes (2)' })).toBeVisible()
  await expect(linha(page, 'Aluno Dois de Teste', 'TADS 3º Sem B')).toHaveCount(0)

  await alterarVinculo('docente.teste', TURMA_5A, true)
  await linha(page, 'Aluno de Teste', 'TADS 5º Sem A').getByRole('button', { name: 'Aprovar Aluno de Teste' }).click()

  await expect(page.getByRole('alert')).toHaveText('Você só pode decidir as solicitações das turmas em que leciona.')
  await expect(linha(page, 'Aluno de Teste', 'TADS 5º Sem A')).toHaveCount(0)
  void TURMA_3A
})
