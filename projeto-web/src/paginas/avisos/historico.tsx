// T06 (design w-06): detalhe do aviso com o conteúdo atual, a linha do tempo e as versões; também
// para avisos excluídos (administração e coordenação). Ações de ciclo de vida no cabeçalho.
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { historicoDoAviso, obterAviso, versoesDoAviso } from '../../api/recursos/avisos'
import { listarTurmas } from '../../api/recursos/turmas'
import type { AvisoGestao, EventoHistorico, Versao } from '../../api/schemas'
import { LinhaDoTempo } from '../../componentes/avisos/linha-do-tempo'
import { ListaDeVersoes } from '../../componentes/avisos/versoes'
import { Abas, idDaAba, idDoPainel } from '../../componentes/comum/abas'
import { ChipDestino } from '../../componentes/comum/chip-destino'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { Icone } from '../../componentes/comum/icone'
import { SeloSituacao } from '../../componentes/comum/selo-situacao'
import { dataNumerica, dataHora } from '../../lib/datas'
import { estaAgendado } from '../../lib/formulario-aviso'
import { MENSAGEM_FEITA, useAcoesDoAviso } from './acoes'
import { mensagemDe, useMensagemTrazida, type Carga } from './comum'

type AbaDetalhe = 'conteudo' | 'historico'
const ABAS = [
  { id: 'conteudo' as const, rotulo: 'Conteúdo' },
  { id: 'historico' as const, rotulo: 'Histórico e versões' },
]
const ID_ABAS = 'aviso-abas'
/** Uma página de cada: um aviso com mais de 100 eventos mostra os mais recentes e diz isso. */
const LIMITE = 100

interface Auditoria {
  eventos: EventoHistorico[]
  totalEventos: number
  versoes: Versao[]
}

export default function HistoricoAviso() {
  const { id = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const aba: AbaDetalhe = params.get('aba') === 'historico' ? 'historico' : 'conteudo'
  const navegar = useNavigate()
  const [aviso, setAviso] = useState<Carga<AvisoGestao>>({ estado: 'carregando' })
  const [auditoria, setAuditoria] = useState<Carga<Auditoria>>({ estado: 'carregando' })
  const [nomes, setNomes] = useState(new Map<string, string>())
  const trazida = useMensagemTrazida()
  const [mensagem, setMensagem] = useState(trazida ? { texto: trazida, erro: false } : undefined)

  const carregar = useCallback(async () => {
    try {
      setAviso({ estado: 'pronto', dados: await obterAviso(id) })
    } catch (e) {
      if (e instanceof ApiError && e.efeito === 'semPermissao') return navegar('/sem-permissao', { replace: true })
      setAviso({ estado: 'erro', mensagem: mensagemDe(e), repetivel: !(e instanceof ApiError && e.efeito === 'voltaLista') })
    }
  }, [id, navegar])

  const carregarAuditoria = useCallback(async () => {
    try {
      const [h, v] = await Promise.all([
        historicoDoAviso(id, { limit: LIMITE }),
        versoesDoAviso(id, { limit: LIMITE }),
      ])
      setAuditoria({ estado: 'pronto', dados: { eventos: h.items, totalEventos: h.total, versoes: v.items } })
    } catch (e) {
      setAuditoria({ estado: 'erro', mensagem: mensagemDe(e), repetivel: true })
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregar()
    void carregarAuditoria()
    // Nomes das turmas para os destinos guardados nas versões (que só têm o id). Sem a lista, os
    // destinos de turma aparecem como "Turma indisponível".
    listarTurmas({ limit: 100 })
      .then(({ items }) => setNomes(new Map(items.map((t) => [t.id, t.nome]))))
      .catch(() => undefined)
  }, [carregar, carregarAuditoria])

  const { pedir, dialogo, ocupado } = useAcoesDoAviso({
    aoConcluir: (acao, atual) => {
      if (!atual) return navegar('/avisos', { state: { mensagem: MENSAGEM_FEITA[acao] } })
      setAviso({ estado: 'pronto', dados: atual })
      setMensagem({ texto: MENSAGEM_FEITA[acao], erro: false })
      void carregarAuditoria()
    },
    aoFalhar: (texto, recarregar) => {
      setMensagem({ texto, erro: true })
      if (recarregar) void carregar()
    },
  })

  if (aviso.estado === 'carregando') return <Esqueleto rotulo="Carregando o aviso" />
  if (aviso.estado === 'erro') {
    if (aviso.repetivel) return <EstadoErro mensagem={aviso.mensagem} onRepetir={carregar} />
    return (
      <div role="alert" className="flex flex-col items-center px-12 py-16 text-center">
        <p className="text-[13.5px] text-apagado">{aviso.mensagem}</p>
        <Link to="/avisos" className="botao-secundario mt-5">
          Voltar aos avisos
        </Link>
      </div>
    )
  }
  const a = aviso.dados
  const nomesComAtuais = new Map([...nomes, ...a.destinos.flatMap((d) => (d.turma ? [[d.turma.id, d.turma.nome] as const] : []))])

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start gap-4">
        <Link to="/avisos" aria-label="Voltar aos avisos" className="botao-icone mt-1">
          <Icone nome="voltar" tamanho={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[22px] font-bold tracking-[-0.02em] text-navy">{a.titulo}</h1>
            <SeloSituacao situacao={estaAgendado(a) ? 'agendado' : a.situacao} />
          </div>
          <p className="mt-1 text-[13px] text-apagado">
            {a.autor.nome} · {estaAgendado(a) ? 'agendado para' : 'publicado'} {dataNumerica(a.publicarEm ?? a.publicadoEm)}
            {a.editadoEm && ` · editado ${dataNumerica(a.editadoEm)}`}
          </p>
        </div>
        {a.situacao === 'ativo' && (
          <>
            <button type="button" disabled={ocupado} onClick={() => pedir('arquivar', a)} className="botao-secundario">
              <Icone nome="arquivo" tamanho={18} />
              Arquivar
            </button>
            <Link to={`/avisos/${a.id}/editar`} className="botao-secundario">
              <Icone nome="lapis" tamanho={18} />
              Editar
            </Link>
          </>
        )}
        {a.situacao === 'arquivado' && (
          <button type="button" disabled={ocupado} onClick={() => pedir('desarquivar', a)} className="botao-secundario">
            Desarquivar
          </button>
        )}
        {a.situacao !== 'excluido' && (
          <button type="button" disabled={ocupado} onClick={() => pedir('excluir', a)} className="botao-perigo">
            Excluir
          </button>
        )}
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

      <div className="mt-6">
        <Abas
          rotulo="Seções do aviso"
          idBase={ID_ABAS}
          abas={ABAS}
          atual={aba}
          onMudar={(nova) => setParams(nova === 'conteudo' ? {} : { aba: nova }, { replace: true })}
        />
      </div>

      <div id={idDoPainel(ID_ABAS)} role="tabpanel" aria-labelledby={idDaAba(ID_ABAS, aba)} className="mt-6">
        {aba === 'conteudo' ? (
          <section className="rounded-xl border border-linha bg-branco p-7">
            <p className="text-[14.5px] leading-relaxed whitespace-pre-line text-navy-suave">{a.conteudo}</p>
            <h2 className="mt-6 text-[13px] font-semibold text-apagado">Quem recebe</h2>
            <ul aria-label="Destinos do aviso" className="mt-2 flex flex-wrap gap-2">
              {a.destinos.map((d, i) => (
                <li key={i}>
                  <ChipDestino destino={d} />
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[12.5px] text-tenue">
              Versão {a.versaoAtual}
              {a.publicarEm && estaAgendado(a) ? ` · aparece no aplicativo em ${dataHora(a.publicarEm)}` : ''}
            </p>
          </section>
        ) : auditoria.estado === 'carregando' ? (
          <Esqueleto rotulo="Carregando o histórico" />
        ) : auditoria.estado === 'erro' ? (
          <EstadoErro mensagem={auditoria.mensagem} onRepetir={carregarAuditoria} />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="space-y-5">
              <section aria-labelledby="titulo-linha" className="rounded-xl border border-linha bg-branco">
                <h2 id="titulo-linha" className="border-b border-linha-suave px-7 py-5 text-[15px] font-semibold text-navy">
                  Linha do tempo
                </h2>
                <div className="px-7 py-6">
                  <LinhaDoTempo eventos={auditoria.dados.eventos} nomes={nomesComAtuais} />
                  {auditoria.dados.totalEventos > auditoria.dados.eventos.length && (
                    <p className="mt-5 text-[12.5px] text-tenue">
                      Mostrando os {auditoria.dados.eventos.length} eventos mais recentes de {auditoria.dados.totalEventos}.
                    </p>
                  )}
                </div>
              </section>
              <p className="flex items-start gap-2.5 rounded-xl border border-linha bg-branco px-6 py-4 text-[13px] text-apagado">
                <Icone nome="info" tamanho={17} className="mt-0.5 shrink-0" />
                Arquivar, desarquivar e excluir também entram nesta linha do tempo. Nada aqui pode ser editado depois.
              </p>
            </div>
            <section aria-labelledby="titulo-versoes" className="self-start rounded-xl border border-linha bg-branco">
              <h2 id="titulo-versoes" className="border-b border-linha-suave px-7 py-5 text-[15px] font-semibold text-navy">
                Versões
              </h2>
              <div className="space-y-4 px-7 py-6">
                <ListaDeVersoes versoes={auditoria.dados.versoes} atual={a.versaoAtual} nomes={nomesComAtuais} />
                <p className="flex items-start gap-2.5 rounded-xl bg-fundo px-4 py-3 text-[12.5px] text-apagado">
                  <Icone nome="info" tamanho={16} className="mt-0.5 shrink-0" />
                  Versões e eventos não podem ser alterados nem apagados, mesmo depois da exclusão do aviso.
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
