// T03 (design w-03): avisos por situação, com busca, filtros por autor e turma e paginação na URL
// (RW-13, RW-14). O docente recebe só os seus: quem filtra é a API.
import { useEffect, useState } from 'react'
import { Link } from 'react-router'

import { listarAvisos } from '../../api/recursos/avisos'
import { listarTurmas } from '../../api/recursos/turmas'
import { listarUsuarios } from '../../api/recursos/usuarios'
import type { AvisoGestao } from '../../api/schemas'
import { Abas, idDaAba, idDoPainel } from '../../componentes/comum/abas'
import { Busca } from '../../componentes/comum/busca'
import { ChipDestino } from '../../componentes/comum/chip-destino'
import { MensagemDaAcao } from '../../componentes/comum/mensagem-da-acao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EstadoVazio } from '../../componentes/comum/estado-vazio'
import { Icone } from '../../componentes/comum/icone'
import { Paginacao } from '../../componentes/comum/paginacao'
import { SeloSituacao } from '../../componentes/comum/selo-situacao'
import { Tabela, type Coluna } from '../../componentes/comum/tabela'
import { dataNumerica } from '../../lib/datas'
import { estaAgendado } from '../../lib/formulario-aviso'
import { useSessao } from '../../sessao/contexto'
import { MENSAGEM_FEITA, useAcoesDoAviso } from './acoes'
import { idDaUrl, paginaDaUrl, useCargaPaginada, useFiltrosNaUrl, useMensagemDaLista, useTextoNaUrl } from '../lista-na-url'
import { useMensagemTrazida } from './comum'

type Situacao = 'ativo' | 'agendado' | 'arquivado' | 'excluido'
const SITUACOES: { id: Situacao; rotulo: string }[] = [
  { id: 'ativo', rotulo: 'Ativos' },
  { id: 'agendado', rotulo: 'Agendados' },
  { id: 'arquivado', rotulo: 'Arquivados' },
  { id: 'excluido', rotulo: 'Excluídos' },
]
const VAZIO: Record<Situacao, [string, string]> = {
  ativo: ['Nenhum aviso ativo', 'Os avisos publicados aparecem aqui, com o público de cada um.'],
  agendado: ['Nenhum aviso agendado', 'Avisos com publicação marcada para o futuro ficam aqui até a data chegar.'],
  arquivado: ['Nenhum aviso arquivado', 'Avisos arquivados saem do aplicativo e ficam guardados aqui.'],
  excluido: ['Nenhum aviso excluído', 'Avisos excluídos ficam aqui só para auditoria.'],
}
const POR_PAGINA = 20
const DESTINOS_VISIVEIS = 3
const ID_ABAS = 'avisos-situacao'
const LIMITE_BUSCA = 100

interface Opcao {
  id: string
  nome: string
}

export default function ListaAvisos() {
  const { usuario } = useSessao()
  const gestao = usuario?.perfil === 'administrador' || usuario?.perfil === 'coordenacao'
  const { params, filtrar } = useFiltrosNaUrl()
  const trazida = useMensagemTrazida()

  const pedida = params.get('situacao') as Situacao | null
  const abas = gestao ? SITUACOES : SITUACOES.filter((s) => s.id !== 'excluido')
  const situacao: Situacao = abas.some((s) => s.id === pedida) ? pedida! : 'ativo'
  const q = (params.get('q') ?? '').slice(0, LIMITE_BUSCA)
  // Só administração e coordenação filtram por autor: para o docente, autor na URL não vale.
  const autor = gestao ? idDaUrl(params.get('autor')) : ''
  const turma = idDaUrl(params.get('turma'))
  const pagina = paginaDaUrl(params.get('pagina'))
  const offset = (pagina - 1) * POR_PAGINA

  const [termo, setTermo] = useTextoNaUrl('q', q, filtrar)
  const { carga, recarregar, carregadaEm: agora } = useCargaPaginada(
    JSON.stringify([situacao, q, autor, turma]),
    () =>
      listarAvisos({
        situacao,
        q: q || undefined,
        autor_id: autor || undefined,
        turma_id: turma || undefined,
        limit: POR_PAGINA,
        offset,
      }),
    { offset, porPagina: POR_PAGINA, filtrar },
  )
  const [turmas, setTurmas] = useState<Opcao[]>([])
  const [autores, setAutores] = useState<Opcao[]>([])
  const [mensagem, setMensagem] = useMensagemDaLista(trazida ? { texto: trazida, erro: false } : undefined)

  useEffect(() => {
    // Opções dos filtros: falhar aqui só deixa o filtro sem opções, a lista segue.
    listarTurmas({ limit: 100 })
      .then(({ items }) => setTurmas(items.map((t) => ({ id: t.id, nome: t.nome }))))
      .catch(() => undefined)
    if (!gestao) return
    Promise.all(['administrador', 'coordenacao', 'docente'].map((perfil) => listarUsuarios({ perfil, limit: 100 })))
      .then((paginas) =>
        setAutores(
          paginas
            .flatMap((p) => p.items)
            .map((u) => ({ id: u.id, nome: u.nome }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        ),
      )
      .catch(() => undefined)
  }, [gestao])

  const { pedir, dialogo, ocupado } = useAcoesDoAviso({
    aoConcluir: (acao) => {
      setMensagem({ texto: MENSAGEM_FEITA[acao], erro: false })
      recarregar()
    },
    aoFalhar: (texto, deveRecarregar) => {
      setMensagem({ texto, erro: true })
      if (deveRecarregar) recarregar()
    },
  })

  const colunas: Coluna<AvisoGestao>[] = [
    {
      chave: 'aviso',
      titulo: 'Aviso',
      celula: (a) => (
        <>
          <Link to={`/avisos/${a.id}`} className="font-semibold text-navy hover:underline">
            {a.titulo}
          </Link>
          <p className="mt-0.5 text-[12.5px] text-tenue">
            versão {a.versaoAtual}
            {a.situacao === 'excluido'
              ? ' · mantido para auditoria'
              : a.editadoEm
                ? ` · editado ${dataNumerica(a.editadoEm, agora)}`
                : ''}
          </p>
        </>
      ),
    },
    { chave: 'autor', titulo: 'Autor', celula: (a) => a.autor.nome },
    {
      chave: 'destinos',
      titulo: 'Destinos',
      celula: (a) => (
        <ul className="flex flex-wrap gap-1.5">
          {a.destinos.slice(0, DESTINOS_VISIVEIS).map((d, i) => (
            <li key={i}>
              <ChipDestino destino={d} />
            </li>
          ))}
          {a.destinos.length > DESTINOS_VISIVEIS && (
            <li className="inline-flex h-7 items-center rounded-full bg-azul-superficie px-2.5 text-[12.5px] font-medium text-navy">
              +{a.destinos.length - DESTINOS_VISIVEIS}
            </li>
          )}
        </ul>
      ),
    },
    { chave: 'publicacao', titulo: 'Publicação', celula: (a) => <span className="whitespace-nowrap">{dataNumerica(a.publicarEm ?? a.publicadoEm, agora)}</span>,
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      celula: (a) => <SeloSituacao situacao={estaAgendado(a, agora) ? 'agendado' : a.situacao} />,
    },
    {
      chave: 'acoes',
      titulo: 'Ações',
      celula: (a) => (
        <div className="flex items-center gap-1">
          {a.situacao === 'ativo' && (
            <>
              <Link to={`/avisos/${a.id}/editar`} aria-label={`Editar “${a.titulo}”`} title="Editar" className="botao-icone">
                <Icone nome="lapis" tamanho={17} />
              </Link>
              <button
                type="button"
                aria-label={`Arquivar “${a.titulo}”`}
                title="Arquivar"
                disabled={ocupado}
                onClick={() => pedir('arquivar', a)}
                className="botao-icone"
              >
                <Icone nome="arquivo" tamanho={17} />
              </button>
            </>
          )}
          {a.situacao === 'arquivado' && (
            <button
              type="button"
              aria-label={`Desarquivar “${a.titulo}”`}
              title="Desarquivar"
              disabled={ocupado}
              onClick={() => pedir('desarquivar', a)}
              className="botao-icone"
            >
              <Icone nome="seta" tamanho={17} />
            </button>
          )}
          <Link to={`/avisos/${a.id}?aba=historico`} aria-label={`Histórico de “${a.titulo}”`} title="Histórico e versões" className="botao-icone">
            <Icone nome="historico" tamanho={17} />
          </Link>
        </div>
      ),
    },
  ]

  const comFiltro = Boolean(q || autor || turma)
  const rotuloAba = abas.find((s) => s.id === situacao)!.rotulo

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="titulo-pagina">{gestao ? 'Avisos' : 'Meus avisos'}</h1>
          <p className="mt-1.5 text-[14px] text-apagado">
            {gestao
              ? 'Tudo que foi publicado no curso, com o público de cada aviso.'
              : 'Os avisos que você publicou, com o público de cada um.'}
          </p>
        </div>
        <Link to="/avisos/novo" className="botao-primario acao-pagina">
          <Icone nome="mais" tamanho={18} />
          Novo aviso
        </Link>
      </header>

      <MensagemDaAcao mensagem={mensagem} />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Abas
          rotulo="Situação dos avisos"
          idBase={ID_ABAS}
          abas={abas}
          atual={situacao}
          onMudar={(s) => filtrar({ situacao: s === 'ativo' ? '' : s })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full sm:w-[300px]">
            <Busca rotulo="Buscar por título ou conteúdo" valor={termo} onMudar={setTermo} maxLength={LIMITE_BUSCA} />
          </div>
          {gestao && (
            <label className="flex items-center gap-2 text-[13px] text-apagado">
              <span>Autor</span>
              <select
                aria-label="Autor"
                className="campo h-11 py-0"
                value={autor}
                onChange={(e) => filtrar({ autor: e.target.value })}
              >
                <option value="">Todos</option>
                {autores.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.nome}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-[13px] text-apagado">
            <span>Turma</span>
            <select
              aria-label="Turma"
              className="campo h-11 py-0"
              value={turma}
              onChange={(e) => filtrar({ turma: e.target.value })}
            >
              <option value="">Todas</option>
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        id={idDoPainel(ID_ABAS)}
        role="tabpanel"
        aria-labelledby={idDaAba(ID_ABAS, situacao)}
        className="mt-5 rounded-xl border border-linha bg-branco"
      >
        {carga.estado === 'carregando' ? (
          <Esqueleto rotulo="Carregando os avisos" />
        ) : carga.estado === 'erro' ? (
          <>
            <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
            {/* Filtro que a API recusa (turma apagada, link antigo) não se resolve tentando de novo. */}
            {comFiltro && (
              <div className="-mt-10 pb-12 text-center">
                <button type="button" onClick={() => filtrar({ q: '', autor: '', turma: '' })} className="botao-secundario">
                  Limpar filtros
                </button>
              </div>
            )}
          </>
        ) : carga.dados.items.length === 0 ? (
          <EstadoVazio
            titulo={comFiltro ? 'Nenhum aviso encontrado' : VAZIO[situacao][0]}
            texto={comFiltro ? 'Ajuste a busca ou os filtros.' : VAZIO[situacao][1]}
          />
        ) : (
          <>
            <div className="px-3 pt-4">
              <Tabela legenda={`Avisos — ${rotuloAba}`} colunas={colunas} linhas={carga.dados.items} chave={(a) => a.id} />
            </div>
            <div className="rodape-lista">
              <p className="text-[13px] text-apagado">
                Mostrando {carga.dados.items.length} de {carga.dados.total} avisos
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
      {dialogo}
    </div>
  )
}
