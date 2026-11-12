import { ICONES, type NomeIcone } from './icones-svg'

/** Ícone do design (traço), decorativo: quem dá o nome acessível é o elemento que o contém. */
export function Icone({ nome, tamanho = 20, className }: { nome: NomeIcone; tamanho?: number; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      data-icone={nome}
      width={tamanho}
      height={tamanho}
      viewBox="0 0 22 22"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: ICONES[nome] }}
    />
  )
}

/** Capelo do CONECTA (mesmo desenho do aplicativo). */
export function Marca({ tamanho = 22 }: { tamanho?: number }) {
  return (
    <svg aria-hidden="true" width={tamanho} height={tamanho} viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.2 14 5.2l11 5-11 5-11-5Z" />
      <path d="M7.6 12.4v5.4c0 1.9 2.9 3.4 6.4 3.4s6.4-1.5 6.4-3.4v-5.4" />
      <path d="M24.6 10.6v6.1" />
    </svg>
  )
}
