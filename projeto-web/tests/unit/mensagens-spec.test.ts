// T071: a tabela de mensagens da seção 6 da spec e o mapa de erros da web dizem a mesma coisa.
// Lê a spec como texto: se alguém mudar uma mensagem num lado só, este teste aponta qual.
import { describe, expect, it } from 'vitest'

import { ApiError, CODES_DA_WEB } from '../../src/api/erros'

const arquivos = import.meta.glob('../../specs/001-plataforma-gestao/spec.md', { query: '?raw', import: 'default', eager: true })
const spec = Object.values(arquivos)[0] as string

const TITULO_DA_TABELA = '### Mensagens por código'
const CABECALHO = '| code | Mensagem | Efeito |'
/** `| \`CODE\` | Mensagem | Efeito |`: três colunas, nenhuma vazia, e a mensagem sem `|`. */
const LINHA_DE_CODE = /^\| `([A-Z][A-Z0-9_]*)` \| ([^|]*[^|\s][^|]*) \| ([^|]*[^|\s][^|]*) \|$/
/** A última linha não tem code: vale para 5xx e para code que a web não conhece. */
const LINHA_GENERICA = /^\| 5xx ou desconhecido \| ([^|]*[^|\s][^|]*) \| ([^|]*[^|\s][^|]*) \|$/

/**
 * A tabela "Mensagens por código" inteira, do cabeçalho à primeira linha que não é da tabela. Linha
 * fora do formato não é pulada em silêncio: vai para `naoLidas`, e o teste falha mostrando qual é.
 */
function lerTabela(texto: string) {
  const inicio = texto.indexOf(TITULO_DA_TABELA)
  const linhas = inicio < 0 ? [] : texto.slice(inicio + TITULO_DA_TABELA.length).split('\n')
  const primeira = linhas.findIndex((l) => l.startsWith('|'))
  const tabela: string[] = []
  for (const l of primeira < 0 ? [] : linhas.slice(primeira)) {
    if (!l.startsWith('|')) break
    tabela.push(l.trimEnd())
  }
  const [cabecalho, separador, ...corpo] = tabela
  const mensagens = new Map<string, string>()
  const naoLidas: string[] = []
  let generica: string | undefined
  if (cabecalho !== CABECALHO) naoLidas.push(`cabeçalho: ${cabecalho ?? '(tabela não encontrada)'}`)
  if (separador !== '|---|---|---|') naoLidas.push(`separador: ${separador ?? '(ausente)'}`)
  for (const linha of corpo) {
    const code = LINHA_DE_CODE.exec(linha)
    const outra = LINHA_GENERICA.exec(linha)
    if (code && !mensagens.has(code[1])) mensagens.set(code[1], code[2].trim())
    else if (outra && generica === undefined) generica = outra[1].trim()
    else naoLidas.push(linha) // fora do formato, ou code repetido
  }
  return { mensagens, generica, naoLidas }
}

describe('leitura da tabela da spec', () => {
  it('linha fora do formato, code repetido ou tabela faltando não passam calados', () => {
    const texto = [
      TITULO_DA_TABELA,
      '',
      CABECALHO,
      '|---|---|---|',
      '| `A_B` | Mensagem. | Efeito |',
      '| C_D | Sem crases. | Efeito |',
      '| `E_F` | Mensagem com | barra. | Efeito |',
      '| `G_H` |  | Efeito |',
      '| `A_B` | De novo. | Efeito |',
      '| 5xx ou desconhecido | Genérica. | Efeito |',
      '',
      '| `FORA` | Outra tabela. | Efeito |',
    ].join('\n')
    const { mensagens, generica, naoLidas } = lerTabela(texto)
    expect([...mensagens]).toEqual([['A_B', 'Mensagem.']])
    expect(generica).toBe('Genérica.')
    expect(naoLidas).toEqual([
      '| C_D | Sem crases. | Efeito |',
      '| `E_F` | Mensagem com | barra. | Efeito |',
      '| `G_H` |  | Efeito |',
      '| `A_B` | De novo. | Efeito |',
    ])
    expect(lerTabela('# Spec sem a tabela').naoLidas).toEqual(['cabeçalho: (tabela não encontrada)', 'separador: (ausente)'])
  })
})

describe('mensagens de erro: spec §6 × web (T071)', () => {
  const secao = spec.slice(spec.indexOf('## 6.'), spec.indexOf('## 7.'))
  const { mensagens: tabela, generica, naoLidas } = lerTabela(secao)

  it('a tabela foi lida inteira, sem linha fora do formato', () => {
    expect(naoLidas).toEqual([])
    expect(tabela.size).toBeGreaterThan(10)
  })

  it('cada code da tabela tem, na web, exatamente a mensagem da spec', () => {
    for (const [code, mensagem] of tabela) {
      expect(new ApiError({ code }).mensagem, code).toBe(mensagem)
    }
  })

  it('5xx e code desconhecido têm a mensagem genérica da spec', () => {
    expect(generica).toBeDefined()
    expect(new ApiError({ code: 'VALIDATION_ERROR', status: 500 }).mensagem).toBe(generica)
    expect(new ApiError({ code: 'RESPOSTA_INVALIDA' }).mensagem).toBe(generica)
  })

  it('cada code que a web trata está na tabela da spec', () => {
    const faltando = CODES_DA_WEB.filter((c) => !tabela.has(c))
    expect(faltando).toEqual([])
  })
})
