// Aba Mês da agenda (plan-f2 D-F2-7): semanas de segunda a domingo, até 3 títulos por dia e "+N";
// escolher um dia mostra os eventos dele abaixo. Sem desenho próprio: tokens da w-12. Tabela com
// botões (Tab passa por eles); o dia escolhido tem aria-pressed.
import { quantidade } from '../../lib/texto'
import type { EventoAgenda } from '../../api/schemas'
import { diasDoCalendario, eventosDoDia, outroMes, type Mes } from '../../lib/agenda'
import { Icone } from '../comum/icone'

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const POR_DIA = 3
const nomeDoMes = (m: Mes) => new Date(m.ano, m.mes - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
export const nomeDoDia = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

interface Props {
  mes: Mes
  eventos: EventoAgenda[]
  diaEscolhido: Date | null
  onMudarMes: (m: Mes) => void
  onEscolherDia: (d: Date) => void
}

export function CalendarioMes({ mes, eventos, diaEscolhido, onMudarMes, onEscolherDia }: Props) {
  const dias = diasDoCalendario(mes)
  const semanas = Array.from({ length: dias.length / 7 }, (_, i) => dias.slice(i * 7, i * 7 + 7))
  const hoje = new Date().toDateString()
  return (
    <div>
      <div className="flex items-center justify-between px-3 pt-4 sm:px-6 sm:pt-5">
        <button type="button" aria-label="Mês anterior" onClick={() => onMudarMes(outroMes(mes, -1))} className="botao-icone">
          <Icone nome="voltar" tamanho={18} />
        </button>
        <p className="text-[16px] font-semibold text-navy first-letter:uppercase" aria-live="polite">
          {nomeDoMes(mes)}
        </p>
        <button type="button" aria-label="Próximo mês" onClick={() => onMudarMes(outroMes(mes, 1))} className="botao-icone">
          <Icone nome="seta" tamanho={18} />
        </button>
      </div>
      <table aria-label={nomeDoMes(mes)} className="mt-4 w-full table-fixed border-collapse">
        <thead>
          <tr>
            {SEMANA.map((d) => (
              <th key={d} scope="col" className="pb-2 text-[12.5px] font-semibold text-tenue">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {semanas.map((semana, i) => (
            <tr key={i}>
              {semana.map((dia) => {
                const doDia = eventosDoDia(eventos, dia)
                const foraDoMes = dia.getMonth() !== mes.mes - 1
                const escolhido = diaEscolhido?.toDateString() === dia.toDateString()
                const quantos = doDia.length
                return (
                  <td
                    key={dia.toISOString()}
                    className={`h-[52px] border border-linha-suave align-top sm:h-[104px] ${foraDoMes ? 'bg-fundo' : 'bg-branco'} ${
                      escolhido ? 'outline-2 -outline-offset-2 outline-azul' : ''
                    }`}
                  >
                    <button
                      type="button"
                      aria-pressed={escolhido}
                      onClick={() => onEscolherDia(dia)}
                      className="flex h-full w-full flex-col items-center gap-1 p-1 text-center sm:items-stretch sm:p-2 sm:text-left"
                    >
                      <span
                        className={`text-[13px] font-semibold ${
                          dia.toDateString() === hoje ? 'text-azul' : foraDoMes ? 'text-tenue' : 'text-navy'
                        }`}
                      >
                        {dia.getDate()}
                        {/* O nome do botão começa pelo que se vê (WCAG 2.5.3): "15 de novembro, 2 eventos: …". */}
                        {' '}
                        <span className="sr-only">
                          {nomeDoDia(dia).slice(String(dia.getDate()).length).trim()}
                          {quantos ? `, ${quantidade(quantos, 'evento')}:` : ', sem eventos'}
                        </span>
                      </span>
                      {/* No celular os títulos não cabem: só a quantidade, já dita no nome do botão (spec 003, RR-16). */}
                      {quantos > 0 && (
                        <span
                          data-quantidade
                          aria-hidden="true"
                          className="min-w-[18px] rounded-full bg-azul-superficie px-1 text-[11px] leading-4 font-bold text-azul-escuro sm:hidden"
                        >
                          {quantos}
                        </span>
                      )}
                      {doDia.slice(0, POR_DIA).map((e) => (
                        <span key={e.id} className="hidden truncate rounded bg-azul-superficie px-1.5 py-0.5 text-[12px] text-navy sm:block">
                          {e.titulo}
                        </span>
                      ))}
                      {quantos > POR_DIA && <span className="hidden px-1.5 text-[12px] font-semibold text-apagado sm:block">+{quantos - POR_DIA}</span>}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
