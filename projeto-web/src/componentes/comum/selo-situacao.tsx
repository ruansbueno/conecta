const SELOS: Record<string, { rotulo: string; classe: string }> = {
  ativo: { rotulo: 'Ativo', classe: 'bg-sucesso-fundo text-sucesso' },
  agendado: { rotulo: 'Agendado', classe: 'bg-alerta-fundo text-alerta' },
  arquivado: { rotulo: 'Arquivado', classe: 'bg-linha-suave text-apagado' },
  excluido: { rotulo: 'Excluído', classe: 'bg-perigo-fundo text-perigo' },
}

/** Situação com texto visível — nunca só pela cor (RW-40). */
export function SeloSituacao({ situacao }: { situacao: string }) {
  const { rotulo, classe } = SELOS[situacao] ?? { rotulo: situacao, classe: 'bg-linha-suave text-apagado' }
  return (
    <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${classe}`}>
      {rotulo}
    </span>
  )
}
