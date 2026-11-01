// T13 (design w-13, plan-f2 D-F2-8): grade semanal da turma em tabela. Cartão com aula abre a
// edição; célula vazia abre a nova aula já com o dia e o início da linha.
import type { Aula } from '../../api/schemas'
import { NOME_DIA, type Grade } from '../../lib/grade'

interface Props {
  turma: string
  grade: Grade
  onEditar: (aula: Aula) => void
  onNova: (dia: number, inicio: string) => void
}

const detalhes = (a: Aula) => [a.local, a.docente?.nome].filter(Boolean) as string[]

function rotuloDaAula(a: Aula) {
  return [a.disciplina, NOME_DIA[a.diaSemana].toLowerCase(), `${a.inicio}–${a.fim}`, ...detalhes(a)].join(', ') + '. Editar aula'
}

export function GradeSemanal({ turma, grade, onEditar, onNova }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-linha bg-branco px-6 pt-4 pb-6">
      <table className="w-full min-w-[760px] table-fixed border-separate border-spacing-x-3 border-spacing-y-0">
        <caption className="sr-only">Grade semanal da {turma}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-16 border-b border-linha-suave pb-3 text-left">
              <span className="sr-only">Horário</span>
            </th>
            {grade.dias.map((d) => (
              <th key={d} scope="col" className="border-b border-linha-suave pb-3 text-left text-[13.5px] font-semibold text-navy">
                {NOME_DIA[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grade.linhas.map((linha) => (
            <tr key={linha.inicio}>
              <th scope="row" className="border-b border-linha-suave py-3 text-left align-top text-[12.5px] font-medium text-apagado">
                {linha.inicio}
              </th>
              {grade.dias.map((d) => {
                const aulas = linha.celulas[d]
                return (
                  <td key={d} className="border-b border-linha-suave py-3 align-top">
                    {aulas.length === 0 ? (
                      <button
                        type="button"
                        aria-label={`Adicionar aula na ${NOME_DIA[d].toLowerCase()} às ${linha.inicio}`}
                        onClick={() => onNova(d, linha.inicio)}
                        className="group flex h-[88px] w-full items-center justify-center rounded-lg border border-dashed border-linha text-tenue hover:border-azul-100 hover:bg-azul-superficie"
                      >
                        <span aria-hidden className="invisible text-lg group-hover:visible group-focus-visible:visible">
                          +
                        </span>
                      </button>
                    ) : (
                      <ul className="space-y-2">
                        {aulas.map((a) => (
                          <li key={a.id}>
                            <button
                              type="button"
                              aria-label={rotuloDaAula(a)}
                              onClick={() => onEditar(a)}
                              className="block min-h-[88px] w-full rounded-r-lg border-l-[3px] border-azul bg-azul-superficie/60 px-4 py-3 text-left hover:bg-azul-superficie"
                            >
                              <span className="block text-[13.5px] font-semibold text-navy">{a.disciplina}</span>
                              <span className="mt-1 block text-[12.5px] font-medium text-navy-suave">
                                {a.inicio}–{a.fim}
                              </span>
                              {detalhes(a).length > 0 && (
                                <span className="mt-0.5 block text-[12.5px] text-apagado">{detalhes(a).join(' · ')}</span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
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
