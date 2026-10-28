// Confirmação depois de publicar ou salvar: mostra o que foi criado e para quem (sem a lista de
// avisos nesta etapa, a página para aqui).
import type { ReactNode } from 'react'

import type { AvisoGestao } from '../../api/schemas'
import { dataHora } from '../../lib/datas'
import { estaAgendado } from '../../lib/formulario-aviso'
import { ChipDestino } from '../comum/chip-destino'
import { Icone } from '../comum/icone'
import { SeloSituacao } from '../comum/selo-situacao'

export function AvisoSalvo({ titulo, aviso, children }: { titulo: string; aviso: AvisoGestao; children: ReactNode }) {
  const agendado = estaAgendado(aviso)
  return (
    <section className="mx-auto max-w-2xl rounded-xl border border-linha bg-branco p-8">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-sucesso-fundo text-sucesso">
          <Icone nome="check" tamanho={22} />
        </span>
        <h1 className="text-[22px] font-bold tracking-[-0.02em] text-navy">{titulo}</h1>
      </div>
      <p className="mt-4 text-[13.5px] text-apagado">
        {agendado
          ? `Aparece no aplicativo em ${dataHora(aviso.publicarEm!)}.`
          : 'Quem está nos destinos abaixo já vê o aviso no aplicativo.'}
      </p>
      <div className="mt-5 rounded-xl border border-linha-suave p-5">
        <div className="flex items-start justify-between gap-4">
          <p className="text-[15px] font-semibold text-navy">{aviso.titulo}</p>
          <SeloSituacao situacao={aviso.situacao} />
        </div>
        <p className="mt-1 text-[12.5px] text-tenue">Versão {aviso.versaoAtual}</p>
        <ul aria-label="Destinos do aviso" className="mt-3 flex flex-wrap gap-2">
          {aviso.destinos.map((d, i) => (
            <li key={i}>
              <ChipDestino destino={d} />
            </li>
          ))}
        </ul>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">{children}</div>
    </section>
  )
}
