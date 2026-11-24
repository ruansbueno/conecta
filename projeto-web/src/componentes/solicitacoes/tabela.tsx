// T09 (design w-09): a fila de solicitações. Pendentes trazem as decisões; decididas mostram quem
// decidiu, quando e o motivo da recusa (RW-30). Quem espera há mais de 3 dias fica em destaque.
import type { SolicitacaoGestao } from '../../api/schemas'
import { dataNumerica, dataRelativa } from '../../lib/datas'
import { Avatar } from '../comum/avatar'
import { Tabela, type Coluna } from '../comum/tabela'

export const DIAS_DE_ESPERA = 3
const DIA_MS = 86_400_000

/** Mais de 3 dias contados em tempo (3 dias e 20 horas já conta), não em dias inteiros. */
export const esperaDemais = (s: SolicitacaoGestao, agora: Date) => agora.getTime() - s.solicitadaEm.getTime() > DIAS_DE_ESPERA * DIA_MS

/** Dias inteiros desde o pedido. */
export const diasEsperando = (s: SolicitacaoGestao, agora: Date) => Math.floor((agora.getTime() - s.solicitadaEm.getTime()) / DIA_MS)

const SELO: Record<string, { rotulo: string; classe: string }> = {
  aprovada: { rotulo: 'Aprovada', classe: 'bg-sucesso-fundo text-sucesso' },
  recusada: { rotulo: 'Recusada', classe: 'bg-perigo-fundo text-perigo' },
  cancelada: { rotulo: 'Cancelada pelo aluno', classe: 'bg-linha-suave text-apagado' },
}

function Decisao({ s, agora }: { s: SolicitacaoGestao; agora: Date }) {
  const selo = SELO[s.status] ?? { rotulo: s.status, classe: 'bg-linha-suave text-apagado' }
  return (
    <div className="text-right">
      <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${selo.classe}`}>{selo.rotulo}</span>
      {s.decididaPor && s.decididaEm && (
        <p className="mt-1 text-[12.5px] text-tenue">
          por {s.decididaPor.nome} · {dataRelativa(s.decididaEm, agora)}
        </p>
      )}
      {s.motivoRecusa && <p className="mt-1 max-w-[280px] text-[12.5px] text-apagado">Motivo: {s.motivoRecusa}</p>}
    </div>
  )
}

interface Props {
  legenda: string
  solicitacoes: SolicitacaoGestao[]
  agora: Date
  /** Uma decisão por vez: enquanto uma está em curso, as outras ficam indisponíveis. */
  ocupado: boolean
  onAprovar: (s: SolicitacaoGestao) => void
  onRecusar: (s: SolicitacaoGestao) => void
}

const DECISAO = 'h-8 rounded-lg px-2.5 text-[13px] sm:h-[42px] sm:rounded-[10px] sm:px-[18px] sm:text-sm'

export function TabelaSolicitacoes({ legenda, solicitacoes, agora, ocupado, onAprovar, onRecusar }: Props) {
  const colunas: Coluna<SolicitacaoGestao>[] = [
    {
      chave: 'aluno',
      titulo: 'Aluno',
      celula: (s) => (
        <div className="flex items-center gap-3">
          <Avatar nome={s.aluno.nome} />
          <div>
            <p className="font-semibold text-navy">{s.aluno.nome}</p>
            <p className="text-[12.5px] text-tenue">{s.aluno.username}</p>
          </div>
        </div>
      ),
    },
    { chave: 'turma', titulo: 'Turma', celula: (s) => s.turma.nome },
    {
      chave: 'solicitada',
      titulo: 'Solicitada em',
      celula: (s) => {
        const dias = diasEsperando(s, agora)
        return (
          <>
            <span className="whitespace-nowrap">{dataNumerica(s.solicitadaEm, agora)}</span>
            {s.status === 'pendente' && esperaDemais(s, agora) && (
              <span className="mt-1 block w-fit rounded-full bg-alerta-fundo px-2 py-0.5 text-xs font-semibold text-alerta">
                há {dias} dias
              </span>
            )}
          </>
        )
      },
    },
    {
      chave: 'decisao',
      titulo: 'Decisão',
      celula: (s) =>
        s.status === 'pendente' ? (
          // No celular, empilhados e menores, para caberem ao lado da coluna presa (spec 003, RR-12).
          <div className="flex flex-col gap-1.5 sm:flex-row sm:justify-end sm:gap-2">
            <button type="button" disabled={ocupado} aria-label={`Aprovar ${s.aluno.nome} em ${s.turma.nome}`} onClick={() => onAprovar(s)} className={`botao-primario ${DECISAO}`}>
              Aprovar
            </button>
            <button type="button" disabled={ocupado} aria-label={`Recusar ${s.aluno.nome} em ${s.turma.nome}`} onClick={() => onRecusar(s)} className={`botao-secundario ${DECISAO}`}>
              Recusar
            </button>
          </div>
        ) : (
          <Decisao s={s} agora={agora} />
        ),
    },
  ]
  return <Tabela legenda={legenda} colunas={colunas} linhas={solicitacoes} chave={(s) => s.id} />
}
