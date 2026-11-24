// T02/T14 (design w-02, w-14): painel da coordenação e do docente. Não há endpoint de resumo: os
// números vêm do `total` das listas, e cada bloco carrega e falha sozinho, com seu "tentar de novo"
// (D13). O docente recebe só o que é dele: quem filtra é a API.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { listarAvisos } from '../api/recursos/avisos'
import { listarSolicitacoes } from '../api/recursos/solicitacoes'
import { listarTurmas } from '../api/recursos/turmas'
import type { AvisoGestao, Pagina, SolicitacaoGestao, Turma } from '../api/schemas'
import { Avatar } from '../componentes/comum/avatar'
import { ChipDestino } from '../componentes/comum/chip-destino'
import { FimDaLista } from '../componentes/comum/fim-da-lista'
import { Icone } from '../componentes/comum/icone'
import { SeloSituacao } from '../componentes/comum/selo-situacao'
import { VazioDoBloco } from '../componentes/comum/vazio-do-bloco'
import { dataNumerica, dataRelativa } from '../lib/datas'
import { estaAgendado } from '../lib/formulario-aviso'
import { quantidade } from '../lib/texto'
import { useSessao } from '../sessao/contexto'
import { MensagemDaAcao } from '../componentes/comum/mensagem-da-acao'
import { mensagemDe, useMensagemTrazida, type Carga } from './comum'

/** Um bloco do painel: carrega sozinho e pode ser repetido sozinho. */
function useBloco<T>(buscar: () => Promise<T>) {
  const [carga, setCarga] = useState<Carga<T>>({ estado: 'carregando' })
  // Quando a resposta chegou: a referência de "há 2 h" e de "agendado" neste bloco.
  const [em, setEm] = useState(() => new Date())
  const [vez, setVez] = useState(0)
  const buscarAtual = useRef(buscar)
  useEffect(() => {
    buscarAtual.current = buscar
  })
  useEffect(() => {
    let valido = true
    buscarAtual
      .current()
      .then((dados) => {
        if (!valido) return
        setEm(new Date())
        setCarga({ estado: 'pronto', dados })
      })
      .catch((e: unknown) => valido && setCarga({ estado: 'erro', mensagem: mensagemDe(e), repetivel: true }))
    return () => {
      valido = false
    }
  }, [vez])
  return {
    carga,
    em,
    // Volta a "carregando": quem tenta de novo vê que algo aconteceu, e uma nova falha é anunciada.
    repetir: () => {
      setCarga({ estado: 'carregando' })
      setVez((n) => n + 1)
    },
  }
}

/** "SI-3A" → ["SI", "3A"]; "TADS-3A-2026-2" → ["TADS", "3A"] (o design mostra a sigla em duas linhas). */
const sigla = (codigo: string) => codigo.split('-').filter(Boolean).slice(0, 2)

const saudacao = (agora: Date) => (agora.getHours() < 12 ? 'Bom dia' : agora.getHours() < 18 ? 'Boa tarde' : 'Boa noite')

function Falha({ mensagem, onRepetir }: { mensagem: string; onRepetir: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 text-[13px] text-apagado">
      <span>{mensagem}</span>
      <button type="button" onClick={onRepetir} className="botao-secundario">
        Tentar de novo
      </button>
    </div>
  )
}

function Bloco<T>({
  titulo,
  carga,
  repetir,
  acao,
  destaque,
  children,
}: {
  titulo: string
  carga: Carga<T>
  repetir: () => void
  acao?: ReactNode
  destaque?: ReactNode
  children: (dados: T) => ReactNode
}) {
  const id = `bloco-${titulo.replace(/\W+/g, '-')}`
  return (
    <section aria-labelledby={id} className="rounded-xl border border-linha bg-branco">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-linha-suave px-6 py-4">
        <h2 id={id} className="text-[15px] font-semibold whitespace-nowrap text-navy">
          {titulo}
        </h2>
        {destaque}
        {acao}
      </div>
      {carga.estado === 'carregando' ? (
        <p role="status" className="px-6 py-6 text-[13px] text-tenue">
          Carregando…
        </p>
      ) : carga.estado === 'erro' ? (
        <Falha mensagem={carga.mensagem} onRepetir={repetir} />
      ) : (
        children(carga.dados)
      )}
    </section>
  )
}

function Numero({ rotulo, detalhe, carga, repetir, cor = 'text-navy' }: {
  rotulo: string
  detalhe: string
  carga: Carga<Pagina<unknown>>
  repetir: () => void
  cor?: string
}) {
  return (
    <section aria-label={rotulo} className="rounded-xl border border-linha bg-branco px-4 py-4 sm:px-6 sm:py-5">
      {carga.estado === 'erro' ? (
        <div className="flex flex-wrap items-baseline gap-x-2">
          <p role="alert" className="text-[13px] text-perigo">
            Não foi possível carregar.
          </p>
          <button type="button" onClick={repetir} className="text-[13px] font-semibold text-azul hover:underline">
            Tentar de novo
          </button>
        </div>
      ) : (
        <p className={`text-[34px] leading-none font-bold ${cor}`}>
          {carga.estado === 'pronto' ? carga.dados.total.toLocaleString('pt-BR') : '…'}
        </p>
      )}
      <p className="mt-3 text-[15px] font-semibold text-navy">{rotulo}</p>
      <p className="mt-1 text-[13px] text-apagado">{detalhe}</p>
    </section>
  )
}

function LinhaAviso({ a, agora, autor = true }: { a: AvisoGestao; agora: Date; autor?: boolean }) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-linha-suave px-4 py-3.5 last:border-b-0 sm:px-6">
      {/* No celular, destinos e situação descem para baixo do título (spec 003, RR-14). */}
      <div className="min-w-0 basis-full sm:flex-1 sm:basis-0">
        <Link to={`/avisos/${a.id}`} className="font-semibold text-navy hover:underline">
          {a.titulo}
        </Link>
        <p className="mt-0.5 text-[12.5px] text-tenue">
          {autor && `${a.autor.nome} · `}
          {/* Agendado ainda não foi ao ar: a data é futura e não cabe em "há tanto tempo". */}
          {estaAgendado(a, agora) && a.publicarEm
            ? `vai ao ar em ${dataNumerica(a.publicarEm, agora)}`
            : dataRelativa(a.publicarEm ?? a.publicadoEm, agora)}
        </p>
      </div>
      <ul className="flex flex-1 flex-wrap gap-1.5 sm:flex-initial">
        {a.destinos.slice(0, 2).map((d, i) => (
          <li key={i}>
            <ChipDestino destino={d} />
          </li>
        ))}
      </ul>
      <SeloSituacao situacao={estaAgendado(a, agora) ? 'agendado' : a.situacao} />
    </li>
  )
}

/** Todos os itens da lista couberam no bloco: o bloco diz que acabou (spec 002, FR-010). */
const acabou = (mostrados: number, total: number) => mostrados > 0 && total <= mostrados

function ListaPendentes({ itens, total, agora }: { itens: SolicitacaoGestao[]; total: number; agora: Date }) {
  if (itens.length === 0) return <VazioDoBloco icone="check" texto="Nenhuma solicitação esperando decisão." />
  return (
    <>
      <ul>
        {itens.map((s) => (
          <li key={s.id} className="flex items-center gap-3 border-b border-linha-suave px-6 py-3 last:border-b-0">
            <Avatar nome={s.aluno.nome} />
            <div className="min-w-0">
              <p className="font-semibold text-navy">{s.aluno.nome}</p>
              <p className="truncate text-[12.5px] text-tenue">
                {s.turma.nome} · {dataRelativa(s.solicitadaEm, agora)}
              </p>
            </div>
          </li>
        ))}
      </ul>
      {acabou(itens.length, total) && <FimDaLista texto="Não há mais solicitações esperando decisão." />}
    </>
  )
}

/** Avisos do bloco, com o fecho quando todos couberam nele. */
function ListaAvisos({ p, agora, autor }: { p: Pagina<AvisoGestao>; agora: Date; autor?: boolean }) {
  return (
    <>
      <ul>
        {p.items.map((a) => (
          <LinhaAviso key={a.id} a={a} agora={agora} autor={autor} />
        ))}
      </ul>
      {acabou(p.items.length, p.total) && <FimDaLista texto="Não há mais avisos recentes." />}
    </>
  )
}

const publicarAviso = (
  <Link to="/avisos/novo" className="botao-secundario mt-4">
    Publicar aviso
  </Link>
)

const irParaFila = (
  <Link to="/solicitacoes" className="text-[13.5px] font-semibold whitespace-nowrap text-azul hover:underline">
    Decidir na fila
  </Link>
)
const verAvisos = (
  <Link to="/avisos" aria-label="Ver todos os avisos" className="text-[13.5px] font-semibold text-azul hover:underline">
    Ver todos
  </Link>
)
const contaPendentes = (carga: Carga<Pagina<unknown>>) =>
  carga.estado === 'pronto' && carga.dados.total > 0 ? (
    <span className="ml-auto rounded-full bg-alerta-fundo px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-alerta">
      {carga.dados.total.toLocaleString('pt-BR')} {carga.dados.total === 1 ? 'pendente' : 'pendentes'}
    </span>
  ) : null

function PainelCoordenacao() {
  const ativos = useBloco(() => listarAvisos({ situacao: 'ativo', limit: 1 }))
  const agendados = useBloco(() => listarAvisos({ situacao: 'agendado', limit: 1 }))
  const pendentes = useBloco(() => listarSolicitacoes({ status: 'pendente', limit: 4 }))
  const turmas = useBloco(() => listarTurmas({ ativa: true, limit: 1 }))
  const recentes = useBloco(() => listarAvisos({ limit: 5 }))
  const resumo =
    ativos.carga.estado === 'pronto' && pendentes.carga.estado === 'pronto'
      ? `${quantidade(ativos.carga.dados.total, 'aviso')} ${ativos.carga.dados.total === 1 ? 'ativo' : 'ativos'} e ${
          pendentes.carga.dados.total === 1 ? '1 solicitação' : `${pendentes.carga.dados.total.toLocaleString('pt-BR')} solicitações`
        } esperando decisão.`
      : ''

  return (
    <>
      <p className="mt-2 min-h-5 text-[14px] text-apagado">{resumo}</p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Numero rotulo="Avisos ativos" detalhe="publicados e no ar no aplicativo" {...ativos} />
        <Numero rotulo="Avisos agendados" detalhe="aparecem na data marcada" cor="text-alerta" {...agendados} />
        <Numero rotulo="Solicitações pendentes" detalhe="esperando decisão" cor="text-alerta" {...pendentes} />
        <Numero rotulo="Turmas ativas" detalhe="recebendo avisos e inscrições" {...turmas} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Bloco titulo="Avisos recentes" carga={recentes.carga} repetir={recentes.repetir} acao={verAvisos}>
          {(p) =>
            p.items.length === 0 ? (
              <VazioDoBloco icone="avisos" texto="Nenhum aviso publicado ainda." acao={publicarAviso} />
            ) : (
              <ListaAvisos p={p} agora={recentes.em} />
            )
          }
        </Bloco>
        <Bloco
          titulo="Solicitações de inscrição"
          carga={pendentes.carga}
          repetir={pendentes.repetir}
          destaque={contaPendentes(pendentes.carga)}
          acao={irParaFila}
        >
          {(p) => <ListaPendentes itens={p.items} total={p.total} agora={pendentes.em} />}
        </Bloco>
      </div>
    </>
  )
}

const PERMITE_DOCENTE: { pode: boolean; titulo: string; texto: string }[] = [
  { pode: true, titulo: 'Publicar para suas turmas', texto: 'Avisos com destino nas turmas em que você leciona.' },
  { pode: true, titulo: 'Decidir solicitações', texto: 'Aprovar ou recusar inscrições apenas nessas mesmas turmas.' },
  { pode: false, titulo: 'Publicar para todos ou por semestre', texto: 'Esses destinos são da coordenação e da administração.' },
  { pode: false, titulo: 'Editar avisos de outras pessoas', texto: 'Você edita, arquiva e exclui somente o que publicou.' },
]

function PainelDocente() {
  const turmas = useBloco(() => listarTurmas({ ativa: true, limit: 100 }))
  const pendentes = useBloco(() => listarSolicitacoes({ status: 'pendente', limit: 100 }))
  const avisos = useBloco(() => listarAvisos({ limit: 5 }))
  const porTurma = new Map<string, number>()
  if (pendentes.carga.estado === 'pronto') {
    for (const s of pendentes.carga.dados.items) porTurma.set(s.turma.id, (porTurma.get(s.turma.id) ?? 0) + 1)
  }
  const total = turmas.carga.estado === 'pronto' ? turmas.carga.dados.total : null

  return (
    <>
      <p className="mt-2 min-h-5 text-[14px] text-apagado">
        {total === null
          ? ''
          : total === 0
            ? 'Você ainda não leciona em nenhuma turma ativa. A coordenação faz os vínculos.'
            : `Você leciona em ${quantidade(total, 'turma')}. Pode publicar avisos e decidir solicitações apenas nelas.`}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Bloco titulo="Minhas turmas" carga={turmas.carga} repetir={turmas.repetir}>
          {(p: Pagina<Turma>) =>
            p.items.length === 0 ? (
              <VazioDoBloco icone="turmas" texto="Nenhuma turma ativa." />
            ) : (
              <ul>
                {p.items.map((t) => {
                  const n = porTurma.get(t.id) ?? 0
                  return (
                    <li key={t.id} className="flex items-center gap-3 border-b border-linha-suave px-6 py-3 last:border-b-0">
                      <span
                        aria-hidden="true"
                        className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-azul-superficie text-[11px] leading-tight font-bold text-azul"
                      >
                        {sigla(t.codigo).map((parte, i) => (
                          <span key={i}>{parte}</span>
                        ))}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link to={`/turmas/${t.id}`} className="font-semibold text-navy hover:underline">
                          {t.nome}
                        </Link>
                        <p className="text-[12.5px] text-tenue">{quantidade(t.totalAlunos, 'aluno')}</p>
                      </div>
                      {pendentes.carga.estado === 'pronto' &&
                        (n > 0 ? (
                          <span className="rounded-full bg-alerta-fundo px-2.5 py-0.5 text-xs font-semibold text-alerta">
                            {n} {n === 1 ? 'solicitação' : 'solicitações'}
                          </span>
                        ) : (
                          <span className="text-[12.5px] text-tenue">sem pendências</span>
                        ))}
                    </li>
                  )
                })}
              </ul>
            )
          }
        </Bloco>
        <Bloco titulo="Meus avisos" carga={avisos.carga} repetir={avisos.repetir} acao={verAvisos}>
          {(p) =>
            p.items.length === 0 ? (
              <VazioDoBloco icone="avisos" texto="Você ainda não publicou avisos." acao={publicarAviso} />
            ) : (
              <ListaAvisos p={p} agora={avisos.em} autor={false} />
            )
          }
        </Bloco>
      </div>
      <div className="mt-6">
        <Bloco
          titulo="Solicitações das minhas turmas"
          carga={pendentes.carga}
          repetir={pendentes.repetir}
          destaque={contaPendentes(pendentes.carga)}
          acao={irParaFila}
        >
          {(p) => <ListaPendentes itens={p.items.slice(0, 4)} total={p.total} agora={pendentes.em} />}
        </Bloco>
      </div>
      <section aria-labelledby="perfil-permite" className="mt-6 rounded-xl border border-linha bg-branco">
        <h2 id="perfil-permite" className="border-b border-linha-suave px-6 py-4 text-[15px] font-semibold text-navy">
          O que seu perfil permite
        </h2>
        <ul className="grid gap-6 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4">
          {PERMITE_DOCENTE.map((p) => (
            <li key={p.titulo}>
              <p className="flex items-start gap-2 text-[14px] font-semibold text-navy">
                <Icone nome={p.pode ? 'check' : 'x'} tamanho={16} className={`mt-0.5 shrink-0 ${p.pode ? 'text-sucesso' : 'text-perigo'}`} />
                <span>
                  <span className="sr-only">{p.pode ? 'Pode: ' : 'Não pode: '}</span>
                  {p.titulo}
                </span>
              </p>
              <p className="mt-1 text-[13px] text-apagado">{p.texto}</p>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}

export default function Painel() {
  const { usuario } = useSessao()
  const [agora] = useState(() => new Date())
  const trazida = useMensagemTrazida()
  // Um objeto só, criado uma vez: a mensagem pega o foco ao aparecer, e não a cada renderização.
  const [mensagem] = useState(() => (trazida ? { texto: trazida, erro: false } : undefined))
  if (!usuario) return null
  const docente = usuario.perfil === 'docente'
  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <h1 className="titulo-pagina">
          {saudacao(agora)}, {usuario.nome.split(' ')[0]}
        </h1>
        <Link to="/avisos/novo" className="botao-primario acao-pagina">
          <Icone nome="mais" tamanho={18} />
          Novo aviso
        </Link>
      </header>
      <MensagemDaAcao mensagem={mensagem} />
      {docente ? <PainelDocente /> : <PainelCoordenacao />}
    </div>
  )
}
