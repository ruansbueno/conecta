// Spec 003 (responsividade): comportamento por largura, nos dois temas. O desktop (1440 px) é
// coberto pelas demais suítes, que não mudam.
import { expect, test } from '@playwright/test'

import { entrar, reiniciarApi } from './apoio'
import { caixa, LARGURAS, larguraDoConteudo, publicarAviso, semRolagemDoDocumento, semRolagemLateral, TEMAS, usarTema } from './apoio-responsivo'

test.beforeEach(async () => {
  await reiniciarApi()
})

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test.beforeEach(async ({ page }) => {
      await usarTema(page, tema)
    })

    test.describe('casca (RR-01 a RR-05)', () => {
      test('390 px: menu abre, navega para Turmas e fecha', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        const abrir = page.getByRole('button', { name: 'Abrir menu' })
        await expect(abrir).toBeVisible()
        await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeHidden()

        await abrir.click()
        const gaveta = page.getByRole('dialog', { name: 'Menu' })
        await expect(gaveta).toBeVisible()
        await gaveta.getByRole('link', { name: 'Turmas' }).click()

        await expect(page).toHaveURL(/\/turmas$/)
        await expect(gaveta).toBeHidden()
        await expect(abrir).toBeFocused()
      })

      test('1023 px mostra "Abrir menu" e esconde a barra lateral; 1024 px o contrário', async ({ page }) => {
        await page.setViewportSize({ width: 1023, height: 800 })
        await entrar(page, 'coord.teste')
        const abrir = page.getByRole('button', { name: 'Abrir menu' })
        const lateral = page.getByRole('navigation', { name: 'Navegação principal' })
        await expect(abrir).toBeVisible()
        await expect(lateral).toBeHidden()

        await page.setViewportSize({ width: 1024, height: 800 })
        await expect(abrir).toBeHidden()
        await expect(lateral).toBeVisible()
      })

      test('gaveta aberta fecha ao alargar a janela para 1024 px', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.tablet, height: 1024 })
        await entrar(page, 'coord.teste')
        await page.getByRole('button', { name: 'Abrir menu' }).click()
        await expect(page.getByRole('dialog', { name: 'Menu' })).toBeVisible()

        await page.setViewportSize({ width: 1024, height: 1024 })

        // Pelo id: em 1024 px a gaveta, se continuasse aberta, estaria escondida (lg:hidden) e o
        // getByRole não a acharia. Ao estreitar de novo, ela não pode reaparecer.
        await expect(page.locator('#gaveta-menu')).toHaveCount(0)
        await expect(page.getByRole('navigation', { name: 'Navegação principal' })).toBeVisible()
        await page.setViewportSize({ width: LARGURAS.tablet, height: 1024 })
        await expect(page.locator('#gaveta-menu')).toHaveCount(0)
      })

      test('painel em 390 px sem rolagem lateral', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await expect(page.getByRole('heading', { level: 1, name: /Marina/ })).toBeVisible()

        await semRolagemLateral(page)
      })
    })

    test.describe('cabeçalhos, abas, filtros e rodapés (RR-06 a RR-10, RR-13, RR-23)', () => {
      test('ação principal ocupa a largura do conteúdo no celular e fica ao lado do título no tablet', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/horarios')
        await page.locator('main a[href*="/horarios"]').first().click()
        const grade = page.url()
        const casos: [string, string][] = [['/avisos', 'Novo aviso'], ['/eventos', 'Novo evento'], ['/turmas', 'Nova turma'], [grade, 'Nova aula']]
        for (const [rota, acao] of casos) {
          await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
          await page.goto(rota)
          const botao = page.getByRole('main').getByRole(acao === 'Nova turma' || acao === 'Nova aula' ? 'button' : 'link', { name: acao })
          const largura = (await caixa(botao)).width
          expect(Math.abs(largura - (await larguraDoConteudo(page))), `${acao} em 390 px`).toBeLessThanOrEqual(1)

          await page.setViewportSize({ width: LARGURAS.tablet, height: 1024 })
          const titulo = await caixa(page.getByRole('heading', { level: 1 }))
          expect(Math.abs((await caixa(botao)).y - titulo.y), `${acao} em 768 px`).toBeLessThanOrEqual(8)
        }
      })

      test('botões do cabeçalho viram grade no celular', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await publicarAviso(page, 'Aviso da grade de botões', LARGURAS.celular)
        await page.getByRole('link', { name: 'Aviso da grade de botões' }).first().click()
        const botoes = [page.getByRole('button', { name: 'Arquivar', exact: true }), page.getByRole('link', { name: 'Editar', exact: true }), page.getByRole('button', { name: 'Excluir', exact: true })]
        const caixas = await Promise.all(botoes.map(caixa))
        for (const c of caixas.slice(1)) {
          expect(Math.abs(c.y - caixas[0].y)).toBeLessThanOrEqual(1)
          expect(Math.abs(c.width - caixas[0].width)).toBeLessThanOrEqual(1)
        }

        await page.goto('/turmas')
        await page.locator('main a[href^="/turmas/"]').first().click()
        const quatro = await Promise.all(
          [page.getByRole('link', { name: 'Horários' }), page.getByRole('button', { name: 'Fechar inscrições' }), page.getByRole('button', { name: 'Editar turma' }), page.getByRole('button', { name: 'Desativar turma' })].map(caixa),
        )
        expect(Math.abs(quatro[0].y - quatro[1].y)).toBeLessThanOrEqual(1)
        expect(Math.abs(quatro[2].y - quatro[3].y)).toBeLessThanOrEqual(1)
        expect(quatro[2].y).toBeGreaterThan(quatro[0].y + 20)
      })

      test('abas de Usuários rolam sem empurrar a página', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        await expect(page.getByRole('tab', { name: 'Todos' })).toBeVisible()
        await semRolagemLateral(page)
        const aguardando = page.getByRole('tab', { name: /Aguardando acesso/ })
        await aguardando.scrollIntoViewIfNeeded()
        const c = await caixa(aguardando)
        expect(c.x + c.width).toBeLessThanOrEqual(LARGURAS.celular)
        await semRolagemLateral(page)
      })

      test('busca ocupa a largura toda no celular', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/turmas')
        await page.locator('main a[href^="/turmas/"]').first().click()
        await expect(page.getByRole('heading', { name: 'Vínculos' })).toBeVisible()
        const detalhe = page.url()
        for (const rota of ['/avisos', '/eventos', '/turmas', '/usuarios', detalhe]) {
          await page.goto(rota)
          const campo = page.getByRole('main').locator('label.campo').first()
          const largura = (await caixa(campo)).width
          expect(Math.abs(largura - (await larguraDoConteudo(page))), rota).toBeLessThanOrEqual(1)
        }
      })

      test('rodapé de paginação quebra sem cortar', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        const texto = page.getByText(/^Mostrando \d+ de \d+ usuários$/)
        const nav = page.getByRole('navigation', { name: 'Paginação' })
        const limite = (await larguraDoConteudo(page)) + 16
        for (const c of [await caixa(texto), await caixa(nav)]) expect(c.x + c.width).toBeLessThanOrEqual(limite + 1)
      })

      test('botões de ícone com 40 px no celular e 36 px no desktop', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        const alterar = page.getByRole('button', { name: /^Alterar perfil de/ }).first()
        const tema = page.getByRole('button', { name: /modo noturno/ })
        for (const b of [page.getByRole('button', { name: 'Abrir menu' }), tema, alterar]) {
          const c = await caixa(b)
          expect(Math.min(c.width, c.height)).toBeGreaterThanOrEqual(40)
        }
        await page.setViewportSize({ width: 1440, height: 900 })
        expect(Math.round((await caixa(alterar)).width)).toBe(36)
      })
    })

    test.describe('tabelas (RR-11, RR-12)', () => {
      test('coluna do aluno fica presa e Aprovar e Recusar aparecem inteiros', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.estreito, height: 800 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/solicitacoes')
        const regiao = page.getByRole('region', { name: /^Solicitações — Pendentes/ })
        await expect(regiao).toBeVisible()
        await regiao.evaluate((r) => (r.scrollLeft = r.scrollWidth))
        const area = await caixa(regiao)
        const dentro = (c: { x: number; width: number }) => {
          expect(c.x).toBeGreaterThanOrEqual(area.x - 1)
          expect(c.x + c.width).toBeLessThanOrEqual(area.x + area.width + 1)
        }

        dentro(await caixa(regiao.getByRole('cell', { name: /Aluno Dois de Teste/ }).first()))
        const aprovar = await caixa(regiao.getByRole('button', { name: /^Aprovar Aluno Dois de Teste/ }).first())
        const recusar = await caixa(regiao.getByRole('button', { name: /^Recusar Aluno Dois de Teste/ }).first())
        dentro(aprovar)
        dentro(recusar)
        expect(recusar.y).toBeGreaterThan(aprovar.y + aprovar.height - 1)
        expect(Math.abs(aprovar.height - 32)).toBeLessThanOrEqual(1)
      })

      test('células fora da primeira coluna não quebram linha no celular (a tabela rola)', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/solicitacoes')
        const turma = page.getByRole('region', { name: /^Solicitações — Pendentes/ }).getByRole('cell', { name: 'TADS 3º Sem B', exact: true }).first()
        const linhas = await turma.evaluate((td) => {
          const r = document.createRange()
          r.selectNodeContents(td)
          return new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size
        })
        expect(linhas).toBe(1)
      })

      test('listas com tabela não rolam a página em 360 px', async ({ page }) => {
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await publicarAviso(page, 'Aviso para a tabela', LARGURAS.estreito)
        await page.goto('/turmas')
        await page.locator('main a[href^="/turmas/"]').first().click()
        await expect(page.getByRole('heading', { name: 'Vínculos' })).toBeVisible()
        const detalhe = page.url()
        for (const rota of ['/avisos', '/turmas', '/usuarios', '/usuarios?aba=aguardando', '/solicitacoes', detalhe]) {
          await page.goto(rota)
          await expect(page.getByRole('region').first()).toBeVisible()
          await semRolagemLateral(page)
        }
      })
    })

    test.describe('painel e agenda (RR-14 a RR-16)', () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
      })

      test('contadores do painel em 2 colunas e avisos com destinos abaixo do título', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await publicarAviso(page, 'Aviso do painel no celular', LARGURAS.celular)
        await page.goto('/painel')
        const ativos = await caixa(page.getByRole('region', { name: 'Avisos ativos' }))
        const agendados = await caixa(page.getByRole('region', { name: 'Avisos agendados' }))
        expect(Math.abs(ativos.y - agendados.y)).toBeLessThanOrEqual(1)
        expect(agendados.x).toBeGreaterThan(ativos.x + ativos.width - 1)

        const titulo = await caixa(page.getByRole('link', { name: 'Aviso do painel no celular', exact: true }))
        const item = page.getByRole('link', { name: 'Aviso do painel no celular' }).locator('xpath=ancestor::li[1]')
        const situacao = await caixa(item.getByText('Ativo', { exact: true }))
        expect(situacao.y).toBeGreaterThan(titulo.y + titulo.height)
        await semRolagemLateral(page)
      })

      test('agenda: calendário cabe, tocar num dia filtra a lista e o evento põe destino e ações embaixo', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/eventos')
        const prova = page.getByRole('heading', { name: 'Prova de Banco de Dados II' }).locator('xpath=ancestor::li[1]')
        const titulo = await caixa(prova.getByRole('link', { name: 'Prova de Banco de Dados II', exact: true }))
        const destinos = await caixa(prova.getByRole('list', { name: 'Destinos' }))
        const editar = await caixa(prova.getByRole('link', { name: /^Editar/ }))
        expect(destinos.y).toBeGreaterThan(titulo.y + titulo.height)
        expect(editar.y).toBeGreaterThan(destinos.y + destinos.height - 1)
        await semRolagemLateral(page)

        // O servidor falso marca os eventos em relação a hoje: dia e mês da prova vêm do próprio cartão.
        const diaDaProva = Number(await prova.locator('p').first().textContent())
        const mesDaProva = (await prova.locator('p').nth(1).textContent())!.trim()

        await page.getByRole('tab', { name: 'Mês' }).click()
        const mes = page.getByRole('table', { name: / de 20\d\d$/i })
        await expect(mes).toBeVisible()
        const larguraMes = await mes.evaluate((t) => [t.scrollWidth, t.parentElement!.clientWidth])
        expect(larguraMes[0]).toBeLessThanOrEqual(larguraMes[1])
        await semRolagemLateral(page)

        if (!(await mes.getAttribute('aria-label'))!.startsWith(mesDaProva)) {
          await page.getByRole('button', { name: 'Próximo mês' }).click()
          await expect(page.getByRole('table', { name: new RegExp(`^${mesDaProva}`, 'i') })).toBeVisible()
        }
        await page.getByRole('button', { name: new RegExp(`^${diaDaProva} de ${mesDaProva}`) }).click()
        await expect(page.getByRole('link', { name: 'Prova de Banco de Dados II', exact: true })).toBeVisible()
        await expect(page.getByRole('link', { name: 'Palestra: carreira em TI', exact: true })).toHaveCount(0)
      })

      test('painel do docente sem rolagem lateral', async ({ page }) => {
        await entrar(page, 'docente.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await expect(page.getByRole('heading', { name: 'O que seu perfil permite' })).toBeVisible()
        await semRolagemLateral(page)
      })
    })

    test.describe('grade, editores, turma e login (RR-17 a RR-20)', () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
      })

      test('grade rola dentro do cartão sem rolar a página', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/horarios')
        await page.locator('main a[href*="/horarios"]').first().click()
        const tabela = page.getByRole('table', { name: /Grade semanal/ })
        await expect(tabela).toBeVisible()
        const [rola, visivel] = await tabela.evaluate((t) => [t.parentElement!.scrollWidth, t.parentElement!.clientWidth])
        expect(rola).toBeGreaterThan(visivel)
        await semRolagemLateral(page)
      })

      test('Início e Fim do evento empilham e o editor de aviso põe a prévia por último', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/eventos/novo')
        const inicio = await caixa(page.getByLabel('Início'))
        const fim = await caixa(page.getByLabel('Fim', { exact: true }))
        expect(fim.y).toBeGreaterThan(inicio.y + inicio.height)
        await semRolagemLateral(page)

        await page.goto('/avisos/novo')
        const publicacao = await caixa(page.getByRole('heading', { name: 'Publicação' }))
        const previa = await caixa(page.getByRole('heading', { name: 'Como aparece no aplicativo' }))
        expect(previa.y).toBeGreaterThan(publicacao.y)
        await semRolagemLateral(page)
      })

      test('dados da turma em 2 colunas', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/turmas')
        await page.locator('main a[href^="/turmas/"]').first().click()
        const dados = page.getByRole('region', { name: 'Dados da turma' })
        const codigo = await caixa(dados.getByText('Código', { exact: true }))
        const semestre = await caixa(dados.getByText('Semestre do curso', { exact: true }))
        const periodo = await caixa(dados.getByText('Período letivo', { exact: true }))
        expect(Math.abs(codigo.y - semestre.y)).toBeLessThanOrEqual(1)
        expect(periodo.y).toBeGreaterThan(codigo.y + 20)
        expect(Math.abs(periodo.x - codigo.x)).toBeLessThanOrEqual(1)
        const vinculos = await caixa(dados.getByText('Vínculos', { exact: true }))
        expect(Math.abs(vinculos.x - semestre.x), 'colunas alinhadas').toBeLessThanOrEqual(1)
        await semRolagemLateral(page)
      })

      test('abrir e fechar o menu no editor não perde o rascunho', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/avisos/novo')
        await page.getByLabel('Título').fill('Rascunho no celular')
        await page.getByRole('button', { name: 'Abrir menu' }).click()
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog', { name: 'Menu' })).toHaveCount(0)
        await expect(page.getByLabel('Título')).toHaveValue('Rascunho no celular')
      })

      test('login mostra a marca no topo no celular', async ({ page }) => {
        await page.goto('/login')
        await expect(page.getByText('CONECTA', { exact: true }).last()).toBeVisible()
        await semRolagemLateral(page)
      })
    })

    test.describe('modais (RR-21)', () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
      })

      test('modal ocupa a largura menos 12 px de cada lado e os botões dividem o rodapé', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/turmas')
        await page.getByRole('button', { name: 'Nova turma' }).click()
        const nova = page.getByRole('dialog', { name: 'Nova turma' })
        expect(Math.abs((await caixa(nova)).width - (LARGURAS.celular - 24))).toBeLessThanOrEqual(1)
        const cancelar = await caixa(nova.getByRole('button', { name: 'Cancelar' }))
        const criar = await caixa(nova.getByRole('button', { name: 'Criar turma' }))
        expect(Math.abs(cancelar.y - criar.y)).toBeLessThanOrEqual(1)
        expect(Math.abs(cancelar.width - criar.width)).toBeLessThanOrEqual(1)
        await page.keyboard.press('Escape')

        await page.goto('/solicitacoes')
        await page.getByRole('button', { name: /^Recusar / }).first().click()
        const recusar = page.getByRole('dialog', { name: /^Recusar a solicitação/ })
        expect(Math.abs((await caixa(recusar)).width - (LARGURAS.celular - 24))).toBeLessThanOrEqual(1)
      })

      test('modal alto cabe na tela e rola por dentro', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 600 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        await page.getByRole('button', { name: /^Alterar perfil de/ }).nth(1).click()
        const dialogo = page.getByRole('dialog', { name: 'Alterar perfil de acesso' })
        const c = await caixa(dialogo)
        expect(c.y).toBeGreaterThanOrEqual(0)
        expect(c.y + c.height).toBeLessThanOrEqual(600)
        const [rola, visivel] = await dialogo.evaluate((d) => {
          const miolo = d.querySelector('.overflow-y-auto') as HTMLElement
          return [miolo.scrollHeight, miolo.clientHeight]
        })
        expect(rola).toBeGreaterThan(visivel)
      })
    })

    test.describe('achados da revisão final', () => {
      test('nome e usuário longos não escondem Aprovar e Recusar em 360 px', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.estreito, height: 800 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/solicitacoes')
        const regiao = page.getByRole('region', { name: /^Solicitações — Pendentes/ })
        await expect(regiao).toBeVisible()
        await regiao.getByRole('cell').first().evaluate((td) => {
          const textos = td.querySelectorAll('p')
          textos[0].textContent = 'Maria Eduarda Fernandes de Albuquerque Cavalcanti'
          textos[1].textContent = 'mariaeduarda.albuquerque'
        })
        await regiao.evaluate((r) => (r.scrollLeft = r.scrollWidth))
        const presa = await caixa(regiao.getByRole('cell').first())
        const aprovar = await caixa(regiao.getByRole('button', { name: /^Aprovar / }).first())
        const area = await caixa(regiao)
        expect(aprovar.x).toBeGreaterThanOrEqual(presa.x + presa.width - 1)
        expect(aprovar.x + aprovar.width).toBeLessThanOrEqual(area.x + area.width + 1)
      })

      test('a coluna presa continua legível no celular (nome sem quebrar letra a letra)', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.estreito, height: 800 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        for (const rota of ['/solicitacoes', '/turmas']) {
          await page.goto(rota)
          const celula = page.getByRole('region').first().getByRole('cell').first()
          await expect(celula).toBeVisible()
          expect((await caixa(celula)).width, rota).toBeGreaterThanOrEqual(140)
        }
        await page.goto('/solicitacoes')
        const linhas = await page.getByRole('region').first().getByText('Aluno Dois de Teste').first().evaluate((el) => {
          const r = document.createRange()
          r.selectNodeContents(el)
          return new Set([...r.getClientRects()].map((q) => Math.round(q.top))).size
        })
        expect(linhas).toBeLessThanOrEqual(2)
      })

      test('o contorno de foco das abas não é cortado no desktop', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        const todos = page.getByRole('tab', { name: 'Todos' })
        await todos.focus()
        const sobra = await todos.evaluate((t) => {
          const cs = getComputedStyle(t)
          const anel = parseFloat(cs.outlineOffset) + parseFloat(cs.outlineWidth)
          const a = t.getBoundingClientRect()
          const l = t.parentElement!.getBoundingClientRect()
          return Math.min(a.top - anel - l.top, a.left - anel - l.left, l.bottom - (a.bottom + anel))
        })
        expect(sobra).toBeGreaterThanOrEqual(0)
      })

      test('no desktop a prévia fica logo abaixo dos campos, mesmo com a coluna da direita alta', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/avisos/novo')
        const contador = page.getByText(/de 5\.000 caracteres/)
        const previa = page.getByRole('region', { name: 'Como aparece no aplicativo' })
        const antes = (await caixa(previa)).y - ((await caixa(contador)).y + (await caixa(contador)).height)
        await page.getByRole('heading', { name: 'Quem vai receber' }).evaluate((h) => {
          const alto = document.createElement('div')
          alto.style.height = '400px'
          h.closest('section')!.append(alto)
        })
        const depois = (await caixa(previa)).y - ((await caixa(contador)).y + (await caixa(contador)).height)
        expect(Math.abs(depois - antes)).toBeLessThanOrEqual(1)
      })

      test('modal de aula em 360 px: Dia em cima, Início e Fim lado a lado e legíveis', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.estreito, height: 800 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/horarios')
        await page.locator('main a[href*="/horarios"]').first().click()
        await page.getByRole('button', { name: 'Nova aula' }).click()
        const dialogo = page.getByRole('dialog', { name: 'Nova aula' })
        const dia = await caixa(dialogo.getByLabel('Dia'))
        const inicio = await caixa(dialogo.getByLabel('Início'))
        const fim = await caixa(dialogo.getByLabel('Fim'))
        expect(inicio.y).toBeGreaterThan(dia.y + dia.height - 1)
        expect(Math.abs(inicio.y - fim.y)).toBeLessThanOrEqual(1)
        expect(inicio.width).toBeGreaterThanOrEqual(120)
      })

      test('tabelas só viram parada de Tab quando rolam', async ({ page }) => {
        await page.setViewportSize({ width: 1440, height: 900 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios')
        await expect(page.getByRole('region', { name: /^Usuários/ })).not.toHaveAttribute('tabindex')
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await expect(page.getByRole('region', { name: /^Usuários/ })).toHaveAttribute('tabindex', '0')
      })

      test('a aba ativa aparece na tela ao abrir a página no celular', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'admin.teste')
        await expect(page).toHaveURL(/\/painel$/)
        await page.goto('/usuarios?aba=aguardando')
        const aba = page.getByRole('tab', { name: /Aguardando acesso/ })
        await expect(aba).toHaveAttribute('aria-selected', 'true')
        await expect(async () => {
          const c = await caixa(aba)
          expect(c.x).toBeGreaterThanOrEqual(0)
          expect(c.x + c.width).toBeLessThanOrEqual(LARGURAS.celular)
        }).toPass({ timeout: 3000 })
      })
    })

    test.describe('ajustes depois do uso real (24/11)', () => {
      test('a página não ganha altura extra atrás do conteúdo (agenda, celular e desktop)', async ({ page }) => {
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        for (const viewport of [{ width: LARGURAS.celular, height: 844 }, { width: 1440, height: 900 }]) {
          await page.setViewportSize(viewport)
          for (const rota of ['/eventos', '/eventos?aba=mes']) {
            await page.goto(rota)
            await expect(page.getByRole('heading', { name: 'Agenda', level: 1 })).toBeVisible()
            await expect(page.getByRole('link', { name: 'Palestra: carreira em TI', exact: true }).first()).toBeVisible()
            await semRolagemDoDocumento(page)
          }
        }
      })

      test('filtros em grade no celular: rótulo acima e larguras iguais', async ({ page }) => {
        await page.setViewportSize({ width: LARGURAS.celular, height: 844 })
        await entrar(page, 'coord.teste')
        await expect(page).toHaveURL(/\/painel$/)
        const conteudo = await larguraDoConteudo(page)

        await page.goto('/avisos')
        const autor = await caixa(page.getByRole('combobox', { name: 'Autor' }))
        const turma = await caixa(page.getByRole('combobox', { name: 'Turma' }))
        expect(Math.abs(autor.y - turma.y), 'Autor e Turma na mesma linha').toBeLessThanOrEqual(1)
        expect(Math.abs(autor.width - turma.width), 'Autor e Turma com a mesma largura').toBeLessThanOrEqual(1)
        expect(autor.width + turma.width).toBeGreaterThan(conteudo - 20)
        const rotulo = await caixa(page.getByRole('main').getByText('Autor', { exact: true }))
        expect(rotulo.y + rotulo.height, 'rótulo acima do campo').toBeLessThanOrEqual(autor.y + 1)
        const abas = await caixa(page.getByRole('tablist', { name: 'Situação dos avisos' }))
        expect(Math.abs(abas.width - conteudo), 'abas na largura do conteúdo').toBeLessThanOrEqual(1)

        await page.goto('/turmas')
        const semestre = await caixa(page.getByRole('combobox', { name: 'Semestre' }))
        const periodo = await caixa(page.getByRole('textbox', { name: 'Período letivo' }))
        expect(Math.abs(semestre.y - periodo.y)).toBeLessThanOrEqual(1)
        expect(Math.abs(semestre.width - periodo.width)).toBeLessThanOrEqual(1)

        for (const [rota, nome] of [['/eventos', 'Tipo'], ['/solicitacoes', 'Turma']]) {
          await page.goto(rota)
          const unico = await caixa(page.getByRole('combobox', { name: nome }))
          expect(Math.abs(unico.width - (await larguraDoConteudo(page))), `${nome} em ${rota}`).toBeLessThanOrEqual(1)
        }
      })
    })
  })
}
