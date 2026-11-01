// T13 (w-13, plan-f2 D-F2-12): quem dá aula na turma, derivado das aulas da grade.
import type { DocenteDaGrade } from '../../lib/grade'
import { Avatar } from '../comum/avatar'

export function DocentesDaGrade({ docentes }: { docentes: DocenteDaGrade[] }) {
  return (
    <section aria-labelledby="docentes-grade" className="rounded-xl border border-linha bg-branco">
      <h2 id="docentes-grade" className="border-b border-linha-suave px-7 py-5 text-[15px] font-semibold text-navy">
        Docentes nesta grade
      </h2>
      {docentes.length === 0 ? (
        <p className="px-7 py-5 text-[13px] text-apagado">Nenhuma aula desta grade tem docente indicado.</p>
      ) : (
        <ul className="flex flex-wrap gap-x-8 gap-y-4 px-7 py-5">
          {docentes.map((d) => (
            <li key={d.id} className="flex items-start gap-3">
              <Avatar nome={d.nome} grande />
              <span className="max-w-[180px]">
                <span className="block text-[13.5px] font-semibold text-navy">{d.nome}</span>
                <span className="block text-[12.5px] text-apagado">{d.disciplinas.join(' · ')}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
