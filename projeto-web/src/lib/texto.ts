const PARTICULAS = new Set(['de', 'da', 'do', 'das', 'dos', 'e'])

/** Primeiro e último nome, ignorando partículas; nome único → duas letras. */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter((p) => p && !PARTICULAS.has(p.toLowerCase()))
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

/** Primeiros `tamanho` caracteres, cortados em limite de palavra. */
export function trecho(texto: string, tamanho = 160): string {
  const limpo = texto.replace(/\s+/g, ' ').trim()
  if (limpo.length <= tamanho) return limpo
  const corte = limpo.lastIndexOf(' ', tamanho)
  return `${limpo.slice(0, corte > 0 ? corte : tamanho).trimEnd()}…`
}

/** "1 aluno", "0 alunos", "1.248 alunos" (plural regular com -s). */
export const quantidade = (n: number, palavra: string) => `${n.toLocaleString('pt-BR')} ${palavra}${n === 1 ? '' : 's'}`
