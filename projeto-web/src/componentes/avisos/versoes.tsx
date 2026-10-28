// Versões do aviso (RW-21): título, conteúdo, destinos, autor e data de cada uma, com a atual em
// destaque. Abrir uma versão mostra o que ela dizia.
import { useId, useState } from 'react'

import type { Versao } from '../../api/schemas'
import { dataNumerica, dataHora } from '../../lib/datas'
import { destinoDoContrato } from '../../lib/destinos'
import { ChipDestino } from '../comum/chip-destino'

export function ListaDeVersoes({
  versoes,
  atual,
  nomes,
}: {
  versoes: Versao[]
  atual: number
  nomes: Map<string, string>
}) {
  const [aberta, setAberta] = useState<number | null>(null)
  const id = useId()
  return (
    <ul className="space-y-2.5">
      {versoes.map((v) => {
        const eAtual = v.versao === atual
        const expandida = aberta === v.versao
        return (
          <li
            key={v.versao}
            className={`rounded-xl border ${eAtual ? 'border-azul-100 bg-azul-superficie' : 'border-linha'}`}
          >
            <button
              type="button"
              aria-expanded={expandida}
              aria-controls={`${id}-v${v.versao}`}
              onClick={() => setAberta(expandida ? null : v.versao)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left"
            >
              <span className="flex-1">
                <span className="block text-[14.5px] font-semibold text-navy">
                  Versão {v.versao}
                </span>
                <span className="block text-[13px] text-apagado">
                  {dataNumerica(v.criadaEm)} · {v.criadaPor.nome}
                </span>
              </span>
              {eAtual && (
                <span className="rounded-md bg-branco px-2 py-0.5 text-xs font-semibold text-azul">
                  Atual
                </span>
              )}
            </button>
            <div
              id={`${id}-v${v.versao}`}
              hidden={!expandida}
              className="space-y-2.5 border-t border-linha-suave px-5 py-4"
            >
              {expandida && (
                <>
                  <p className="text-[14px] font-semibold text-navy">{v.titulo}</p>
                  <p className="text-[13.5px] leading-relaxed whitespace-pre-line text-navy-suave">
                    {v.conteudo}
                  </p>
                  <ul
                    aria-label={`Destinos da versão ${v.versao}`}
                    className="flex flex-wrap gap-1.5"
                  >
                    {v.destinos.map((d, i) => (
                      <li key={i}>
                        <ChipDestino destino={destinoDoContrato(d, nomes)} />
                      </li>
                    ))}
                  </ul>
                  <p className="text-[12.5px] text-tenue">
                    {v.publicarEm
                      ? `Publicação agendada para ${dataHora(v.publicarEm)}`
                      : 'Publicação imediata'}
                  </p>
                </>
              )}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
