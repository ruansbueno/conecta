// T073 (SC-004): do login à exclusão de um aviso, e os demais diálogos (confirmação, vincular,
// recusar, alterar perfil), só com o teclado — nenhum clique depois de abrir a página. Também confere que o foco é visível (contorno) e que, ao fechar
// um diálogo, ele volta ao botão que o abriu.
import { expect, test, type Page } from '@playwright/test'

import { avisosNaApi, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

/** Aperta Tab até o foco chegar no elemento (ou falha), como uma pessoa faria. */
async function tabAte(page: Page, alvo: ReturnType<Page['getByRole']>, limite = 40) {
  for (let i = 0; i < limite; i++) {
    if (await alvo.evaluate((el) => el === document.activeElement).catch(() => false)) return
    await page.keyboard.press('Tab')
  }
  throw new Error('o foco não chegou ao elemento só com Tab')
}

async function focoVisivel(page: Page) {
  const contorno = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    const s = getComputedStyle(el)
    return s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0
  })
  expect(contorno, 'o elemento com foco precisa de contorno visível').toBe(true)
}

async function entrarComTeclado(page: Page, usuario: string) {
  await page.goto('/login')
  await tabAte(page, page.getByLabel('Usuário'))
  await page.keyboard.type(usuario)
  await page.keyboard.press('Tab')
  await page.keyboard.type('senha-teste')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/painel$/)
}

test('do login à exclusão de um aviso, só com o teclado', async ({ page }) => {
  await entrarComTeclado(page, 'coord.teste')

  // Navegação: barra lateral até Avisos
  await tabAte(page, page.getByRole('link', { name: 'Avisos', exact: true }))
  await focoVisivel(page)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible()

  // Abas da lista com as setas
  await tabAte(page, page.getByRole('tab', { name: 'Ativos' }))
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Agendados' })).toBeFocused()
  await expect(page.getByRole('tab', { name: 'Agendados' })).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('ArrowLeft')

  // Novo aviso
  await tabAte(page, page.getByRole('link', { name: 'Novo aviso' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await tabAte(page, page.getByLabel('Título'))
  await page.keyboard.type('Aviso feito só com o teclado')
  await page.keyboard.press('Tab')
  await page.keyboard.type('Sem mouse do começo ao fim.')

  // Seletor de destinos (modal): abre, troca de aba com setas, marca com espaço, confirma
  const adicionar = page.getByRole('button', { name: 'Adicionar destino' })
  await tabAte(page, adicionar)
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: 'Adicionar destino' })
  await expect(dialogo).toBeVisible()
  await tabAte(page, dialogo.getByRole('tab', { name: 'Turmas' }))
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(dialogo.getByRole('tab', { name: 'Grupos' })).toBeFocused()
  await tabAte(page, dialogo.getByRole('checkbox', { name: 'Docentes' }))
  await page.keyboard.press('Space')
  await tabAte(page, dialogo.getByRole('button', { name: 'Adicionar 1 destino' }))
  await page.keyboard.press('Enter')
  await expect(dialogo).toBeHidden()
  await expect(adicionar).toBeFocused() // o foco volta a quem abriu o diálogo

  // Publicar
  await tabAte(page, page.getByRole('button', { name: 'Publicar aviso' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  expect((await avisosNaApi())[0].titulo).toBe('Aviso feito só com o teclado')

  // Abrir o aviso e excluí-lo, com a confirmação
  await tabAte(page, page.getByRole('link', { name: 'Aviso feito só com o teclado', exact: true }))
  await focoVisivel(page)
  await page.keyboard.press('Enter')
  const excluir = page.getByRole('button', { name: 'Excluir' })
  await tabAte(page, excluir)
  await page.keyboard.press('Enter')
  const confirmacao = page.getByRole('alertdialog')
  await expect(confirmacao).toBeVisible()
  await tabAte(page, confirmacao.getByRole('button', { name: 'Excluir' }))
  await focoVisivel(page)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Aviso excluído.' })).toBeFocused()
  expect((await avisosNaApi())[0].situacao).toBe('excluido')
})

test('confirmação: Esc cancela e devolve o foco; Enter confirma', async ({ page }) => {
  await entrarComTeclado(page, 'coord.teste')

  // Uma turma qualquer: desativar pede confirmação.
  await tabAte(page, page.getByRole('link', { name: 'Turmas', exact: true }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('table', { name: /Turmas/ })).toBeVisible()
  await tabAte(page, page.getByRole('link', { name: /^Vínculos de TADS-3B/ }))
  await page.keyboard.press('Enter')
  const desativar = page.getByRole('button', { name: 'Desativar turma' })
  await tabAte(page, desativar)

  await page.keyboard.press('Enter')
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('alertdialog')).toBeHidden()
  await expect(desativar).toBeFocused()

  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('alertdialog').getByRole('button', { name: 'Desativar turma' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Turma desativada.' })).toBeVisible()
  await expect(page.getByRole('status')).toBeFocused() // a mensagem recebe o foco
})

test('vincular: busca, escolha no grupo de rádios e confirmação, só com o teclado', async ({ page }) => {
  await entrarComTeclado(page, 'coord.teste')
  await tabAte(page, page.getByRole('link', { name: 'Turmas', exact: true }))
  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('link', { name: /^Vínculos de TADS-3B/ }))
  await page.keyboard.press('Enter')
  const abrir = page.getByRole('button', { name: 'Vincular docente' })
  await tabAte(page, abrir)
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: 'Vincular docente' })
  await tabAte(page, dialogo.getByRole('searchbox'))
  await page.keyboard.type('ricardo')
  const ricardo = dialogo.getByRole('radio', { name: /Ricardo Lemos/ })
  await tabAte(page, ricardo)
  await focoVisivel(page)
  await page.keyboard.press('Space')
  await expect(ricardo).toBeChecked()
  await tabAte(page, dialogo.getByRole('button', { name: 'Vincular' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Ricardo Lemos agora está na turma como docente.' })).toBeFocused()
})

test('recusar com motivo, só com o teclado', async ({ page }) => {
  await entrarComTeclado(page, 'coord.teste')
  await tabAte(page, page.getByRole('link', { name: /^Solicitações/ }))
  await page.keyboard.press('Enter')
  const recusar = page.getByRole('button', { name: 'Recusar Aluno Dois de Teste em TADS 3º Sem A' })
  await tabAte(page, recusar)
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: 'Recusar a solicitação de Aluno Dois de Teste?' })
  await tabAte(page, dialogo.getByLabel('Motivo (opcional)'))
  await page.keyboard.type('Turma completa')
  await tabAte(page, dialogo.getByRole('button', { name: 'Recusar solicitação' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Solicitação de Aluno Dois de Teste recusada.' })).toBeFocused()
})

test('alterar perfil: setas no grupo de rádios e salvar, só com o teclado', async ({ page }) => {
  await entrarComTeclado(page, 'admin.teste')
  // "Usuários" ou "Usuários 1 pendente": há um pedido de acesso aguardando na massa.
  await tabAte(page, page.getByRole('link', { name: /^Usuários/ }))
  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('button', { name: 'Alterar perfil de Marina Duarte' }), 80)
  await page.keyboard.press('Enter')
  const dialogo = page.getByRole('dialog', { name: 'Alterar perfil de acesso' })
  const grupo = dialogo.getByRole('radiogroup', { name: 'Perfil de acesso' })
  await tabAte(page, grupo.getByRole('radio', { checked: true }))
  await focoVisivel(page)
  const docente = grupo.getByRole('radio', { name: 'Docente' })
  for (let i = 0; i < 4 && !(await docente.isChecked()); i++) await page.keyboard.press('ArrowDown')
  await expect(docente).toBeChecked()
  await expect(docente).toBeFocused()
  await tabAte(page, dialogo.getByRole('button', { name: 'Salvar perfil' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Marina Duarte agora tem o perfil Docente.' })).toBeFocused()
})

test('agenda: abas e calendário só com o teclado (F2)', async ({ page }) => {
  await entrarComTeclado(page, 'coord.teste')
  await tabAte(page, page.getByRole('link', { name: 'Agenda', exact: true }))
  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('tab', { name: 'Próximos' }))
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Mês' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tab', { name: 'Mês' })).toHaveAttribute('aria-selected', 'true')
  const proximo = page.getByRole('button', { name: 'Próximo mês' })
  await tabAte(page, proximo)
  await focoVisivel(page)
  const dia = page.getByRole('button', { name: /^15 de / })
  await tabAte(page, dia, 60)
  await page.keyboard.press('Enter')
  await expect(dia).toHaveAttribute('aria-pressed', 'true')
})

test('horários: nova aula na célula, Esc devolve o foco, salvar e remover só com o teclado (F2)', async ({ page }) => {
  await entrarComTeclado(page, 'coord.teste')
  await tabAte(page, page.getByRole('link', { name: 'Horários', exact: true }))
  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('link', { name: /TADS-3B/ }))
  await page.keyboard.press('Enter')

  const celula = page.getByRole('button', { name: 'Adicionar aula na terça às 19:10' })
  await tabAte(page, celula)
  await focoVisivel(page)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Nova aula' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(celula).toBeFocused()

  await page.keyboard.press('Enter')
  const modal = page.getByRole('dialog', { name: 'Nova aula' })
  // O campo de hora do Chromium tem segmentos próprios e depende da língua do sistema: o valor
  // entra com fill (sem mouse), o resto do fluxo é só teclado.
  await tabAte(page, modal.getByLabel('Fim'))
  await modal.getByLabel('Fim').fill('20:50')
  await tabAte(page, modal.getByLabel('Disciplina'))
  await page.keyboard.type('Cálculo')
  await tabAte(page, modal.getByRole('button', { name: 'Salvar aula' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Aula salva.' })).toBeFocused()

  const aula = page.getByRole('button', { name: /^Cálculo 19:10–20:50/ })
  await tabAte(page, aula)
  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('dialog').getByRole('button', { name: 'Remover aula' }))
  await page.keyboard.press('Enter')
  await tabAte(page, page.getByRole('alertdialog').getByRole('button', { name: 'Remover' }))
  await page.keyboard.press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Aula removida.' })).toBeFocused()
})
