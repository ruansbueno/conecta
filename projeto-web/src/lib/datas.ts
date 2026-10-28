// Datas da API (UTC) exibidas no fuso de quem acessa, em português.

const dia = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
const hora = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const mes = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
const completa = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const semPonto = (s: string) => s.replace('.', '')
const diaMes = (d: Date) => `${d.getDate()} ${semPonto(mes.format(d))}`
const meiaNoite = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const diasAtras = (d: Date, agora: Date) => Math.round((meiaNoite(agora) - meiaNoite(d)) / 86_400_000)

/** "agora", "há 5 min", "há 2 h", "ontem", "seg, 09:12" (até 7 dias), "12 set", "3 dez 2025". */
export function dataRelativa(d: Date, agora = new Date()): string {
  const passado = agora.getTime() - d.getTime()
  const dias = diasAtras(d, agora)
  if (passado < 60_000) return 'agora'
  if (dias === 0 && passado < 3_600_000) return `há ${Math.floor(passado / 60_000)} min`
  if (dias === 0) return `há ${Math.floor(passado / 3_600_000)} h`
  if (dias === 1) return 'ontem'
  if (dias < 7) return `${semPonto(dia.format(d))}, ${hora.format(d)}`
  return d.getFullYear() === agora.getFullYear() ? diaMes(d) : `${diaMes(d)} ${d.getFullYear()}`
}

/** "16/10/2026, 08:00". */
export const dataHora = (d: Date) => completa.format(d)

/** "16 out, 08:00" — prévia do cartão do aplicativo. */
export const dataCurta = (d: Date) => `${diaMes(d)}, ${hora.format(d)}`

const diaMesNumerico = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })

/** "07/10, 14:05" — tabelas e linha do tempo da gestão; com o ano quando não é o ano corrente. */
export const dataNumerica = (d: Date, agora = new Date()) =>
  `${diaMesNumerico.format(d)}${d.getFullYear() === agora.getFullYear() ? '' : `/${d.getFullYear()}`}, ${hora.format(d)}`
