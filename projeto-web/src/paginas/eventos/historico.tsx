// T12: detalhe do evento com a linha do tempo e as versões (RW-34; plan-f2 D-F2-4); também para
// eventos excluídos (administração e coordenação). Ações de ciclo de vida no cabeçalho.
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { historicoDoEvento, obterEvento, versoesDoEvento } from '../../api/recursos/eventos'
import { listarTurmas } from '../../api/recursos/turmas'
import type { EventoAgenda, EventoHistorico, VersaoEvento } from '../../api/schemas'
import { Abas, idDaAba, idDoPainel } from '../../componentes/comum/abas'
import { ChipDestino } from '../../componentes/comum/chip-destino'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { Icone } from '../../componentes/comum/icone'
import { LinhaDoTempo } from '../../componentes/comum/linha-do-tempo'
import { MensagemDaAcao } from '../../componentes/comum/mensagem-da-acao'
import { SeloSituacao } from '../../componentes/comum/selo-situacao'
import { VersoesDoEvento } from '../../componentes/eventos/versoes-evento'
import { faixaDoEvento, ROTULO_TIPO } from '../../lib/agenda'
import { dataNumerica } from '../../lib/datas'
import { mensagemDe, useMensagemTrazida, type Carga } from '../comum'
import { idDaUrl } from '../lista-na-url'
import { MENSAGEM_FEITA, useAcoesDoEvento } from './acoes'

type AbaDetalhe = 'detalhes' | 'historico'
const ABAS = [
  { id: 'detalhes' as const, rotulo: 'Detalhes' },
  { id: 'historico' as const, rotulo: 'Histórico e versões' },
]
const ID_ABAS = 'evento-abas'
const LIMITE = 100

interface Auditoria {
  eventos: EventoHistorico[]
  totalEventos: number
  versoes: VersaoEvento[]
}

export default function HistoricoEvento() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const aba: AbaDetalhe = params.get('aba') === 'historico' ? 'historico' : 'detalhes'
  const navegar = useNavigate()
  const [evento, setEvento] = useState<Carga<EventoAgenda>>({ estado: 'carregando' })
  const [auditoria, setAuditoria] = useState<Carga<Auditoria>>({ estado: 'carregando' })
  const [nomes, setNomes] = useState(new Map<string, string>())
  const trazida = useMensagemTrazida()
  const [mensagem, setMensagem] = useState(trazida ? { texto: trazida, erro: false } : undefined)

  const carregar = useCallback(async () => {
    if (!idDaUrl(id)) {
      setEvento({ estado: 'erro', mensagem: new ApiError({ code: 'EVENTO_NAO_ENCONTRADO' }).mensagem, repetivel: false })
      return
    }
    try {
      setEvento({ estado: 'pronto', dados: await obterEvento(id) })
    } catch (e) {
      if (e instanceof ApiError && e.efeito === 'semPermissao') return navegar('/sem-permissao', { replace: true })
      setEvento({ estado: 'erro', mensagem: mensagemDe(e), repetivel: !(e instanceof ApiError && e.efeito === 'voltaLista') })
    }
  }, [id, navegar])

  const carregarAuditoria = useCallback(async () => {
    if (!idDaUrl(id)) return
    try {
      const [h, v] = await Promise.all([historicoDoEvento(id, { limit: LIMITE }), versoesDoEvento(id, { limit: LIMITE })])
      setAuditoria({ estado: 'pronto', dados: { eventos: h.items, totalEventos: h.total, versoes: v.items } })
    } catch (e) {
      setAuditoria({ estado: 'erro', mensagem: mensagemDe(e), repetivel: true })
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregar()
    void carregarAuditoria()
    // Nomes das turmas para os destinos guardados nas versões (que só têm o id).
    listarTurmas({ limit: 100 })
      .then(({ items }) => setNomes(new Map(items.map((t) => [t.id, t.nome]))))
      .catch(() => undefined)
  }, [carregar, carregarAuditoria])

  const { pedir, dialogo, ocupado } = useAcoesDoEvento({
    aoConcluir: (acao, atual) => {
      if (!atual) return navegar('/eventos', { state: { mensagem: MENSAGEM_FEITA[acao] } })
      setEvento({ estado: 'pronto', dados: atual })
      setMensagem({ texto: MENSAGEM_FEITA[acao], erro: false })
      void carregarAuditoria()
    },
    aoFalhar: (texto, recarregar) => {
      setMensagem({ texto, erro: true })
      if (recarregar) void carregar()
    },
  })

  if (evento.estado === 'carregando') return <Esqueleto rotulo="Carregando o evento" />
  if (evento.estado === 'erro') {
    if (evento.repetivel) return <EstadoErro mensagem={evento.mensagem} onRepetir={carregar} />
    return (
      <div role="alert" className="flex flex-col items-center px-12 py-16 text-center">
        <p className="text-[13.5px] text-apagado">{evento.mensagem}</p>
        <Link to="/eventos" className="botao-secundario mt-5">
          Voltar à agenda
        </Link>
      </div>
    )
  }
  const e = evento.dados
  const nomesComAtuais = new Map([...nomes, ...e.destinos.flatMap((d) => (d.turma ? [[d.turma.id, d.turma.nome] as const] : []))])

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start gap-4">
        <Link to="/eventos" aria-label="Voltar à agenda" className="botao-icone mt-1">
          <Icone nome="voltar" tamanho={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-navy">{e.titulo}</h1>
            <SeloSituacao situacao={e.situacao} />
          </div>
          <p className="mt-1 text-[13px] text-apagado">
            {ROTULO_TIPO[e.tipo] ?? e.tipo} · {e.autor.nome}
            {e.editadoEm && ` · editado ${dataNumerica(e.editadoEm)}`}
          </p>
        </div>
        {e.situacao === 'ativo' && (
          <>
            <button type="button" disabled={ocupado} onClick={() => pedir('arquivar', e)} className="botao-secundario">
              <Icone nome="arquivo" tamanho={18} />
              Arquivar
            </button>
            <Link to={`/eventos/${e.id}/editar`} className="botao-secundario">
              <Icone nome="lapis" tamanho={18} />
              Editar
            </Link>
          </>
        )}
        {e.situacao === 'arquivado' && (
          <button type="button" disabled={ocupado} onClick={() => pedir('desarquivar', e)} className="botao-secundario">
            Desarquivar
          </button>
        )}
        {e.situacao !== 'excluido' && (
          <button type="button" disabled={ocupado} onClick={() => pedir('excluir', e)} className="botao-perigo">
            Excluir
          </button>
        )}
      </header>

      <MensagemDaAcao mensagem={mensagem} />

      <div className="mt-6">
        <Abas
          rotulo="Seções do evento"
          idBase={ID_ABAS}
          abas={ABAS}
          atual={aba}
          onMudar={(nova) => setParams(nova === 'detalhes' ? {} : { aba: nova }, { replace: true })}
        />
      </div>

      <div id={idDoPainel(ID_ABAS)} role="tabpanel" aria-labelledby={idDaAba(ID_ABAS, aba)} className="mt-6">
        {aba === 'detalhes' ? (
          <section className="space-y-4 rounded-xl border border-linha bg-branco p-7">
            <p className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[14px] text-navy-suave">
              <span className="inline-flex items-center gap-1.5">
                <Icone nome="agenda" tamanho={16} />
                {e.inicio.toLocaleDateString('pt-BR')} · {faixaDoEvento(e)}
              </span>
              {e.local && (
                <span className="inline-flex items-center gap-1.5">
                  <Icone nome="local" tamanho={16} />
                  {e.local}
                </span>
              )}
            </p>
            {e.descricao && <p className="text-[14.5px] leading-relaxed whitespace-pre-line text-navy-suave">{e.descricao}</p>}
            <h2 className="text-[13px] font-semibold text-apagado">Quem vê na agenda</h2>
            <ul aria-label="Destinos do evento" className="flex flex-wrap gap-2">
              {e.destinos.map((d, i) => (
                <li key={i}>
                  <ChipDestino destino={d} />
                </li>
              ))}
            </ul>
            <p className="text-[12.5px] text-tenue">Versão {e.versaoAtual}</p>
          </section>
        ) : auditoria.estado === 'carregando' ? (
          <Esqueleto rotulo="Carregando o histórico" />
        ) : auditoria.estado === 'erro' ? (
          <EstadoErro mensagem={auditoria.mensagem} onRepetir={carregarAuditoria} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section aria-labelledby="titulo-linha" className="self-start rounded-xl border border-linha bg-branco">
              <h2 id="titulo-linha" className="border-b border-linha-suave px-7 py-5 text-[15px] font-semibold text-navy">
                Linha do tempo
              </h2>
              <div className="px-7 py-6">
                <LinhaDoTempo assunto="evento" eventos={auditoria.dados.eventos} nomes={nomesComAtuais} />
                {auditoria.dados.totalEventos > auditoria.dados.eventos.length && (
                  <p className="mt-5 text-[12.5px] text-tenue">
                    Mostrando os {auditoria.dados.eventos.length} registros mais recentes de {auditoria.dados.totalEventos}.
                  </p>
                )}
              </div>
            </section>
            <section aria-labelledby="titulo-versoes" className="self-start rounded-xl border border-linha bg-branco">
              <h2 id="titulo-versoes" className="border-b border-linha-suave px-7 py-5 text-[15px] font-semibold text-navy">
                Versões
              </h2>
              <div className="space-y-4 px-7 py-6">
                <VersoesDoEvento versoes={auditoria.dados.versoes} atual={e.versaoAtual} nomes={nomesComAtuais} />
                <p className="flex items-start gap-2.5 rounded-xl bg-fundo px-4 py-3 text-[12.5px] text-apagado">
                  <Icone nome="info" tamanho={16} className="mt-0.5 shrink-0" />
                  Versões e histórico não podem ser alterados nem apagados, mesmo depois da exclusão do evento.
                </p>
              </div>
            </section>
          </div>
        )}
      </div>
      {dialogo}
    </div>
  )
}
