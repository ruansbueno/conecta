import { Icone } from './icone'

export function EstadoErro({ mensagem, onRepetir }: { mensagem: string; onRepetir: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-12 py-16 text-center">
      <div className="flex size-[72px] items-center justify-center rounded-[22px] border border-linha bg-branco text-tenue">
        <Icone nome="info" tamanho={30} />
      </div>
      <p role="alert" className="mt-5 max-w-md text-[13.5px] leading-normal text-apagado">
        {mensagem}
      </p>
      <button type="button" onClick={onRepetir} className="botao-secundario mt-5">
        Tentar de novo
      </button>
    </div>
  )
}
