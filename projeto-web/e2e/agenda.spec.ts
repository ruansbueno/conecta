// T096 (T12, RW-33, RW-34): agenda de ponta a ponta contra o servidor falso do contrato da E3.
import { expect, test, type Page } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

const TITULO = 'Banca de TCC — Turma 3A'

test.beforeEach(async () => {
  await reiniciarApi()
})

/** Dia `dia` do mês seguinte, como `datetime-local` aceita, e o mês na URL (`YYYY-MM`). */
function noProximoMes(dia: number, hora: string) {
  const d = new Date()
  const alvo = new Date(d.getFullYear(), d.getMonth() + 1, dia)
  const mm = String(alvo.getMonth() + 1).padStart(2, '0')
  return { valor: `${alvo.getFullYear()}-${mm}-${String(dia).padStart(2, '0')}T${hora}`, mes: `${alvo.getFullYear()}-${mm}`, data: alvo }
}

const cartao = (page: Page, titulo = TITULO) => page.getByRole('listitem').filter({ has: page.getByRole('heading', { name: titulo }) })

async function linhaDoTempo(page: Page) {
  return page.getByRole('list', { name: 'Linha do tempo' }).getByRole('heading', { level: 3 })
}

test('coordenação cria, edita, arquiva, desarquiva e exclui um evento, com o histórico', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Agenda', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Agenda' })).toBeVisible()

  // Criar, de vários dias, para a turma
  const inicio = noProximoMes(10, '14:00')
  const fim = noProximoMes(12, '18:00')
  await page.getByRole('link', { name: 'Novo evento' }).click()
  await page.getByLabel('Título').fill(TITULO)
  await page.getByLabel('Tipo').selectOption('banca')
  await page.getByLabel('Início').fill(inicio.valor)
  await page.getByLabel('Fim').fill(fim.valor)
  await page.getByLabel('Local').fill('Sala 203')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()
  await page.getByRole('button', { name: 'Criar evento' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Evento criado.' })).toBeVisible()
  await expect(cartao(page)).toContainText('Sala 203')

  // O mês mostra o evento de vários dias em cada um dos dias
  await page.goto(`/eventos?aba=mes&mes=${inicio.mes}`)
  const mes = page.getByRole('table', { name: new RegExp(inicio.data.toLocaleDateString('pt-BR', { month: 'long' }), 'i') })
  for (const dia of [10, 11, 12]) {
    const nome = new Date(inicio.data.getFullYear(), inicio.data.getMonth(), dia).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    await expect(mes.getByRole('button', { name: new RegExp(`^${nome}`) })).toContainText(TITULO)
  }
  const nome13 = new Date(inicio.data.getFullYear(), inicio.data.getMonth(), 13).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
  await expect(mes.getByRole('button', { name: new RegExp(`^${nome13}`) })).not.toContainText(TITULO)

  // Editar
  await page.goto('/eventos')
  await page.getByRole('link', { name: `Editar “${TITULO}”` }).click()
  await page.getByLabel('Local').fill('Auditório')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Evento salvo.' })).toBeVisible()
  await expect(cartao(page)).toContainText('Auditório')

  // Arquivar (com confirmação) e desarquivar (direto)
  await page.getByRole('button', { name: `Arquivar “${TITULO}”` }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Arquivar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Evento arquivado.' })).toBeVisible()
  await expect(cartao(page)).toHaveCount(0)
  await page.getByRole('tab', { name: 'Arquivados' }).click()
  await page.getByRole('button', { name: `Desarquivar “${TITULO}”` }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Evento desarquivado.' })).toBeVisible()

  // Histórico: uma entrada por operação
  await page.goto('/eventos')
  await page.getByRole('link', { name: `Histórico de “${TITULO}”` }).click()
  await expect(await linhaDoTempo(page)).toHaveText(['Evento desarquivado', 'Evento arquivado', 'Evento editado', 'Evento criado'])

  // Excluir, no detalhe
  await page.getByRole('button', { name: 'Excluir' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Evento excluído.' })).toBeVisible()
  await expect(cartao(page)).toHaveCount(0)
})

test('docente cria só para as turmas em que leciona e vê só os seus eventos', async ({ page }) => {
  await entrar(page, 'docente.teste')
  await estaNaGestao(page)
  await expect(page.getByRole('link', { name: 'Horários' })).toHaveCount(0)
  await page.getByRole('link', { name: 'Agenda', exact: true }).click()
  await page.getByRole('link', { name: 'Novo evento' }).click()
  await expect(page.getByRole('button', { name: 'Adicionar destino' })).toHaveCount(0)
  await expect(page.getByRole('checkbox', { name: /TADS-3A/ })).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: /TADS-5A/ })).toBeEnabled()
  await expect(page.getByRole('checkbox', { name: /TADS-3B/ })).toHaveCount(0)

  await page.getByLabel('Título').fill('Prova substitutiva')
  await page.getByLabel('Tipo').selectOption('prova')
  await page.getByLabel('Início').fill(noProximoMes(5, '19:10').valor)
  await page.getByRole('checkbox', { name: /TADS-3A/ }).check()
  await page.getByRole('button', { name: 'Criar evento' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Evento criado.' })).toBeVisible()
  await expect(cartao(page, 'Prova substitutiva')).toBeVisible()
  // O que a coordenação criou não aparece para o docente.
  await expect(cartao(page, 'Palestra: carreira em TI')).toHaveCount(0)
})

test('descartar a edição volta para onde se estava, sem repetir o endereço no histórico do navegador', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Agenda', exact: true }).click()
  await page.getByRole('link', { name: 'Palestra: carreira em TI', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Palestra: carreira em TI' })).toBeVisible()
  const detalhe = page.url()

  await page.getByRole('link', { name: 'Editar', exact: true }).click()
  await page.getByLabel('Local').fill('Outro lugar')
  await page.getByRole('button', { name: 'Descartar' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Descartar' }).click()
  await expect(page).toHaveURL(detalhe)

  // Voltar sai do detalhe para a agenda: nem o editor descartado nem o mesmo detalhe de novo.
  await page.goBack()
  await expect(page).toHaveURL(/\/eventos$/)
})

test.describe('fuso com horário de verão', () => {
  test.use({ timezoneId: 'America/New_York' })

  test('hora que não existe no fuso é recusada no campo, sem virar outra hora', async ({ page }) => {
    await entrar(page, 'coord.teste')
    await estaNaGestao(page)
    await page.goto('/eventos/novo')
    await page.getByLabel('Título').fill('Evento na madrugada da mudança')
    await page.getByLabel('Tipo').selectOption('outro')
    // 14/03/2027: em Nova York o relógio pula de 02:00 para 03:00.
    await page.getByLabel('Início').fill('2027-03-14T02:30')
    await page.getByRole('button', { name: 'Criar evento' }).click()
    await expect(page.getByText('Este horário não existe neste fuso por causa do horário de verão. Escolha outro.')).toBeVisible()
    await expect(page.getByLabel('Início')).toHaveAttribute('aria-invalid', 'true')
    await expect(page).toHaveURL(/\/eventos\/novo$/)
  })
})
