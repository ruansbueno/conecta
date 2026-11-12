import { describe, expect, it } from 'vitest'

// Spec 002 (FR-007, SC-004): cor só existe em globals.css. Uma cor escrita numa tela não muda com
// o tema escuro — hexadecimal, rgb()/hsl(), classe arbitrária ou cor da paleta padrão do Tailwind.
const fontes = import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>

const PALETA = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'
const PROIBIDOS = [
  /(?<![\w&/])#[0-9a-f]{6}\b/i,
  /(?<![\w&/])#[0-9a-f]{3}\b(?![\w-])/i,
  /\b(?:rgb|rgba|hsl|hsla)\(/,
  /\b[a-z-]+-\[#[0-9a-f]+\]/i,
  new RegExp(`(?<![\\w-])(?:bg|text|border|ring|fill|stroke|outline|divide|from|via|to|decoration|shadow|accent|caret)-(?:white|black|(?:${PALETA})-\\d{2,3})\\b`),
]

describe('cores só no tema', () => {
  it('nenhum arquivo de src/ escreve cor fora de globals.css', () => {
    const achados = Object.entries(fontes).flatMap(([arquivo, codigo]) =>
      codigo
        .split('\n')
        .flatMap((linha, i) => PROIBIDOS.filter((r) => r.test(linha)).map(() => `${arquivo}:${i + 1}: ${linha.trim()}`)),
    )
    expect(achados).toEqual([])
  })

  // D-MN-2: `branco` é superfície e `navy` é cor de título; no escuro eles escurecem e clareiam.
  // Texto sobre cor cheia usa `sobre-cor`; fundo navy cheio usa `painel`.
  it('nenhum token usado no papel do outro (text-branco, bg-navy)', () => {
    const papelTrocado = /(?<![\w-])(?:text-branco|bg-navy|border-navy bg-navy)(?![\w-])/
    const achados = Object.entries(fontes).flatMap(([arquivo, codigo]) =>
      codigo
        .split('\n')
        .flatMap((linha, i) => (papelTrocado.test(linha) ? [`${arquivo}:${i + 1}: ${linha.trim()}`] : [])),
    )
    expect(achados).toEqual([])
  })

  it('a busca pega as formas de cor solta', () => {
    const soltas = ["color: '#1d4ed8'", 'fill="#fff"', 'rgb(0 0 0 / 0.5)', 'bg-[#0b1424]', 'text-white', 'bg-gray-100', 'border-slate-200']
    const livres = ["href='#conteudo'", 'bg-branco text-navy', 'text-azul-escuro', "id: 'dia-#3'"]
    for (const s of soltas) expect(PROIBIDOS.some((r) => r.test(s)), s).toBe(true)
    for (const s of livres) expect(PROIBIDOS.some((r) => r.test(s)), s).toBe(false)
  })
})
