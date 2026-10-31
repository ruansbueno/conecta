// T06 (design w-06): histórico do aviso ou do evento do mais recente ao mais antigo, com autor, data e, nas
// edições, o que mudou — texto antes e depois, destinos como conjunto (RW-20).
import type { EventoHistorico } from '../../api/schemas'
import { dataNumerica } from '../../lib/datas'
import { compararDestinos, destinoDoContrato, type DestinoGuardado } from '../../lib/destinos'
import { NOME_DO_ASSUNTO, type Assunto } from './assunto'
import { rotuloDestino } from './chip-destino'

const ACAO: Record<string, string> = {
  criado: 'criado',
  editado: 'editado',
  arquivado: 'arquivado',
  desarquivado: 'desarquivado',
  excluido: 'excluído',
}

function titulo(assunto: Assunto, tipo: string) {
  return ACAO[tipo] ? `${NOME_DO_ASSUNTO[assunto].Nome} ${ACAO[tipo]}` : undefined
}

function resumo(assunto: Assunto, tipo: string) {
  const { ativos } = NOME_DO_ASSUNTO[assunto]
  const campos = assunto === 'aviso' ? 'título, conteúdo e destinos' : 'título, data, local e destinos'
  const resumos: Record<string, string> = {
    criado: `Versão 1 registrada com ${campos}.`,
    arquivado: `Saiu dos ${ativos} do aplicativo.`,
    desarquivado: `Voltou aos ${ativos} do aplicativo.`,
    excluido: 'Saiu do aplicativo e da gestão; versões e histórico continuam aqui.',
  }
  return resumos[tipo]
}

const PONTO: Record<string, string> = {
  criado: 'border-navy',
  editado: 'border-azul',
  arquivado: 'border-apagado',
  desarquivado: 'border-sucesso',
  excluido: 'border-perigo',
}

const ROTULO_CAMPO: Record<string, string> = {
  titulo: 'Título',
  conteudo: 'Conteúdo',
  publicar_em: 'Publicação',
  descricao: 'Descrição',
  tipo: 'Tipo',
  inicio: 'Início',
  fim: 'Fim',
  local: 'Local',
}

function quando(v: unknown) {
  if (typeof v !== 'string') return 'imediata'
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? v : dataNumerica(d)
}

function Alteracao({ campo, de, para, nomes }: { campo: string; de: unknown; para: unknown; nomes: Map<string, string> }) {
  if (campo === 'destinos') {
    const { adicionados, removidos, mantidos } = compararDestinos(de, para)
    const nomesDe = (ds: DestinoGuardado[]) => ds.map((d) => rotuloDestino(destinoDoContrato(d, nomes))).join(', ')
    const partes = [
      adicionados.length > 0 && `Adicionado: ${nomesDe(adicionados)}`,
      removidos.length > 0 && `Removido: ${nomesDe(removidos)}`,
      mantidos.length > 0 && `Mantido: ${nomesDe(mantidos)}`,
    ].filter(Boolean)
    return (
      <div>
        <p className="text-[12.5px] text-tenue">Destinos</p>
        <p className="mt-0.5 text-[13.5px] text-navy-suave">{partes.join(' · ')}</p>
      </div>
    )
  }
  if (campo === 'publicar_em') {
    return (
      <div>
        <p className="text-[12.5px] text-tenue">Publicação</p>
        <p className="mt-0.5 text-[13.5px] text-navy-suave">
          {quando(de)} → {quando(para)}
        </p>
      </div>
    )
  }
  if (campo === 'inicio' || campo === 'fim') {
    // Datas do evento; fim nulo é evento pontual.
    const data = (v: unknown) => (typeof v === 'string' ? quando(v) : 'sem fim')
    return (
      <div>
        <p className="text-[12.5px] text-tenue">{ROTULO_CAMPO[campo]}</p>
        <p className="mt-0.5 text-[13.5px] text-navy-suave">
          {data(de)} → {data(para)}
        </p>
      </div>
    )
  }
  return (
    <div>
      <p className="text-[12.5px] text-tenue">{ROTULO_CAMPO[campo] ?? campo}</p>
      <del className="mt-1 block rounded bg-perigo-fundo px-1.5 py-0.5 text-[13.5px] whitespace-pre-line text-perigo">
        <span className="sr-only">Antes: </span>
        {String(de ?? '')}
      </del>
      <ins className="mt-1 block rounded bg-sucesso-fundo px-1.5 py-0.5 text-[13.5px] whitespace-pre-line text-sucesso no-underline">
        <span className="sr-only">Depois: </span>
        {String(para ?? '')}
      </ins>
    </div>
  )
}

export function LinhaDoTempo({
  eventos,
  nomes,
  assunto = 'aviso',
}: {
  eventos: EventoHistorico[]
  nomes: Map<string, string>
  assunto?: Assunto
}) {
  return (
    <ol aria-label="Linha do tempo" className="relative">
      {eventos.map((e, i) => (
        <li key={e.id} className="relative pb-7 pl-10 last:pb-0">
          {i < eventos.length - 1 && <span aria-hidden="true" className="absolute top-5 bottom-0 left-[9px] w-px bg-linha" />}
          <span aria-hidden="true" className={`absolute top-1 left-0 size-[19px] rounded-full border-[3px] bg-branco ${PONTO[e.tipo] ?? 'border-tenue'}`} />
          <div className="flex flex-wrap items-baseline gap-x-2.5">
            <h3 className="text-[15px] font-semibold text-navy">{titulo(assunto, e.tipo) ?? e.tipo}</h3>
            <time dateTime={e.ocorridoEm.toISOString()} className="text-[13px] text-tenue">
              {dataNumerica(e.ocorridoEm)}
            </time>
          </div>
          <p className="mt-0.5 text-[13px] text-apagado">
            {e.usuario.nome}
            {e.versao !== null && e.tipo === 'editado' ? ` · versão ${e.versao}` : ''}
          </p>
          <div className="mt-3 space-y-3 rounded-xl bg-fundo px-4 py-3">
            {e.alteracoes ? (
              Object.entries(e.alteracoes).map(([campo, { de, para }]) => (
                <Alteracao key={campo} campo={campo} de={de} para={para} nomes={nomes} />
              ))
            ) : (
              <p className="text-[13.5px] text-navy-suave">{resumo(assunto, e.tipo) ?? 'Ação registrada.'}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
