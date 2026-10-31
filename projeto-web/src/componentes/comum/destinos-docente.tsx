// T15 (design w-15): o docente escolhe só entre as turmas em que leciona; os demais tipos aparecem
// indisponíveis e explicados, não escondidos (RW-17). Quem recusa de fato é a API.
import { useId } from 'react'

import type { DestinoEscolhido, Turma } from '../../api/schemas'
import { chaveDestino } from '../../lib/formulario-aviso'
import { quantidade } from '../../lib/texto'

const INDISPONIVEIS = ['Todos os usuários', 'Semestre inteiro', 'Todos os docentes']

interface Props {
  turmas: Turma[]
  escolhidos: DestinoEscolhido[]
  /** Erro do campo de destinos, anunciado junto de cada turma. */
  idErro?: string
  onMudar: (destinos: DestinoEscolhido[]) => void
}

export function DestinosDocente({ turmas, escolhidos, idErro, onMudar }: Props) {
  const id = useId()
  const marcados = new Set(escolhidos.map(chaveDestino))
  const alternar = (d: DestinoEscolhido) =>
    onMudar(
      marcados.has(chaveDestino(d))
        ? escolhidos.filter((e) => chaveDestino(e) !== chaveDestino(d))
        : [...escolhidos, d],
    )

  return (
    <div className="space-y-2.5">
      {turmas.length === 0 && (
        <p className="rounded-xl border border-linha bg-fundo px-4 py-3 text-[13px] text-apagado">
          Você não leciona em nenhuma turma ativa no momento.
        </p>
      )}
      {turmas.map((t) => {
        const d: DestinoEscolhido = { tipo: 'turma', turmaId: t.id, turmaNome: t.nome }
        const marcado = marcados.has(chaveDestino(d))
        return (
          <label
            key={t.id}
            className={`flex cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3 ${
              marcado ? 'border-azul-100 bg-azul-superficie' : 'border-linha hover:bg-fundo'
            }`}
          >
            <input
              type="checkbox"
              className="size-[18px] accent-azul"
              aria-describedby={idErro}
              checked={marcado}
              onChange={() => alternar(d)}
            />
            <span>
              <span className="block text-[14px] font-semibold text-navy">
                {t.codigo} — {t.nome}
              </span>
              <span className="block text-[12.5px] text-apagado">
                {t.semestreCurso}º semestre · {quantidade(t.totalAlunos, 'aluno')}
              </span>
            </span>
          </label>
        )
      })}
      <div className="mt-3 border-t border-linha-suave pt-3" />
      {INDISPONIVEIS.map((rotulo, i) => (
        <label key={rotulo} className="flex items-center gap-3.5 rounded-xl border border-dashed border-linha bg-fundo px-4 py-3">
          <input type="checkbox" disabled className="size-[18px]" aria-describedby={`${id}-indisp-${i}`} />
          <span className="flex-1">
            <span className="block text-[14px] font-semibold text-tenue">{rotulo}</span>
            <span id={`${id}-indisp-${i}`} className="block text-[12.5px] text-tenue">
              Apenas coordenação e administração
            </span>
          </span>
          <span className="text-[12.5px] text-tenue">Indisponível</span>
        </label>
      ))}
    </div>
  )
}
