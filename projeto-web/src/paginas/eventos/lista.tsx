// T12 (design w-12): agenda em abas — Próximos, Mês, Realizados e Arquivados — com filtro de tipo,
// busca e paginação na URL (plan-f2 D-F2-1). O docente recebe só os seus: quem filtra é a API.
import { useState } from 'react'
import { Link } from 'react-router'

import { listarEventos } from '../../api/recursos/eventos'
import { Abas, idDaAba, idDoPainel } from '../../componentes/comum/abas'
import { Busca } from '../../componentes/comum/busca'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EstadoVazio } from '../../componentes/comum/estado-vazio'
import { FimDaLista } from '../../componentes/comum/fim-da-lista'
import { Icone } from '../../componentes/comum/icone'
import { MensagemDaAcao } from '../../componentes/comum/mensagem-da-acao'
import { Paginacao } from '../../componentes/comum/paginacao'
import { CalendarioMes, nomeDoDia } from '../../componentes/eventos/calendario-mes'
import { CartaoEvento } from '../../componentes/eventos/cartao-evento'
import {
  ABAS_AGENDA,
  abaDaUrl,
  consultaDaAba,
  eventosDoDia,
  mesDaUrl,
  mesNaUrl,
  ROTULO_ABA,
  ROTULO_TIPO,
  TIPOS_EVENTO,
  type AbaAgenda,
} from '../../lib/agenda'
import { useMensagemTrazida } from '../comum'
import { paginaDaUrl, useCargaPaginada, useFiltrosNaUrl, useMensagemDaLista, useTextoNaUrl } from '../lista-na-url'
import { MENSAGEM_FEITA, useAcoesDoEvento } from './acoes'

const POR_PAGINA = 20
/** Na aba Mês vem o mês inteiro numa página: o calendário precisa de todos os eventos. */
const POR_MES = 100
const LIMITE_BUSCA = 100
const ID_ABAS = 'agenda-abas'
const VAZIO: Record<AbaAgenda, [string, string]> = {
  proximos: ['Nenhum evento próximo', 'Eventos que ainda vão acontecer, ou estão acontecendo, aparecem aqui.'],
  mes: ['Nenhum evento neste mês', 'Use as setas para ver outros meses.'],
  realizados: ['Nenhum evento realizado', 'Eventos que já terminaram ficam aqui, dos mais recentes aos mais antigos.'],
  arquivados: ['Nenhum evento arquivado', 'Eventos arquivados saem da agenda do aplicativo e ficam guardados aqui.'],
}

export default function ListaEventos() {
  const { params, filtrar } = useFiltrosNaUrl()
  const trazida = useMensagemTrazida()
  const aba = abaDaUrl(params.get('aba'))
  const mes = mesDaUrl(params.get('mes'))
  const tipo = (TIPOS_EVENTO as readonly string[]).includes(params.get('tipo') ?? '') ? params.get('tipo')! : ''
  const q = (params.get('q') ?? '').slice(0, LIMITE_BUSCA)
  const pagina = aba === 'mes' ? 1 : paginaDaUrl(params.get('pagina'))
  const porPagina = aba === 'mes' ? POR_MES : POR_PAGINA
  const offset = (pagina - 1) * porPagina
  const [diaEscolhido, setDiaEscolhido] = useState<Date | null>(null)

  const [termo, setTermo] = useTextoNaUrl('q', q, filtrar)
  const { carga, recarregar } = useCargaPaginada(
    JSON.stringify([aba, aba === 'mes' ? mesNaUrl(mes) : '', tipo, q]),
    () =>
      listarEventos({
        ...consultaDaAba(aba, mes),
        tipo: tipo || undefined,
        q: q || undefined,
        limit: porPagina,
        offset,
      }),
    { offset, porPagina, filtrar },
  )
  const [mensagem, setMensagem] = useMensagemDaLista(trazida ? { texto: trazida, erro: false } : undefined)

  const { pedir, dialogo, ocupado } = useAcoesDoEvento({
    aoConcluir: (acao) => {
      setMensagem({ texto: MENSAGEM_FEITA[acao], erro: false })
      recarregar()
    },
    aoFalhar: (texto, deveRecarregar) => {
      setMensagem({ texto, erro: true })
      if (deveRecarregar) recarregar()
    },
  })

  const comFiltro = Boolean(q || tipo)
  const eventos = carga.estado === 'pronto' ? carga.dados.items : []
  const doDia = aba === 'mes' && diaEscolhido ? eventosDoDia(eventos, diaEscolhido) : eventos
  const cartoes = (lista: typeof eventos, rotulo: string) => (
    <ul aria-label={rotulo}>
      {lista.map((e) => (
        <CartaoEvento
          key={e.id}
          evento={e}
          ocupado={ocupado}
          onArquivar={() => pedir('arquivar', e)}
          onDesarquivar={() => pedir('desarquivar', e)}
        />
      ))}
    </ul>
  )

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="titulo-pagina">Agenda</h1>
          <p className="mt-1.5 text-[14px] text-apagado">
            Eventos, bancas, provas e datas importantes. O público funciona igual ao dos avisos.
          </p>
        </div>
        <Link to="/eventos/novo" className="botao-primario acao-pagina">
          <Icone nome="mais" tamanho={18} />
          Novo evento
        </Link>
      </header>

      <MensagemDaAcao mensagem={mensagem} />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Abas
          rotulo="Períodos da agenda"
          idBase={ID_ABAS}
          abas={ABAS_AGENDA.map((id) => ({ id, rotulo: ROTULO_ABA[id] }))}
          atual={aba}
          onMudar={(nova) => {
            setDiaEscolhido(null)
            filtrar({ aba: nova === 'proximos' ? '' : nova, mes: '' })
          }}
        />
        <div className="filtros">
          <label className="filtro">
            <Icone nome="filtro" tamanho={17} className="hidden sm:block" />
            {/* No celular o rótulo aparece acima do campo; a partir de 640 px fica só o ícone. */}
            <span className="sm:sr-only">Tipo</span>
            <select aria-label="Tipo" className="campo h-11 py-0" value={tipo} onChange={(e) => filtrar({ tipo: e.target.value })}>
              <option value="">Todos os tipos</option>
              {TIPOS_EVENTO.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO[t]}
                </option>
              ))}
            </select>
          </label>
          <div className="w-full sm:w-[300px]">
            <Busca rotulo="Buscar evento" valor={termo} onMudar={setTermo} maxLength={LIMITE_BUSCA} />
          </div>
        </div>
      </div>

      <div
        id={idDoPainel(ID_ABAS)}
        role="tabpanel"
        aria-labelledby={idDaAba(ID_ABAS, aba)}
        className="mt-5 rounded-xl border border-linha bg-branco"
      >
        {carga.estado === 'carregando' ? (
          <Esqueleto rotulo="Carregando a agenda" />
        ) : carga.estado === 'erro' ? (
          <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
        ) : aba === 'mes' ? (
          <>
            <CalendarioMes
              mes={mes}
              eventos={eventos}
              diaEscolhido={diaEscolhido}
              onMudarMes={(m) => {
                setDiaEscolhido(null)
                filtrar({ mes: mesNaUrl(m) })
              }}
              onEscolherDia={setDiaEscolhido}
            />
            {carga.dados.total > eventos.length && (
              <p role="status" className="mx-6 mt-3 rounded-lg bg-alerta-fundo px-4 py-2.5 text-[13px] text-alerta">
                Mostrando {eventos.length} de {carga.dados.total} eventos deste mês. Use o tipo ou a busca para ver os demais.
              </p>
            )}
            <div aria-live="polite" className="mt-2 border-t border-linha-suave">
              {doDia.length === 0 ? (
                <EstadoVazio
                  titulo={diaEscolhido ? `Nenhum evento em ${nomeDoDia(diaEscolhido)}` : VAZIO.mes[0]}
                  texto={diaEscolhido ? 'Escolha outro dia no calendário.' : VAZIO.mes[1]}
                />
              ) : (
                cartoes(doDia, diaEscolhido ? `Eventos de ${nomeDoDia(diaEscolhido)}` : 'Eventos do mês')
              )}
            </div>
          </>
        ) : eventos.length === 0 ? (
          <EstadoVazio
            titulo={comFiltro ? 'Nenhum evento encontrado' : VAZIO[aba][0]}
            texto={comFiltro ? 'Ajuste a busca ou o tipo.' : VAZIO[aba][1]}
          />
        ) : (
          <>
            {cartoes(eventos, `Eventos — ${ROTULO_ABA[aba]}`)}
            {/* Última página (spec 002, D-MN-8): a lista diz que acabou. */}
            {offset + eventos.length >= carga.dados.total && (
              <FimDaLista texto="Não há mais eventos." className="border-t border-linha-suave" />
            )}
            {carga.dados.total > POR_PAGINA && (
              <div className="rodape-lista">
                <p className="text-[13px] text-apagado">
                  Mostrando {eventos.length} de {carga.dados.total} eventos
                </p>
                <Paginacao
                  total={carga.dados.total}
                  limit={POR_PAGINA}
                  offset={offset}
                  onMudar={(o) => filtrar({ pagina: o === 0 ? '' : String(o / POR_PAGINA + 1) })}
                />
              </div>
            )}
          </>
        )}
      </div>
      {dialogo}
    </div>
  )
}
