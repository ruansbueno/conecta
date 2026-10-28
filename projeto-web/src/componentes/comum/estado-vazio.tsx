import { Icone } from './icone'
import type { NomeIcone } from './icones-svg'

interface Props {
  titulo: string
  texto: string
  icone?: NomeIcone
  acao?: string
  onAcao?: () => void
}

export function EstadoVazio({ titulo, texto, icone = 'inbox', acao, onAcao }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-12 py-16 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-[22px] border border-linha bg-branco text-tenue">
        <Icone nome={icone} tamanho={30} />
      </div>
      <h2 className="mt-5 text-base font-semibold tracking-[-0.012em] text-navy">{titulo}</h2>
      <p className="mt-2 max-w-md text-[13px] leading-normal text-apagado">{texto}</p>
      {acao && (
        <button type="button" onClick={onAcao} className="botao-secundario mt-5">
          {acao}
        </button>
      )}
    </div>
  )
}
