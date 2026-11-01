import { describe, expect, it } from 'vitest'

// Contraste AA (4,5:1) do que fica por cima dos fundos dos chips de destino. O axe não mede o ícone
// do botão de remover, por isso a regra é conferida aqui: as cores de texto do chip saem do código e
// a razão é calculada com as cores do tema em globals.css (uma mudança de cor ali também é pega).
const bruto = (glob: Record<string, unknown>) => Object.values(glob)[0] as string
const chip = bruto(import.meta.glob('../../src/componentes/comum/chip-destino.tsx', { query: '?raw', import: 'default', eager: true }))
const tema = bruto(import.meta.glob('../../src/estilos/globals.css', { query: '?raw', import: 'default', eager: true }))

const FUNDOS = ['destino-todos-fundo', 'azul-superficie', 'destino-semestre-fundo', 'alerta-fundo', 'linha-suave']

function cor(nome: string): string {
  const m = tema.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-f]{6})`, 'i'))
  if (!m) throw new Error(`cor ${nome} não está no tema`)
  return m[1]
}

function luminancia(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contraste(a: string, b: string): number {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

describe('chip de destino: contraste sobre os fundos de chip', () => {
  it('toda cor de texto do chip tem 4,5:1 ou mais sobre todos os fundos de chip', () => {
    const cores = [...new Set([...chip.matchAll(/(?<![\w-])text-([a-z][a-z-]*)(?![\w-])/g)].map((m) => m[1]))].filter(
      (c) => !/^(xs|sm|left|right|center)$/.test(c),
    )
    expect(cores.length).toBeGreaterThan(0)
    const abaixo = cores.flatMap((c) =>
      FUNDOS.filter((f) => contraste(cor(c), cor(f)) < 4.5).map((f) => `${c} sobre ${f}: ${contraste(cor(c), cor(f)).toFixed(2)}`),
    )
    expect(abaixo).toEqual([])
  })

  it('a conta pega a cor fraca que já foi usada (tenue no fundo do semestre)', () => {
    expect(contraste(cor('tenue'), cor('destino-semestre-fundo'))).toBeLessThan(4.5)
  })
})
