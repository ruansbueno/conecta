// T071: a tabela de mensagens da seção 6 da spec e o mapa de erros da web dizem a mesma coisa.
// Lê a spec como texto: se alguém mudar uma mensagem num lado só, este teste aponta qual.
import { describe, expect, it } from 'vitest'

import { ApiError, CODES_DA_WEB } from '../../src/api/erros'

const arquivos = import.meta.glob('../../specs/001-plataforma-gestao/spec.md', { query: '?raw', import: 'default', eager: true })
const spec = Object.values(arquivos)[0] as string

/** Linhas `| \`CODE\` | Mensagem | Efeito |` da tabela de mensagens da seção 6. */
function tabelaDaSpec(): Map<string, string> {
  const secao = spec.slice(spec.indexOf('## 6.'), spec.indexOf('## 7.'))
  const linhas = [...secao.matchAll(/^\| `([A-Z_]+)` \| ([^|]+) \|/gm)]
  return new Map(linhas.map(([, code, mensagem]) => [code, mensagem.trim()]))
}

describe('mensagens de erro: spec §6 × web (T071)', () => {
  const tabela = tabelaDaSpec()

  it('a tabela foi lida', () => {
    expect(tabela.size).toBeGreaterThan(10)
  })

  it('cada code da tabela tem, na web, exatamente a mensagem da spec', () => {
    for (const [code, mensagem] of tabela) {
      expect(new ApiError({ code }).mensagem, code).toBe(mensagem)
    }
  })

  it('cada code que a web trata está na tabela da spec', () => {
    const faltando = CODES_DA_WEB.filter((c) => !tabela.has(c))
    expect(faltando).toEqual([])
  })
})
