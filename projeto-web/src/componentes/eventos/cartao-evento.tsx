// Cartão da agenda (design w-12; plan-f2 D-F2-6): dia e mês, tipo, título, horário, local, destinos
// e as ações do evento.
import { Link } from 'react-router'

import type { EventoAgenda } from '../../api/schemas'
import { faixaDoEvento, ROTULO_TIPO } from '../../lib/agenda'
import { ChipDestino } from '../comum/chip-destino'
import { Icone } from '../comum/icone'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const COR_DO_TIPO: Record<string, string> = {
  prova: 'border-alerta text-alerta',
  banca: 'border-azul text-azul',
  palestra: 'border-azul text-azul',
}

interface Props {
  evento: EventoAgenda
  ocupado: boolean
  onArquivar: () => void
  onDesarquivar: () => void
}

export function CartaoEvento({ evento: e, ocupado, onArquivar, onDesarquivar }: Props) {
  const cor = COR_DO_TIPO[e.tipo] ?? 'border-navy text-navy'
  return (
    <li className="flex items-start gap-6 border-b border-linha-suave px-7 py-5 last:border-b-0">
      <div className="w-12 shrink-0 text-center" aria-hidden="true">
        <p className="text-[26px] leading-none font-bold text-navy">{String(e.inicio.getDate()).padStart(2, '0')}</p>
        <p className="mt-1 text-[13px] text-tenue">{MESES[e.inicio.getMonth()]}</p>
      </div>
      <div className={`min-w-0 flex-1 border-l-[3px] pl-5 ${cor.split(' ')[0]}`}>
        <p className={`text-[13px] font-semibold ${cor.split(' ')[1]}`}>{ROTULO_TIPO[e.tipo] ?? e.tipo}</p>
        <h3 className="mt-1 text-[16px] font-semibold text-navy">
          <Link to={`/eventos/${e.id}`} className="hover:underline">
            {e.titulo}
          </Link>
        </h3>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13.5px] text-apagado">
          <span className="inline-flex items-center gap-1.5">
            <Icone nome="relogio" tamanho={15} />
            <span>{faixaDoEvento(e)}</span>
          </span>
          {e.local && (
            <span className="inline-flex items-center gap-1.5">
              <Icone nome="local" tamanho={15} />
              <span>{e.local}</span>
            </span>
          )}
        </p>
      </div>
      <ul aria-label="Destinos" className="flex max-w-[300px] flex-wrap justify-end gap-1.5">
        {e.destinos.map((d, i) => (
          <li key={i}>
            <ChipDestino destino={d} />
          </li>
        ))}
      </ul>
      <div className="flex shrink-0 items-center gap-1">
        {e.situacao === 'ativo' && (
          <>
            <Link to={`/eventos/${e.id}/editar`} aria-label={`Editar “${e.titulo}”`} title="Editar" className="botao-icone">
              <Icone nome="lapis" tamanho={17} />
            </Link>
            <button
              type="button"
              aria-label={`Arquivar “${e.titulo}”`}
              title="Arquivar"
              disabled={ocupado}
              onClick={onArquivar}
              className="botao-icone"
            >
              <Icone nome="arquivo" tamanho={17} />
            </button>
          </>
        )}
        {e.situacao === 'arquivado' && (
          <button
            type="button"
            aria-label={`Desarquivar “${e.titulo}”`}
            title="Desarquivar"
            disabled={ocupado}
            onClick={onDesarquivar}
            className="botao-icone"
          >
            <Icone nome="seta" tamanho={17} />
          </button>
        )}
        <Link to={`/eventos/${e.id}?aba=historico`} aria-label={`Histórico de “${e.titulo}”`} title="Histórico e versões" className="botao-icone">
          <Icone nome="historico" tamanho={17} />
        </Link>
      </div>
    </li>
  )
}
