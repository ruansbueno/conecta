import type { ReactNode } from 'react'

export interface Coluna<T> {
  chave: string
  titulo: string
  celula: (linha: T) => ReactNode
}

interface Props<T> {
  legenda: string
  colunas: Coluna<T>[]
  linhas: T[]
  chave: (linha: T) => string
}

/** Tabela com legenda e cabeçalhos associados às células (RW-40). */
export function Tabela<T>({ legenda, colunas, linhas, chave }: Props<T>) {
  return (
    <table className="w-full border-collapse text-[13.5px]">
      <caption className="sr-only">{legenda}</caption>
      <thead>
        <tr>
          {colunas.map((c) => (
            <th key={c.chave} scope="col" className="border-b border-linha px-4 pb-2.5 text-left text-xs font-semibold text-apagado">
              {c.titulo}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={chave(l)} className="border-b border-linha-suave last:border-b-0">
            {colunas.map((c) => (
              <td key={c.chave} className="px-4 py-3.5 align-middle text-tinta">
                {c.celula(l)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
