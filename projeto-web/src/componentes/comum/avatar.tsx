import { iniciais } from '../../lib/texto'

export function Avatar({ nome, grande = false }: { nome: string; grande?: boolean }) {
  return (
    <span
      role="img"
      aria-label={nome}
      className={`inline-flex shrink-0 items-center justify-center bg-painel font-semibold tracking-wide text-sobre-cor ${
        grande ? 'size-[34px] rounded-[9px] text-[12.5px]' : 'size-[30px] rounded-[8px] text-[11.5px]'
      }`}
    >
      {iniciais(nome)}
    </span>
  )
}
