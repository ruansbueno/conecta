import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

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

/** A primeira coluna (quem é a linha) fica presa enquanto a tabela rola para o lado (spec 003, RR-11). */
const PRESA = 'sticky left-0 z-[1] bg-branco'
/** As outras colunas não quebram linha fora do desktop: a tabela rola, em vez de espremer cada
 * célula em várias linhas (spec 003, RR-11). No desktop continuam como antes. */
const LINHA_UNICA = 'whitespace-nowrap lg:whitespace-normal'
/** No celular a coluna presa tem largura fixa (legível, sem espremer o nome letra a letra) e quebra
 * até um usuário sem espaços: nome longo não cobre os botões de decisão (revisão final, Review
 * Focus 4). A partir de 640 px, a largura volta a ser a do conteúdo. */
const LIMITE_DA_PRESA = 'w-[150px] [overflow-wrap:anywhere] sm:w-auto sm:[overflow-wrap:normal]'

/** Tabela com legenda e cabeçalhos associados às células (RW-40). Rola para o lado dentro da própria
 * região, nunca a página, com um esmaecido na borda direita enquanto houver colunas escondidas. */
export function Tabela<T>({ legenda, colunas, linhas, chave }: Props<T>) {
  const regiao = useRef<HTMLDivElement>(null)
  const [temMais, setTemMais] = useState(false)
  const [rola, setRola] = useState(false)

  const medir = useCallback(() => {
    const r = regiao.current
    if (!r) return
    setRola(r.scrollWidth > r.clientWidth)
    setTemMais(Math.ceil(r.scrollLeft + r.clientWidth) < r.scrollWidth)
  }, [])

  useEffect(() => {
    const r = regiao.current
    if (!r || typeof ResizeObserver === 'undefined') return
    const observador = new ResizeObserver(medir)
    observador.observe(r)
    return () => observador.disconnect()
  }, [medir])

  return (
    <div className="relative">
      {/* Região rolável: nomeada e, só quando rola de fato, focável para rolar pelo teclado (WCAG 2.1.1,
          axe scrollable-region-focusable). Sem rolagem, nenhuma parada de Tab a mais no desktop. */}
      <div ref={regiao} role="region" aria-label={legenda} tabIndex={rola ? 0 : undefined} onScroll={medir} className="relative overflow-x-auto">
        <table className="w-full border-collapse text-[13.5px]">
          <caption className="sr-only">{legenda}</caption>
          <thead>
            <tr>
              {colunas.map((c, i) => (
                <th
                  key={c.chave}
                  scope="col"
                  className={`border-b border-linha px-4 pb-2.5 text-left text-xs font-semibold whitespace-nowrap text-apagado ${i === 0 ? PRESA : ''}`}
                >
                  {c.titulo}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={chave(l)} className="border-b border-linha-suave last:border-b-0">
                {colunas.map((c, i) => (
                  <td key={c.chave} className={`px-4 py-3.5 align-middle text-tinta ${i === 0 ? PRESA : LINHA_UNICA}`}>
                    {i === 0 ? <div className={LIMITE_DA_PRESA}>{c.celula(l)}</div> : c.celula(l)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {temMais && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-9 bg-linear-to-r from-transparent to-branco" />
      )}
    </div>
  )
}
