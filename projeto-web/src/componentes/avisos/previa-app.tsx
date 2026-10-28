// Prévia do cartão como aparece no aplicativo (design m-02 dentro de w-04; RW-22).
import type { DestinoEscolhido } from '../../api/schemas'
import { dataCurta } from '../../lib/datas'
import { destinoParaExibir } from '../../lib/formulario-aviso'
import { trecho } from '../../lib/texto'
import { Avatar } from '../comum/avatar'
import { ChipDestino } from '../comum/chip-destino'

interface Props {
  autor: string
  titulo: string
  conteudo: string
  destinos: DestinoEscolhido[]
  publicarEm: Date | null
}

const VISIVEIS = 2

export function PreviaApp({ autor, titulo, conteudo, destinos, publicarEm }: Props) {
  const resto = destinos.length - VISIVEIS
  return (
    <section aria-label="Como aparece no aplicativo" className="rounded-xl border border-linha bg-branco">
      <div className="flex items-center justify-between border-b border-linha-suave px-7 py-4">
        <h2 className="text-[15px] font-semibold text-navy">Como aparece no aplicativo</h2>
        <span className="text-[12.5px] text-tenue">pré-visualização do cartão de aviso</span>
      </div>
      <div className="p-7">
        <article className="max-w-[430px] rounded-xl border border-linha-suave px-4 py-4">
          <div className="flex items-center gap-2.5">
            <Avatar nome={autor} />
            <div>
              <p className="text-[12.5px] font-semibold text-navy-suave">{autor}</p>
              <p className="text-xs text-tenue">{publicarEm ? dataCurta(publicarEm) : 'agora'}</p>
            </div>
          </div>
          <p className="mt-2.5 text-[15px] leading-snug font-semibold tracking-[-0.012em] text-navy">
            {titulo.trim() || 'Título do aviso'}
          </p>
          <p className="mt-1.5 text-[13px] leading-normal text-apagado">{trecho(conteudo) || 'O texto do aviso aparece aqui.'}</p>
          {destinos.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {destinos.slice(0, VISIVEIS).map((d, i) => (
                <ChipDestino key={i} destino={destinoParaExibir(d)} />
              ))}
              {resto > 0 && (
                <span className="inline-flex h-7 items-center rounded-full bg-azul-superficie px-2.5 text-[12.5px] font-medium text-navy">
                  +{resto}
                </span>
              )}
            </div>
          )}
        </article>
      </div>
    </section>
  )
}
