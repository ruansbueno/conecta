/** Lugar do conteúdo enquanto carrega; anunciado a leitores de tela (RW-40). */
export function Esqueleto({ rotulo = 'Carregando', linhas = 4 }: { rotulo?: string; linhas?: number }) {
  return (
    <div role="status" aria-label={rotulo} aria-live="polite" className="space-y-4 p-7">
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} aria-hidden="true" className="space-y-2">
          <div className="h-3.5 w-1/3 animate-pulse rounded-md bg-linha-suave" />
          <div className="h-3 w-2/3 animate-pulse rounded-md bg-linha-suave" />
        </div>
      ))}
    </div>
  )
}
