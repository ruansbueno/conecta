// T097 (T13, RW-35, RW-36, RW-46): grade de horários de ponta a ponta contra o servidor falso.
import { expect, test } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

test('coordenação escolhe a turma, cria aula com conflito, edita, remove e segue para o aviso da turma', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Horários', exact: true }).click()
  await page.getByRole('list', { name: 'Turmas ativas' }).getByRole('link', { name: /TADS-3B/ }).click()

  const grade = page.getByRole('table', { name: /grade semanal/i })
  await expect(grade.getByRole('button', { name: /^Algoritmos 19:10–20:50/ })).toBeVisible()
  // A grade é de Horários na barra lateral.
  await expect(page.getByRole('link', { name: 'Horários', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Turmas', exact: true })).not.toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('banner')).toContainText('Horários')

  // Criar na célula vazia de quarta às 19:10, no Lab 5, que a TADS-3A usa: salva e avisa o choque
  await grade.getByRole('button', { name: 'Adicionar aula na quarta às 19:10' }).click()
  const modal = page.getByRole('dialog', { name: 'Nova aula' })
  await expect(modal.getByLabel('Dia')).toHaveValue('3')
  await modal.getByLabel('Fim').fill('20:50')
  await modal.getByLabel('Disciplina').fill('Estruturas de Dados')
  await modal.getByLabel('Local (opcional)').fill('LAB 5')
  await modal.getByLabel('Docente').selectOption({ label: 'Ricardo Lemos' })
  await modal.getByRole('button', { name: 'Salvar aula' }).click()
  const atencao = page.getByRole('status').filter({ hasText: 'choque de horário' })
  await expect(atencao).toBeFocused()
  await expect(atencao).toContainText('Sala Lab 5 também ocupada por TADS-3A-2026-2, quarta, 19:10–20:50.')
  await expect(grade.getByRole('button', { name: /^Estruturas de Dados 19:10–20:50 LAB 5 · Ricardo Lemos/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Docentes nesta grade' })).toContainText('Ricardo Lemos')

  // Editar: muda o horário de fim, sem choque
  await grade.getByRole('button', { name: /^Estruturas de Dados/ }).click()
  await page.getByRole('dialog', { name: 'Editar aula' }).getByLabel('Local (opcional)').fill('Sala 210')
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar aula' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aula salva.' })).toBeVisible()
  await expect(grade.getByRole('button', { name: /^Estruturas de Dados 19:10–20:50 Sala 210/ })).toBeVisible()

  // Remover, com confirmação
  await grade.getByRole('button', { name: /^Estruturas de Dados/ }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Remover aula' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }).click()
  const removida = page.getByRole('status').filter({ hasText: 'Aula removida.' })
  await expect(removida).toBeVisible()
  await expect(grade.getByRole('button', { name: /^Estruturas de Dados/ })).toHaveCount(0)

  // Segue para o aviso, com a turma já como destino
  await removida.getByRole('link', { name: 'Criar aviso para a TADS-3B-2026-2' }).click()
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await expect(page.getByRole('list', { name: 'Destinos escolhidos' })).toContainText('TADS 3º Sem B')

  // A última turma aberta é oferecida primeiro
  await page.goto('/horarios')
  await expect(page.getByRole('link', { name: /Continuar em TADS-3B/ })).toBeVisible()
})

test('docente não vê Horários e a rota leva à tela sem permissão', async ({ page }) => {
  await entrar(page, 'docente.teste')
  await estaNaGestao(page)
  await expect(page.getByRole('link', { name: 'Horários', exact: true })).toHaveCount(0)
  await page.goto('/horarios')
  await expect(page).toHaveURL(/\/sem-permissao/)
})
