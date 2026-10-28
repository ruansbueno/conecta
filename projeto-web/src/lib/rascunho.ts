// Único dado que a plataforma guarda no navegador (data-model.md, "Rascunho de formulário") e o
// único ponto do código autorizado a tocar armazenamento (Princípio III, regra de lint).
// Nunca guarda token, identificação de usuário nem dado da API além dos destinos escolhidos.

export type ChaveRascunho = 'rascunho:aviso:novo' | `rascunho:aviso:${string}`

export interface DestinoRascunho {
  tipo: string
  turmaId?: string
  turmaNome?: string
  semestre?: number
}

export interface Rascunho {
  titulo: string
  conteudo: string
  destinos: DestinoRascunho[]
  salvoEm: Date
}

const PREFIXO = 'rascunho:'

export function salvarRascunho(chave: ChaveRascunho, dados: Omit<Rascunho, 'salvoEm'>): void {
  try {
    const { titulo, conteudo, destinos } = dados
    localStorage.setItem(chave, JSON.stringify({ titulo, conteudo, destinos, salvoEm: new Date() }))
  } catch {
    // Navegador sem armazenamento (modo privado, cota): o editor segue sem rascunho.
  }
}

export function lerRascunho(chave: ChaveRascunho): Rascunho | null {
  try {
    const bruto = localStorage.getItem(chave)
    if (!bruto) return null
    const { titulo, conteudo, destinos, salvoEm } = JSON.parse(bruto)
    if (typeof titulo !== 'string' || typeof conteudo !== 'string' || !Array.isArray(destinos)) {
      return null
    }
    return { titulo, conteudo, destinos, salvoEm: new Date(salvoEm) }
  } catch {
    return null
  }
}

export function apagarRascunho(chave: ChaveRascunho): void {
  try {
    localStorage.removeItem(chave)
  } catch {
    // sem armazenamento: nada a apagar
  }
}

export function apagarTodosRascunhos(): void {
  try {
    for (const chave of Object.keys(localStorage)) {
      if (chave.startsWith(PREFIXO)) localStorage.removeItem(chave)
    }
  } catch {
    // sem armazenamento: nada a apagar
  }
}
