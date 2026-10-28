// T072 (RW-39, RW-40, SC-005): cada tela da gestão passa pelo axe nas regras WCAG 2.1 A e AA —
// contraste, nomes acessíveis, rótulos, cabeçalhos de tabela, ARIA de modais e abas. Os modais são
// auditados abertos. O que o axe não vê (ordem de foco, uso só com teclado) está em teclado.spec.ts.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

async function auditar(page: Page, tela: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  const resumo = violations.map((v) => `${tela}: ${v.id} (${v.impact}) — ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`)
  expect(resumo, resumo.join('\n')).toEqual([])
}

async function publicarAviso(page: Page, titulo: string) {
  await page.goto('/avisos/novo')
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await page.getByLabel('Título').fill(titulo)
  await page.getByLabel('Conteúdo').fill('Conteúdo do aviso de teste.')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
}

test('login e sem permissão', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('heading', { name: 'Acesso à gestão' })).toBeVisible()
  await auditar(page, 'login')

  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.getByText('Informe o usuário.')).toBeVisible()
  await auditar(page, 'login com erros')

  await entrar(page, 'aluno.teste')
  await expect(page.getByRole('heading', { name: /gestão é para administração/ })).toBeVisible()
  await auditar(page, 'sem permissão')
})

test('coordenação: painel, avisos, editor, seletor, histórico', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await expect(page.getByRole('region', { name: 'Turmas ativas' }).getByText('4', { exact: true })).toBeVisible()
  await auditar(page, 'painel da coordenação')

  await page.goto('/avisos/novo')
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await auditar(page, 'editor')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await expect(page.getByRole('dialog', { name: 'Adicionar destino' })).toBeVisible()
  await auditar(page, 'seletor de destinos')
  await page.keyboard.press('Escape')

  await publicarAviso(page, 'Aviso para auditoria')
  await expect(page.getByRole('table', { name: /Avisos/ })).toBeVisible()
  await auditar(page, 'lista de avisos')

  await page.getByRole('link', { name: 'Aviso para auditoria', exact: true }).click()
  await page.getByRole('tab', { name: 'Histórico e versões' }).click()
  await expect(page.getByRole('list', { name: 'Linha do tempo' })).toBeVisible()
  await auditar(page, 'histórico e versões')
  await page.getByRole('button', { name: 'Arquivar' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await auditar(page, 'confirmação de arquivar')
})

test('coordenação: turmas, vínculos, solicitações', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/turmas')
  await expect(page.getByRole('table', { name: /Turmas/ })).toBeVisible()
  await auditar(page, 'turmas')
  await page.getByRole('button', { name: 'Nova turma' }).click()
  await auditar(page, 'formulário de turma')
  await page.keyboard.press('Escape')

  await page.getByRole('row', { name: /TADS-3A/ }).getByRole('link', { name: /^Vínculos de/ }).click()
  await expect(page.getByRole('table', { name: /Vínculos/ })).toBeVisible()
  await auditar(page, 'detalhe da turma')
  await page.getByRole('button', { name: 'Vincular aluno' }).click()
  await page.getByRole('dialog').getByRole('searchbox').fill('aluno')
  await expect(page.getByRole('dialog').getByRole('radiogroup')).toBeVisible()
  await auditar(page, 'vincular')
  await page.keyboard.press('Escape')

  await page.goto('/solicitacoes')
  await expect(page.getByRole('table', { name: /Solicitações/ })).toBeVisible()
  await auditar(page, 'solicitações')
  await page.getByRole('button', { name: /^Recusar/ }).first().click()
  await auditar(page, 'recusar solicitação')
})

test('administração: usuários e alterar perfil', async ({ page }) => {
  await entrar(page, 'admin.teste')
  await estaNaGestao(page)
  await page.goto('/usuarios')
  await expect(page.getByRole('table', { name: /Usuários/ })).toBeVisible()
  await auditar(page, 'usuários')
  await page.getByRole('button', { name: 'Alterar perfil de Ricardo Lemos' }).click()
  await expect(page.getByRole('radiogroup', { name: 'Perfil de acesso' })).toBeVisible()
  await auditar(page, 'alterar perfil')
})

test('docente: painel e editor restrito', async ({ page }) => {
  await entrar(page, 'docente.teste')
  await estaNaGestao(page)
  await expect(page.getByText(/Você leciona em 2 turmas/)).toBeVisible()
  await auditar(page, 'painel do docente')
  await page.goto('/avisos/novo')
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await auditar(page, 'editor do docente')
})
