import { describe, expect, it } from 'vitest'

// Contraste AA (4,5:1) do que fica por cima dos fundos dos chips de destino (todos-fundo,
// azul-superficie, semestre-fundo, alerta-fundo, linha-suave). Conta feita com as cores do tema:
// `tenue` (#646f80) fica entre 4,43:1 e 4,67:1 nesses fundos — abaixo do AA no semestre e no
// "todos"; `apagado` (#5b6b86) fica entre 4,70:1 e 4,95:1 e `navy`, acima de 12:1. O axe não mede
// o ícone do botão de remover, por isso a regra é conferida no código.
const chip = Object.values(
  import.meta.glob('../../src/componentes/comum/chip-destino.tsx', { query: '?raw', import: 'default', eager: true }),
)[0] as string

const CORES_QUE_PASSAM = new Set(['navy', 'apagado'])

describe('chip de destino: contraste sobre os fundos de chip', () => {
  it('só usa cores de texto com 4,5:1 ou mais sobre todos os fundos de chip', () => {
    const cores = [...chip.matchAll(/(?<![\w-])text-([a-z][a-z-]*)(?![\w-])/g)].map((m) => m[1]).filter((c) => !/^(xs|sm|left|right|center)$/.test(c))
    expect(cores.length).toBeGreaterThan(0)
    expect(cores.filter((c) => !CORES_QUE_PASSAM.has(c))).toEqual([])
  })
})
