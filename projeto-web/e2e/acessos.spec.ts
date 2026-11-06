// Pedidos de acesso de servidores (emenda de 06/11/2026; RW-50, RW-51): o 1º login de um servidor
// pela API do IFSul fica aguardando; a gestão libera com um perfil ou recusa.
import { expect, test, type Page } from '@playwright/test'

import { entrar, estaNaGestao, reiniciarApi } from './apoio'

test.beforeEach(async () => {
  await reiniciarApi()
})

const AGUARDANDO = 'Seu acesso está aguardando liberação da coordenação ou da administração.'

async function abrirAguardando(page: Page, usuario: string) {
  await entrar(page, usuario)
  await estaNaGestao(page)
  await page.getByRole('link', { name: 'Usuários 1 pendente' }).click()
  await page.getByRole('tab', { name: 'Aguardando acesso' }).click()
  await expect(page.getByRole('table', { name: /Pedidos de acesso/ })).toBeVisible()
}

test('quem aguarda vê o aviso no login e não entra', async ({ page }) => {
  await entrar(page, 'servidor.aguardando')

  await expect(page.getByRole('alert')).toHaveText(AGUARDANDO)
  await expect(page.getByRole('heading', { name: 'Acesso à gestão' })).toBeVisible()
})

test('administração libera como docente; a pessoa entra e o contador some', async ({ page, browser }) => {
  await abrirAguardando(page, 'admin.teste')
  const linha = page.getByRole('row', { name: /Servidor Aguardando de Teste/ })
  await expect(linha).toContainText('servidor.aguardando@ifsul.edu.br')

  await linha.getByRole('button', { name: /Aprovar/ }).click()
  const dialogo = page.getByRole('dialog', { name: 'Liberar acesso' })
  await expect(dialogo.getByRole('radio')).toHaveCount(4)
  await dialogo.getByRole('radio', { name: 'Docente' }).check()
  await dialogo.getByRole('button', { name: 'Liberar acesso' }).click()

  await expect(
    page.getByRole('status').filter({ hasText: 'Servidor Aguardando de Teste agora tem acesso como Docente.' }),
  ).toBeVisible()
  await expect(page.getByText('Nenhum pedido de acesso')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toBeVisible()

  const servidor = await (await browser.newContext()).newPage()
  await entrar(servidor, 'servidor.aguardando')
  await estaNaGestao(servidor)
  await expect(servidor.getByRole('link', { name: 'Meus avisos' })).toBeVisible()
})

test('coordenação recusa; o recusado aparece em Recusados, sem ações, e não entra', async ({ page, browser }) => {
  await abrirAguardando(page, 'coord.teste')

  await page.getByRole('row', { name: /Servidor Aguardando de Teste/ }).getByRole('button', { name: /Recusar/ }).click()
  const confirmacao = page.getByRole('alertdialog', { name: 'Recusar o acesso de Servidor Aguardando de Teste?' })
  await confirmacao.getByRole('button', { name: 'Recusar acesso' }).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Pedido de acesso de Servidor Aguardando de Teste recusado.' }),
  ).toBeVisible()

  await page.getByText('Recusados', { exact: true }).click() // o rótulo em pílula; o rádio fica só para teclado e leitor de tela
  await expect(page.getByRole('radio', { name: 'Recusados' })).toBeChecked()
  const linha = page.getByRole('row', { name: /Servidor Aguardando de Teste/ })
  await expect(linha).toContainText('Recusado por Marina Duarte')
  await expect(linha.getByRole('button')).toHaveCount(0)
  await expect(page.getByText('Só a administração libera um acesso recusado.')).toBeVisible()

  const servidor = await (await browser.newContext()).newPage()
  await entrar(servidor, 'servidor.aguardando')
  await expect(servidor.getByRole('alert')).toHaveText('Seu acesso não foi liberado. Procure a coordenação do curso.')
})

test('coordenação só oferece docente ou coordenação', async ({ page }) => {
  await abrirAguardando(page, 'coord.teste')

  await page.getByRole('row', { name: /Servidor Aguardando de Teste/ }).getByRole('button', { name: /Aprovar/ }).click()
  const dialogo = page.getByRole('dialog', { name: 'Liberar acesso' })

  await expect(dialogo.getByRole('radio')).toHaveCount(2)
  await expect(dialogo.getByRole('radio', { name: 'Administrador' })).toHaveCount(0)
})
