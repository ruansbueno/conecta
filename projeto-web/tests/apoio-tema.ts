import { vi } from 'vitest'

/** `prefers-color-scheme` controlável: o jsdom não implementa `matchMedia`. */
export function sistemaEm(escuro: boolean) {
  const ouvintes = new Set<(e: { matches: boolean }) => void>()
  const consulta = {
    get matches() {
      return escuro
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, f: (e: { matches: boolean }) => void) => ouvintes.add(f),
    removeEventListener: (_: string, f: (e: { matches: boolean }) => void) => ouvintes.delete(f),
  }
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => consulta),
  )
  return {
    mudar(novo: boolean) {
      escuro = novo
      for (const f of [...ouvintes]) f({ matches: novo })
    },
    ouvintes: () => ouvintes.size,
  }
}

/** Estado limpo entre testes: sem escolha guardada e sem tema aplicado no <html>. */
export function limparTema() {
  localStorage.clear()
  delete document.documentElement.dataset.tema
  document.documentElement.style.colorScheme = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
}
