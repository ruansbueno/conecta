import type { Destino } from '../../api/schemas'
import { Icone } from './icone'

const ESTILO: Record<string, { ponto: string; fundo: string }> = {
  todos: { ponto: 'bg-destino-todos', fundo: 'bg-destino-todos-fundo' },
  turma: { ponto: 'bg-azul', fundo: 'bg-azul-superficie' },
  semestre: { ponto: 'bg-navy-suave', fundo: 'bg-destino-semestre-fundo' },
  docentes: { ponto: 'bg-destino-docentes', fundo: 'bg-alerta-fundo' },
}
const DESCONHECIDO = { ponto: 'bg-tenue', fundo: 'bg-linha-suave' }

export function rotuloDestino(d: Destino): string {
  switch (d.tipo) {
    case 'todos':
      return 'Todos os usuários'
    case 'docentes':
      return 'Docentes'
    case 'semestre':
      return `${d.semestre}º semestre`
    case 'turma':
      return d.turma?.nome ?? 'Turma'
    default:
      return d.tipo // tipo novo da API: rótulo cru, sem quebrar a tela
  }
}

/** Elemento de identidade do produto: ponto colorido por tipo + rótulo. */
export function ChipDestino({ destino, onRemover }: { destino: Destino; onRemover?: () => void }) {
  const { ponto, fundo } = ESTILO[destino.tipo] ?? DESCONHECIDO
  const rotulo = rotuloDestino(destino)
  return (
    <span
      className={`inline-flex h-7 items-center gap-1.5 rounded-full pl-2.5 ${onRemover ? 'pr-1' : 'pr-2.5'} text-[12.5px] font-medium text-navy ${fundo}`}
    >
      {/* aria-label não vale num span sem papel (axe: aria-prohibited-attr); o prefixo vai como texto
          só para o leitor de tela, e o rótulo continua legível. */}
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className={`size-1.5 rounded-full ${ponto}`} />
        <span className="sr-only">Destino: </span>
        <span>{rotulo}</span>
      </span>
      {onRemover && (
        <button
          type="button"
          onClick={onRemover}
          aria-label={`Remover destino ${rotulo}`}
          className="inline-flex size-5 items-center justify-center rounded-full text-apagado hover:text-navy"
        >
          <Icone nome="x" tamanho={13} />
        </button>
      )}
    </span>
  )
}
