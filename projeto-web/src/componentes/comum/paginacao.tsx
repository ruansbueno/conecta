import { Icone } from './icone'

interface Props {
  total: number
  limit: number
  offset: number
  onMudar: (offset: number) => void
}

export function Paginacao({ total, limit, offset, onMudar }: Props) {
  const fim = Math.min(offset + limit, total)
  return (
    <nav aria-label="Paginação" className="flex items-center justify-end gap-3 text-[13px] text-apagado">
      <span aria-live="polite">{total === 0 ? '0 de 0' : `${offset + 1}–${fim} de ${total}`}</span>
      <button
        type="button"
        aria-label="Página anterior"
        disabled={offset === 0}
        onClick={() => onMudar(Math.max(0, offset - limit))}
        className="botao-icone"
      >
        <Icone nome="voltar" tamanho={16} />
      </button>
      <button
        type="button"
        aria-label="Próxima página"
        disabled={fim >= total}
        onClick={() => onMudar(offset + limit)}
        className="botao-icone"
      >
        <Icone nome="seta" tamanho={16} />
      </button>
    </nav>
  )
}
