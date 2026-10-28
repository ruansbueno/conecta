// T09 (design w-09): fila de solicitações de inscrição por status e turma (RW-28). Aprovar cria o
// vínculo; recusar aceita motivo (RW-29); a linha decidida mostra quem decidiu e quando (RW-30).
// O docente vê e decide só as das turmas em que leciona: quem filtra é a API.
import { useEffect, useRef, useState } from 'react'
import { useOutletContext } from 'react-router'

import { ApiError } from '../api/erros'
import {
  aprovarSolicitacao,
  listarSolicitacoes,
  recusarSolicitacao,
  type StatusSolicitacao,
} from '../api/recursos/solicitacoes'
import { listarTurmas } from '../api/recursos/turmas'
import type { SolicitacaoGestao } from '../api/schemas'
import { Abas, idDaAba, idDoPainel } from '../componentes/comum/abas'
import { Esqueleto } from '../componentes/comum/esqueleto'
import { EstadoErro } from '../componentes/comum/estado-erro'
import { EstadoVazio } from '../componentes/comum/estado-vazio'
import { Paginacao } from '../componentes/comum/paginacao'
import { RecusarModal } from '../componentes/solicitacoes/recusar-modal'
import { DIAS_DE_ESPERA, diasEsperando, TabelaSolicitacoes } from '../componentes/solicitacoes/tabela'
import { mensagemDe } from './comum'
import type { ContextoGestao } from './area-gestao'
import { idDaUrl, paginaDaUrl, useCargaPaginada, useFiltrosNaUrl } from './lista-na-url'

const STATUS: { id: StatusSolicitacao; rotulo: string }[] = [
  { id: 'pendente', rotulo: 'Pendentes' },
  { id: 'aprovada', rotulo: 'Aprovadas' },
  { id: 'recusada', rotulo: 'Recusadas' },
  { id: 'cancelada', rotulo: 'Canceladas pelo aluno' },
]
const VAZIO: Record<StatusSolicitacao, [string, string]> = {
  pendente: ['Nenhuma solicitação pendente', 'Quando um aluno pedir inscrição numa turma, o pedido aparece aqui.'],
  aprovada: ['Nenhuma solicitação aprovada', 'As aprovações aparecem aqui com quem decidiu e quando.'],
  recusada: ['Nenhuma solicitação recusada', 'As recusas aparecem aqui com quem decidiu, quando e o motivo.'],
  cancelada: ['Nenhuma solicitação cancelada', 'Pedidos que o próprio aluno desistiu aparecem aqui.'],
}
const POR_PAGINA = 20
const ID_ABAS = 'solicitacoes-status'
const SEM_TURMA = 'Você só pode decidir as solicitações das turmas em que leciona.'
const NAO_E_ALUNO = 'Esta pessoa não tem mais perfil de aluno. Recuse a solicitação.'

/** Mensagem da decisão recusada pela API, com o sentido que ela tem nesta fila. */
function mensagemDaDecisao(e: unknown) {
  if (e instanceof ApiError && e.code === 'SEM_PERMISSAO') return SEM_TURMA
  if (e instanceof ApiError && e.code === 'PERFIL_INCOMPATIVEL') return NAO_E_ALUNO
  return mensagemDe(e)
}

export default function Solicitacoes() {
  const { params, filtrar } = useFiltrosNaUrl()
  const pedido = params.get('status') as StatusSolicitacao | null
  const status: StatusSolicitacao = STATUS.some((s) => s.id === pedido) ? pedido! : 'pendente'
  const turma = idDaUrl(params.get('turma'))
  const offset = (paginaDaUrl(params.get('pagina')) - 1) * POR_PAGINA

  const { carga, recarregar } = useCargaPaginada(
    JSON.stringify([status, turma]),
    () => listarSolicitacoes({ status, turma_id: turma || undefined, limit: POR_PAGINA, offset }),
    { offset, porPagina: POR_PAGINA, filtrar },
  )
  // Decisões feitas nesta página: a linha continua à vista mostrando quem decidiu e quando (RW-30),
  // enquanto a fila em si vem sempre do servidor (sem deslocar a paginação). Trocar de página,
  // aba ou turma descarta essas linhas.
  const chave = JSON.stringify([status, turma, offset])
  const [decididas, setDecididas] = useState({ chave, mapa: new Map<string, SolicitacaoGestao>() })
  const decididasAqui = decididas.chave === chave ? decididas.mapa : new Map<string, SolicitacaoGestao>()
  const [pendentes, setPendentes] = useState<number | null>(null)
  const [contagem, setContagem] = useState(0)
  const [turmas, setTurmas] = useState<{ id: string; nome: string }[]>([])
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean }>()
  const [recusando, setRecusando] = useState<SolicitacaoGestao | null>(null)
  const [erroRecusa, setErroRecusa] = useState<string>()
  const emCurso = useRef(false)
  const [ocupado, setOcupado] = useState(false)
  const [agora] = useState(() => new Date())

  useEffect(() => {
    let valido = true
    listarSolicitacoes({ status: 'pendente', turma_id: turma || undefined, limit: 1 })
      .then((p) => valido && setPendentes(p.total))
      .catch(() => valido && setPendentes(null))
    return () => {
      valido = false
    }
  }, [turma, contagem])

  useEffect(() => {
    // Opções do filtro (o docente recebe só as suas turmas); sem elas, o filtro fica vazio.
    listarTurmas({ limit: 100 })
      .then(({ items }) => setTurmas(items.map((t) => ({ id: t.id, nome: t.nome }))))
      .catch(() => undefined)
  }, [])

  // Fora da área de gestão (testes isolados) não há contexto: o contador simplesmente não existe.
  const gestao = useOutletContext<ContextoGestao | undefined>()
  const recarregarTudo = () => {
    recarregar()
    setContagem((n) => n + 1)
    gestao?.atualizarPendentes()
  }

  /**
   * Uma decisão por vez. Devolve `null` em sucesso ou a mensagem do erro; a fila recarrega depois
   * de decidir e quando a recusa da API significa que ela mudou (decidida por outra pessoa, aluno já
   * vinculado, turma que deixou de ser de quem decide).
   */
  async function decidir(s: SolicitacaoGestao, acao: () => Promise<SolicitacaoGestao>, sucesso: string) {
    if (emCurso.current) return 'ocupado'
    emCurso.current = true
    setOcupado(true)
    setMensagem(undefined)
    try {
      const atual = await acao()
      setDecididas((d) => ({ chave, mapa: new Map(d.chave === chave ? d.mapa : []).set(s.id, atual) }))
      setMensagem({ texto: sucesso, erro: false })
      recarregarTudo()
      return null
    } catch (e) {
      const texto = mensagemDaDecisao(e)
      const filaMudou = e instanceof ApiError && (e.code === 'SEM_PERMISSAO' || e.efeito === 'recarrega')
      if (filaMudou) recarregarTudo()
      return { texto, filaMudou }
    } finally {
      emCurso.current = false
      setOcupado(false)
    }
  }

  // Fila do servidor + as decididas aqui (que o servidor já não lista como pendentes), na ordem do pedido.
  const itens =
    carga.estado === 'pronto'
      ? [
          ...carga.dados.items.filter((s) => !decididasAqui.has(s.id)),
          ...decididasAqui.values(),
        ].sort((a, b) => a.solicitadaEm.getTime() - b.solicitadaEm.getTime())
      : []
  const esperando = itens.filter((s) => s.status === 'pendente' && diasEsperando(s, agora) > DIAS_DE_ESPERA).length
  const abas = STATUS.map((s) => (s.id === 'pendente' && pendentes !== null ? { ...s, rotulo: `Pendentes (${pendentes})` } : s))

  return (
    <div className="mx-auto max-w-[1180px]">
      <header>
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-navy">Solicitações de inscrição</h1>
        <p className="mt-1.5 text-[14px] text-apagado">
          Aprovar cria o vínculo do aluno com a turma na mesma hora. Recusar permite registrar o motivo, que o aluno vê
          no aplicativo.
        </p>
      </header>

      {mensagem && (
        <p
          role={mensagem.erro ? 'alert' : 'status'}
          className={`mt-5 rounded-xl border px-4 py-3 text-[13.5px] ${
            mensagem.erro ? 'border-perigo-borda bg-perigo-fundo text-perigo' : 'border-linha bg-sucesso-fundo text-sucesso'
          }`}
        >
          {mensagem.texto}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Abas
          rotulo="Status das solicitações"
          idBase={ID_ABAS}
          abas={abas}
          atual={status}
          onMudar={(s) => {
            setMensagem(undefined)
            filtrar({ status: s === 'pendente' ? '' : s })
          }}
        />
        <label className="flex items-center gap-2 text-[13px] text-apagado">
          <span>Turma</span>
          <select aria-label="Turma" className="campo h-11 py-0" value={turma} onChange={(e) => filtrar({ turma: e.target.value })}>
            <option value="">Todas</option>
            {turmas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        id={idDoPainel(ID_ABAS)}
        role="tabpanel"
        aria-labelledby={idDaAba(ID_ABAS, status)}
        className="mt-5 rounded-xl border border-linha bg-branco"
      >
        {carga.estado === 'carregando' ? (
          <Esqueleto rotulo="Carregando as solicitações" />
        ) : carga.estado === 'erro' ? (
          <>
            <EstadoErro mensagem={carga.mensagem} onRepetir={recarregarTudo} />
            {/* Turma que deixou de existir ou de ser de quem decide não se resolve tentando de novo. */}
            {turma && (
              <div className="-mt-10 pb-12 text-center">
                <button type="button" onClick={() => filtrar({ turma: '' })} className="botao-secundario">
                  Limpar filtro de turma
                </button>
              </div>
            )}
          </>
        ) : itens.length === 0 ? (
          <EstadoVazio
            icone="solicitacoes"
            titulo={turma ? 'Nenhuma solicitação nesta turma' : VAZIO[status][0]}
            texto={turma ? 'Escolha outra turma ou "Todas".' : VAZIO[status][1]}
          />
        ) : (
          <>
            <div className="overflow-x-auto px-3 pt-4">
              <TabelaSolicitacoes
                legenda={`Solicitações — ${STATUS.find((s) => s.id === status)!.rotulo}`}
                solicitacoes={itens}
                agora={agora}
                ocupado={ocupado}
                onAprovar={async (s) => {
                  const falha = await decidir(s, () => aprovarSolicitacao(s.id), `${s.aluno.nome} agora está em ${s.turma.nome}.`)
                  if (falha && falha !== 'ocupado') setMensagem({ texto: falha.texto, erro: true })
                }}
                onRecusar={(s) => {
                  setErroRecusa(undefined)
                  setRecusando(s)
                }}
              />
            </div>
            <div className="flex items-center justify-between border-t border-linha-suave px-6 py-4">
              <p className="text-[13px] text-apagado">
                {status === 'pendente' && esperando > 0
                  ? `${esperando} ${esperando === 1 ? 'solicitação esperando' : 'solicitações esperando'} há mais de ${DIAS_DE_ESPERA} dias`
                  : `Mostrando ${itens.length} de ${carga.dados.total} solicitações`}
              </p>
              <Paginacao
                total={carga.dados.total}
                limit={POR_PAGINA}
                offset={offset}
                onMudar={(o) => filtrar({ pagina: o === 0 ? '' : String(o / POR_PAGINA + 1) })}
              />
            </div>
          </>
        )}
      </div>

      {recusando && (
        <RecusarModal
          aluno={recusando.aluno.nome}
          turma={recusando.turma.nome}
          enviando={ocupado}
          erro={erroRecusa}
          onFechar={() => setRecusando(null)}
          onRecusar={async (motivo) => {
            const s = recusando
            setErroRecusa(undefined)
            const falha = await decidir(s, () => recusarSolicitacao(s.id, motivo), `Solicitação de ${s.aluno.nome} recusada.`)
            if (falha === 'ocupado') return
            // Em sucesso, ou quando a fila mudou por fora, o modal fecha; noutros erros, fica com o motivo.
            if (!falha || falha.filaMudou) {
              setRecusando(null)
              if (falha) setMensagem({ texto: falha.texto, erro: true })
            } else {
              setErroRecusa(falha.texto)
            }
          }}
        />
      )}
    </div>
  )
}
