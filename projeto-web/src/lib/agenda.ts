// Regras puras da agenda (plan-f2 D-F2-1, D-F2-6, D-F2-7): abas, mês, calendário e o texto de
// horário do cartão. Datas sempre no fuso do navegador.
import type { FiltrosEventos } from '../api/recursos/eventos'

export const ABAS_AGENDA = ['proximos', 'mes', 'realizados', 'arquivados'] as const
export type AbaAgenda = (typeof ABAS_AGENDA)[number]

export const ROTULO_ABA: Record<AbaAgenda, string> = {
  proximos: 'Próximos',
  mes: 'Mês',
  realizados: 'Realizados',
  arquivados: 'Arquivados',
}

export const TIPOS_EVENTO = ['palestra', 'banca', 'reuniao', 'formatura', 'prova', 'data_importante', 'outro'] as const

export const ROTULO_TIPO: Record<string, string> = {
  palestra: 'Palestra',
  banca: 'Banca',
  reuniao: 'Reunião',
  formatura: 'Formatura',
  prova: 'Prova',
  data_importante: 'Data importante',
  outro: 'Evento',
}

export interface Mes {
  ano: number
  /** 1 a 12 */
  mes: number
}

export const abaDaUrl = (v: string | null): AbaAgenda =>
  (ABAS_AGENDA as readonly string[]).includes(v ?? '') ? (v as AbaAgenda) : 'proximos'

export function mesDaUrl(v: string | null, hoje = new Date()): Mes {
  const m = /^(\d{4})-(\d{2})$/.exec(v ?? '')
  const mes = m ? Number(m[2]) : 0
  return m && mes >= 1 && mes <= 12 ? { ano: Number(m[1]), mes } : { ano: hoje.getFullYear(), mes: hoje.getMonth() + 1 }
}

export const mesNaUrl = ({ ano, mes }: Mes) => `${ano}-${String(mes).padStart(2, '0')}`

export function outroMes({ ano, mes }: Mes, passo: number): Mes {
  const d = new Date(ano, mes - 1 + passo, 1)
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 }
}

/** Do dia 1 ao dia 1 do mês seguinte: a API devolve tudo que toca essa janela. */
export const janelaDoMes = ({ ano, mes }: Mes) => ({ de: new Date(ano, mes - 1, 1), ate: new Date(ano, mes, 1) })

export function consultaDaAba(aba: AbaAgenda, mes: Mes): FiltrosEventos {
  switch (aba) {
    case 'proximos':
      return { situacao: 'ativo', quando: 'proximos' }
    case 'realizados':
      return { situacao: 'ativo', quando: 'realizados' }
    case 'arquivados':
      return { situacao: 'arquivado' }
    case 'mes':
      return { situacao: 'ativo', ...janelaDaGrade(mes) }
  }
}

/** Do primeiro ao último dia mostrados no calendário: os dias de outros meses também têm eventos. */
export function janelaDaGrade(mes: Mes) {
  const dias = diasDoCalendario(mes)
  const ultimo = dias[dias.length - 1]
  return { de: dias[0], ate: new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1) }
}

/** Semanas inteiras, de segunda a domingo, que cobrem o mês. */
export function diasDoCalendario({ ano, mes }: Mes): Date[] {
  const primeiro = new Date(ano, mes - 1, 1)
  const recuo = (primeiro.getDay() + 6) % 7 // segunda = 0
  const ultimo = new Date(ano, mes, 0)
  const avanco = 6 - ((ultimo.getDay() + 6) % 7)
  const total = recuo + ultimo.getDate() + avanco
  return Array.from({ length: total }, (_, i) => new Date(ano, mes - 1, 1 - recuo + i))
}

interface NoTempo {
  inicio: Date
  fim: Date | null
}

/** Eventos que tocam o dia [00:00, 00:00 do dia seguinte); o que termina à meia-noite não entra. */
export function eventosDoDia<T extends NoTempo>(eventos: T[], dia: Date): T[] {
  const comeco = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate())
  const seguinte = new Date(dia.getFullYear(), dia.getMonth(), dia.getDate() + 1)
  return eventos.filter((e) => e.inicio < seguinte && (e.fim ? e.fim > comeco : e.inicio >= comeco))
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')
const hhmm = (d: Date) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`
const ddmm = (d: Date) => `${doisDigitos(d.getDate())}/${doisDigitos(d.getMonth() + 1)}`
const DIA_MS = 86_400_000

/** Texto de horário do cartão da agenda (D-F2-6). */
export function faixaDoEvento({ tipo, inicio, fim }: { tipo: string } & NoTempo): string {
  if (!fim) return tipo === 'data_importante' ? `até ${hhmm(inicio)}` : hhmm(inicio)
  // Terminar à meia-noite conta como o fim do dia em que começou.
  const ultimoInstante = new Date(fim.getTime() - 1)
  if (ultimoInstante.toDateString() === inicio.toDateString()) return `${hhmm(inicio)} – ${hhmm(fim)}`
  // O ano só aparece quando as duas datas caem em anos diferentes (o cartão já não mostra o ano).
  const outroAno = inicio.getFullYear() !== ultimoInstante.getFullYear()
  const data = (d: Date) => (outroAno ? `${ddmm(d)}/${d.getFullYear()}` : ddmm(d))
  // Menos de um dia que vira a noite (22:00 às 02:00): as datas sozinhas perderiam as horas.
  if (fim.getTime() - inicio.getTime() < DIA_MS) return `${data(inicio)} ${hhmm(inicio)} – ${data(fim)} ${hhmm(fim)}`
  return `de ${data(inicio)} a ${data(ultimoInstante)}`
}
