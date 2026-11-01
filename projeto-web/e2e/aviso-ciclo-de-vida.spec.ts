import { expect, test, type Page } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

const TITULO = 'Reunião de colegiado'

test.beforeEach(async () => {
  await reiniciarApi()
})

async function aba(page: Page, nome: string) {
  await page.getByRole('tab', { name: nome }).click()
  await expect(page.getByRole('tab', { name: nome })).toHaveAttribute('aria-selected', 'true')
}

const linha = (page: Page) => page.getByRole('row', { name: new RegExp(TITULO) })

async function eventos(page: Page) {
  await page.getByRole('tab', { name: 'Histórico e versões' }).click()
  return page.getByRole('list', { name: 'Linha do tempo' }).getByRole('heading', { level: 3 })
}

test('criar, editar, arquivar, desarquivar e excluir: um evento por operação e cada filtro certo (SC-007)', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await estaNaGestao(page)

  // Criar
  await page.getByRole('link', { name: 'Avisos', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Avisos' })).toBeVisible()
  await page.getByRole('link', { name: 'Novo aviso' }).click()
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await page.getByLabel('Título').fill(TITULO)
  await page.getByLabel('Conteúdo').fill('Sexta, 19h, no auditório.')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('tab', { name: 'Grupos' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Docentes' }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  await expect(linha(page)).toContainText('versão 1')

  await linha(page).getByRole('link', { name: TITULO, exact: true }).click()
  await expect(await eventos(page)).toHaveText(['Aviso criado'])

  // Editar
  await page.getByRole('link', { name: 'Editar', exact: true }).click()
  await page.getByLabel('Título').fill(`${TITULO} — nova sala`)
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Alterações salvas. Esta é a versão 2.' })).toBeVisible()
  await expect(await eventos(page)).toHaveText(['Aviso editado', 'Aviso criado'])
  await expect(page.getByRole('deletion')).toContainText(TITULO)
  await expect(page.getByRole('insertion')).toContainText(`${TITULO} — nova sala`)
  await expect(page.getByRole('region', { name: 'Versões' }).getByRole('button', { name: /Versão 2.*Atual/ })).toBeVisible()

  // Arquivar (com confirmação)
  await page.getByRole('button', { name: 'Arquivar' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Arquivar' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso arquivado.' })).toBeVisible()
  await expect(await eventos(page)).toHaveText(['Aviso arquivado', 'Aviso editado', 'Aviso criado'])

  await page.getByRole('link', { name: 'Voltar aos avisos' }).click()
  await expect(page.getByText('Nenhum aviso ativo')).toBeVisible()
  await aba(page, 'Arquivados')
  await expect(linha(page)).toBeVisible()

  // Desarquivar (direto, pela linha)
  await linha(page).getByRole('button', { name: /^Desarquivar/ }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso desarquivado.' })).toBeVisible()
  await expect(page.getByText('Nenhum aviso arquivado')).toBeVisible()
  await aba(page, 'Ativos')
  await expect(linha(page)).toBeVisible()

  // Excluir (com confirmação, pelo detalhe)
  await linha(page).getByRole('link', { name: `${TITULO} — nova sala`, exact: true }).click()
  await page.getByRole('button', { name: 'Excluir' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Excluir' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso excluído.' })).toBeVisible()
  await expect(page.getByText('Nenhum aviso ativo')).toBeVisible()

  // Excluído continua auditável pela coordenação
  await aba(page, 'Excluídos')
  await expect(linha(page)).toContainText('mantido para auditoria')
  await linha(page).getByRole('link', { name: /^Histórico de/ }).click()
  await expect(page.getByRole('list', { name: 'Linha do tempo' }).getByRole('heading', { level: 3 })).toHaveText([
    'Aviso excluído',
    'Aviso desarquivado',
    'Aviso arquivado',
    'Aviso editado',
    'Aviso criado',
  ])
  await expect(page.getByRole('button', { name: 'Excluir' })).toHaveCount(0)
})

test('docente vê só os seus avisos e não tem a aba Excluídos', async ({ page }) => {
  await entrar(page, 'coord.teste')
  await page.waitForURL(/\/painel$/)
  await page.goto('/avisos/novo')
  await expect(page.getByRole('heading', { name: 'Novo aviso' })).toBeVisible()
  await page.getByLabel('Título').fill('Aviso da coordenação')
  await page.getByLabel('Conteúdo').fill('Só para docentes.')
  await page.getByRole('button', { name: 'Adicionar destino' }).click()
  await page.getByRole('dialog').getByRole('tab', { name: 'Grupos' }).click()
  await page.getByRole('dialog').getByRole('checkbox', { name: 'Docentes' }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Adicionar 1 destino' }).click()
  await page.getByRole('button', { name: 'Publicar aviso' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aviso publicado.' })).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.waitForURL(/\/login$/)

  await entrar(page, 'docente.teste')
  await page.waitForURL(/\/painel$/)
  await page.getByRole('link', { name: 'Meus avisos' }).click()
  await expect(page.getByText('Nenhum aviso ativo')).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Excluídos' })).toHaveCount(0)
})

test('servidor falso: "publicar agora" num agendado grava a hora da publicação, como a API (D-E2-6)', async () => {
  const API = 'http://localhost:8787'
  const login = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'coord.teste', password: 'senha-teste' }),
  })
  const { access_token } = (await login.json()) as { access_token: string }
  const chamar = async (metodo: string, caminho: string, corpo: unknown) => {
    const r = await fetch(`${API}${caminho}`, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
      body: JSON.stringify(corpo),
    })
    return { status: r.status, corpo: (await r.json()) as Record<string, unknown> }
  }
  const amanha = new Date(Date.now() + 86_400_000).toISOString()
  const criado = await chamar('POST', '/gestao/avisos', { titulo: TITULO, conteudo: 'Pauta.', publicar_em: amanha, destinos: [{ tipo: 'docentes' }] })
  const id = criado.corpo.id as string

  // Recusado: nada muda; o aviso continua agendado e pode ser reagendado.
  expect((await chamar('PATCH', `/gestao/avisos/${id}`, { titulo: 'x', publicar_em: null })).status).toBe(422)
  const depoisDaRecusa = await chamar('PATCH', `/gestao/avisos/${id}`, { publicar_em: new Date(Date.now() + 2 * 86_400_000).toISOString() })
  expect(depoisDaRecusa.status).toBe(200)

  const antes = Date.now()
  const agora = await chamar('PATCH', `/gestao/avisos/${id}`, { publicar_em: null })
  expect(agora.status).toBe(200)
  // A API grava a hora da publicação em publicar_em (não cai na data de criação), e publicado_em é a mesma.
  const publicadoEm = new Date(agora.corpo.publicado_em as string).getTime()
  expect(publicadoEm).toBeGreaterThanOrEqual(antes - 1000)
  expect(publicadoEm).toBeLessThanOrEqual(Date.now() + 1000)
  expect(agora.corpo.publicar_em).toBe(agora.corpo.publicado_em)
  const historico = await fetch(`${API}/gestao/avisos/${id}/historico`, { headers: { Authorization: `Bearer ${access_token}` } })
  const [ultimo] = ((await historico.json()) as { items: { alteracoes: Record<string, { para: unknown }> }[] }).items
  expect(ultimo.alteracoes.publicar_em.para).toBe(agora.corpo.publicado_em)
})
