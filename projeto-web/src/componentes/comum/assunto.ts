// Avisos e eventos da agenda dividem destinos e histórico (plan-f2 D-F2-4): só o nome muda.
export type Assunto = 'aviso' | 'evento'

export const NOME_DO_ASSUNTO: Record<Assunto, { nome: string; Nome: string; ativos: string }> = {
  aviso: { nome: 'aviso', Nome: 'Aviso', ativos: 'avisos ativos' },
  evento: { nome: 'evento', Nome: 'Evento', ativos: 'eventos da agenda' },
}
