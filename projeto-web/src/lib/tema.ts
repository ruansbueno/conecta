// Spec 002 (D-MN-4, D-MN-5): tema claro ou escuro. A escolha fica no localStorage (só ela: a
// constituição 2.0.1, Princípio III, permite preferência de interface que não identifica ninguém);
// sem escolha, vale o tema do sistema. public/tema-inicial.js repete a decisão antes da primeira
// pintura — tests/unit/tema.test.ts confere que os dois concordam.

export type Tema = 'claro' | 'escuro'

export const CHAVE_TEMA = 'conecta:tema'
/** Avisado em `window` a cada `aplicarTema`, para todo botão da página acompanhar. */
export const EVENTO_TEMA = 'conecta:tema'
const CONSULTA_ESCURO = '(prefers-color-scheme: dark)'

/** Escolha feita nesta página quando o armazenamento recusou guardá-la: vale até recarregar. */
let escolhaSemArmazenamento: Tema | null = null

export function lerEscolha(): Tema | null {
  try {
    const valor = localStorage.getItem(CHAVE_TEMA)
    if (valor === 'claro' || valor === 'escuro') return valor
  } catch {
    // Armazenamento bloqueado: como se não houvesse escolha guardada.
  }
  return escolhaSemArmazenamento
}

export function guardarEscolha(tema: Tema): void {
  try {
    localStorage.setItem(CHAVE_TEMA, tema)
    escolhaSemArmazenamento = null
  } catch {
    // Sem armazenamento, a troca vale só para esta página — e continua valendo se o sistema mudar.
    escolhaSemArmazenamento = tema
  }
}

/** Para os testes: esquece a escolha que ficou só na memória da página. */
export function esquecerEscolhaSemArmazenamento(): void {
  escolhaSemArmazenamento = null
}

export function consultaDoSistema(): MediaQueryList | undefined {
  return typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA_ESCURO) : undefined
}

export function temaDoSistema(): Tema {
  return consultaDoSistema()?.matches ? 'escuro' : 'claro'
}

export function temaEfetivo(): Tema {
  return lerEscolha() ?? temaDoSistema()
}

export function temaAplicado(): Tema {
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'
}

export function aplicarTema(tema: Tema): void {
  const raiz = document.documentElement
  raiz.dataset.tema = tema
  raiz.style.colorScheme = tema === 'escuro' ? 'dark' : 'light'
  window.dispatchEvent(new Event(EVENTO_TEMA))
}
