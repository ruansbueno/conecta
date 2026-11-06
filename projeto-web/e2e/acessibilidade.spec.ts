// T072 (RW-39, RW-40, SC-005): cada tela da gestão passa pelo axe nas regras WCAG 2.1 A e AA —
// contraste, nomes acessíveis, rótulos, cabeçalhos de tabela, ARIA de modais e abas. Os modais são
// auditados abertos. O que o axe não vê (ordem de foco, uso só com teclado) está em teclado.spec.ts.
import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

import { entrar, estaNaGestao, falharProxima, reiniciarApi } from './apoio'

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
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await auditar(page, 'confirmação de excluir')
  await page.keyboard.press('Escape')

  await page.getByRole('link', { name: 'Editar', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Salvar alterações' })).toBeVisible()
  await auditar(page, 'editar aviso')
})

test('estados vazio e de erro', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/avisos?situacao=agendado')
  await expect(page.getByText('Nenhum aviso agendado')).toBeVisible()
  await auditar(page, 'lista vazia')

  // Duas falhas: em desenvolvimento o StrictMode faz a primeira busca duas vezes.
  await falharProxima('GET', '/gestao/turmas', 500, 'ERRO_INTERNO', 2)
  await page.goto('/turmas')
  await expect(page.getByRole('button', { name: 'Tentar de novo' })).toBeVisible()
  await auditar(page, 'erro ao carregar')
})

test('coordenação: turmas, vínculos, solicitações', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/turmas')
  await expect(page.getByRole('table', { name: /Turmas/ })).toBeVisible()
  await auditar(page, 'turmas')
  await page.getByRole('button', { name: 'Nova turma' }).click()
  await expect(page.getByRole('dialog', { name: 'Nova turma' })).toBeVisible()
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
  await page.getByRole('button', { name: 'Editar turma' }).click()
  await expect(page.getByRole('dialog', { name: 'Editar turma' })).toBeVisible()
  await auditar(page, 'editar turma')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Desativar turma' }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await auditar(page, 'confirmação de desativar')
  await page.keyboard.press('Escape')

  await page.goto('/solicitacoes')
  await expect(page.getByRole('table', { name: /Solicitações/ })).toBeVisible()
  await auditar(page, 'solicitações')
  await page.getByRole('button', { name: /^Recusar/ }).first().click()
  await expect(page.getByRole('dialog', { name: /^Recusar a solicitação/ })).toBeVisible()
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
  await page.keyboard.press('Escape')

  // Pedidos de acesso (emenda de 06/11/2026): a aba, o modal de liberar e a confirmação de recusa.
  await page.goto('/usuarios?aba=aguardando')
  await expect(page.getByRole('table', { name: /Pedidos de acesso/ })).toBeVisible()
  await auditar(page, 'aguardando acesso')
  await page.getByRole('button', { name: /^Aprovar o acesso/ }).click()
  await expect(page.getByRole('dialog', { name: 'Liberar acesso' })).toBeVisible()
  await auditar(page, 'liberar acesso')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /^Recusar o acesso/ }).click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await auditar(page, 'recusar acesso')
})

test('docente: painel, listas, editor restrito e sem permissão', async ({ page }) => {
  await entrar(page, 'docente.teste')
  await estaNaGestao(page)
  await expect(page.getByText(/Você leciona em 2 turmas/)).toBeVisible()
  await auditar(page, 'painel do docente')
  await page.goto('/avisos/novo')
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await auditar(page, 'editor do docente')

  await page.goto('/avisos')
  await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible()
  await expect(page.getByText(/Nenhum aviso|Carregando/).or(page.getByRole('table', { name: /Avisos/ }))).toBeVisible()
  await auditar(page, 'avisos do docente')
  await page.goto('/turmas')
  await expect(page.getByRole('table', { name: /Turmas/ })).toBeVisible()
  await auditar(page, 'turmas do docente')
  await page.goto('/solicitacoes')
  await expect(page.getByRole('heading', { level: 1, name: /Solicitações/ })).toBeVisible()
  await expect(page.getByText('Carregando')).toHaveCount(0)
  await auditar(page, 'solicitações do docente')
  await page.goto('/usuarios')
  await expect(page.getByText('Esta área não está disponível para o seu perfil')).toBeVisible()
  await auditar(page, 'sem permissão do docente')
})

test('coordenação: agenda e horários (F2)', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.goto('/eventos')
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Semana acadêmica' })).toBeVisible()
  await auditar(page, 'agenda')
  await page.getByRole('tab', { name: 'Mês' }).click()
  await expect(page.getByRole('button', { name: 'Próximo mês' })).toBeVisible()
  await auditar(page, 'agenda — mês')
  await page.goto('/eventos/novo')
  await page.getByRole('button', { name: 'Criar evento' }).click()
  await expect(page.getByLabel('Título')).toBeFocused()
  await auditar(page, 'novo evento com erros')
  await page.goto('/eventos')
  await page.getByRole('link', { name: 'Histórico de “Semana acadêmica”' }).click()
  await expect(page.getByRole('list', { name: 'Linha do tempo' })).toBeVisible()
  await auditar(page, 'histórico do evento')

  await page.goto('/horarios')
  await expect(page.getByRole('list', { name: 'Turmas ativas' })).toBeVisible()
  await auditar(page, 'escolher turma')
  await page.getByRole('list', { name: 'Turmas ativas' }).getByRole('link', { name: /TADS-3B/ }).click()
  const grade = page.getByRole('table', { name: /grade semanal/i })
  await expect(grade).toBeVisible()
  await auditar(page, 'grade de horários')
  await grade.getByRole('button', { name: /^Algoritmos/ }).click()
  await expect(page.getByRole('dialog', { name: 'Editar aula' })).toBeVisible()
  await auditar(page, 'modal de aula')
  await page.getByRole('dialog').getByLabel('Local (opcional)').fill('Lab 4')
  await page.getByRole('dialog').getByLabel('Disciplina').fill('Algoritmos II')
  await page.getByRole('dialog').getByRole('button', { name: 'Salvar aula' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aula salva' })).toBeFocused()
  await auditar(page, 'grade com mensagem')
})
