import { Icone } from './icone'

interface Props {
  rotulo: string
  valor: string
  onMudar: (valor: string) => void
  dica?: string
  maxLength?: number
}

export function Busca({ rotulo, valor, onMudar, dica, maxLength }: Props) {
  return (
    <label className="campo flex items-center gap-2.5">
      <Icone nome="busca" tamanho={17} className="text-tenue" />
      <input
        type="search"
        aria-label={rotulo}
        placeholder={dica ?? rotulo}
        value={valor}
        maxLength={maxLength}
        onChange={(e) => onMudar(e.target.value)}
        className="w-full bg-transparent outline-none placeholder:text-tenue"
      />
    </label>
  )
}
