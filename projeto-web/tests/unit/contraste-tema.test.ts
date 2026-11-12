import { describe, expect, it } from 'vitest'

// Spec 002 (FR-008, SC-002): todo texto tem contraste AA (4,5:1) nos dois temas. As cores saem de
// globals.css: o bloco @theme é o tema claro; `html[data-tema='escuro']` redefine os tokens.
const tema = Object.values(
  import.meta.glob('../../src/estilos/globals.css', { query: '?raw', import: 'default', eager: true }),
)[0] as string

function bloco(seletor: RegExp): string {
  const m = tema.match(seletor)
  if (!m) throw new Error(`bloco ${seletor} não está em globals.css`)
  return m[1]
}

const CLARO = bloco(/@theme\s*\{([\s\S]*?)\n\}/)
const ESCURO = bloco(/html\[data-tema='escuro'\]\s*\{([\s\S]*?)\n\}/)

function cor(nome: string, escuro: boolean): string {
  const procurar = (texto: string) => texto.match(new RegExp(`--color-${nome}:\\s*(#[0-9a-f]{6})\\b`, 'i'))?.[1]
  const achada = (escuro ? procurar(ESCURO) : undefined) ?? procurar(CLARO)
  if (!achada) throw new Error(`cor ${nome} não está no tema`)
  return achada
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

const TEXTOS_NEUTROS = ['tinta', 'texto-corpo', 'navy', 'navy-suave', 'apagado', 'tenue', 'azul', 'azul-escuro']
const FUNDOS_NEUTROS = ['branco', 'fundo', 'azul-superficie']
const PARES: [string, string][] = [
  ...TEXTOS_NEUTROS.flatMap((t) => FUNDOS_NEUTROS.map((f): [string, string] => [t, f])),
  ['apagado', 'linha-suave'],
  // Chips de destino e selos: o texto do chip sobre cada fundo de chip.
  ...['navy', 'apagado'].flatMap((t) =>
    ['destino-todos-fundo', 'destino-semestre-fundo', 'alerta-fundo', 'linha-suave'].map((f): [string, string] => [t, f]),
  ),
  ['azul', 'azul-superficie'],
  ['alerta', 'alerta-fundo'],
  ['alerta', 'branco'],
  ['sucesso', 'sucesso-fundo'],
  ['sucesso', 'branco'],
  ['perigo', 'perigo-fundo'],
  ['perigo', 'branco'],
  ['sobre-cor', 'acao'],
  ['sobre-cor', 'acao-escura'],
  ['sobre-cor', 'painel'],
  ['sobre-painel-suave', 'painel'],
]

describe.each([
  ['claro', false],
  ['escuro', true],
])('tema %s: contraste AA', (_nome, escuro) => {
  it('todo par de texto × fundo usado tem 4,5:1 ou mais', () => {
    const abaixo = PARES.filter(([t, f]) => contraste(cor(t, escuro), cor(f, escuro)) < 4.5).map(
      ([t, f]) => `${t} sobre ${f}: ${contraste(cor(t, escuro), cor(f, escuro)).toFixed(2)}`,
    )
    expect(abaixo).toEqual([])
  })
})

describe('tema escuro', () => {
  it('redefine as superfícies e o texto (não herda o claro por esquecimento)', () => {
    for (const nome of ['fundo', 'branco', 'linha', 'navy', 'tinta', 'apagado', 'tenue', 'azul-superficie', 'painel']) {
      expect(cor(nome, true), nome).not.toBe(cor(nome, false))
    }
  })

  it('botão principal: o mesmo azul com texto branco nos dois temas', () => {
    for (const escuro of [false, true]) {
      expect(cor('acao', escuro)).toBe('#2563eb')
      expect(cor('sobre-cor', escuro)).toBe('#ffffff')
    }
  })

  it('controles nativos acompanham o tema (color-scheme)', () => {
    expect(ESCURO).toMatch(/color-scheme:\s*dark/)
  })
})
