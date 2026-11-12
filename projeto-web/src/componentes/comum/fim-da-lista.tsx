/** Spec 002 (FR-010 a FR-012): diz, em texto, que a lista acabou — em vez de um bloco em branco. */
export function FimDaLista({ texto, className = '' }: { texto: string; className?: string }) {
  return <p className={`px-6 py-4 text-center text-[12.5px] text-tenue ${className}`}>{texto}</p>
}
