/**
 * Bolinha laranja com a quantidade de pendências, na barra lateral e nas abas. O número visível faz
 * parte do nome do controle (rótulo no nome, WCAG 2.5.3): "Solicitações 3 pendentes". Sem
 * pendências, não aparece. A margem negativa e o alinhamento ao meio evitam que o círculo aumente a
 * altura da linha (nas abas, o rótulo ficaria fora da linha dos outros).
 */
export function ContadorPendentes({ quantidade }: { quantidade: number }) {
  if (quantidade <= 0) return null
  return (
    <>
      {' '}
      <span className="-my-1 inline-flex size-[22px] items-center justify-center rounded-full align-middle bg-alerta-fundo text-[11.5px] font-semibold text-alerta">
        {quantidade.toLocaleString('pt-BR')}
      </span>{' '}
      <span className="sr-only">{quantidade === 1 ? 'pendente' : 'pendentes'}</span>
    </>
  )
}
