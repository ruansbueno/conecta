import { describe, expect, it } from 'vitest'

// Opacidade sobre um rótulo escurece também o texto explicativo ("Já está na turma",
// "Indisponível") e leva o contraste abaixo do AA. O axe não mede esses casos porque ignora
// rótulos de controles desabilitados; por isso a regra é conferida no código.
const fontes = import.meta.glob('../../src/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

describe('texto sem opacidade', () => {
  it('nenhum componente esmaece texto com opacity- (só botões desabilitados, com disabled:)', () => {
    const achados = Object.entries(fontes).flatMap(([arquivo, codigo]) =>
      [...codigo.matchAll(/(?<![\w:-])opacity-\d+/g)].map((m) => `${arquivo}: ${m[0]}`),
    )
    expect(achados).toEqual([])
  })
})
