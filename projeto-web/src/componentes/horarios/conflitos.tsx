// T13 (RW-36, RW-46, plan-f2 D-F2-10 e D-F2-11): resultado de uma mudança na grade. Conflito é
// atenção, não erro: a aula já está salva. Depois de salvar ou remover, oferece avisar a turma,
// porque a mudança na grade não notifica ninguém sozinha. Ao aparecer, recebe o foco.
import { useEffect, useRef } from 'react'
import { Link } from 'react-router'

export interface ResultadoDaGrade {
  texto: string
  tipo: 'sucesso' | 'atencao' | 'erro'
  conflitos?: string[]
}

interface Props {
  resultado?: ResultadoDaGrade
  turma: { id: string; codigo: string }
}

const CORES = {
  sucesso: 'border-linha bg-sucesso-fundo text-sucesso',
  atencao: 'border-linha bg-alerta-fundo text-alerta',
  erro: 'border-perigo-borda bg-perigo-fundo text-perigo',
}

export const linkAvisarTurma = (turmaId: string) => `/avisos/novo?turma=${encodeURIComponent(turmaId)}`

export function ResultadoDaAula({ resultado, turma }: Props) {
  const elemento = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (resultado) elemento.current?.focus()
  }, [resultado])
  if (!resultado) return null
  const { texto, tipo, conflitos = [] } = resultado
  return (
    <div
      ref={elemento}
      tabIndex={-1}
      role={tipo === 'erro' ? 'alert' : 'status'}
      className={`mt-5 rounded-xl border px-4 py-3 text-[13.5px] outline-none ${CORES[tipo]}`}
    >
      <p className={conflitos.length > 0 ? 'font-semibold' : undefined}>{texto}</p>
      {conflitos.length > 0 && (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-5">
          {conflitos.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      )}
      {tipo !== 'erro' && (
        <p className="mt-1.5 text-navy-suave">
          A mudança não avisa ninguém sozinha.{' '}
          <Link to={linkAvisarTurma(turma.id)} className="font-semibold text-azul underline-offset-2 hover:underline">
            Criar aviso para a {turma.codigo}
          </Link>
        </p>
      )}
    </div>
  )
}
