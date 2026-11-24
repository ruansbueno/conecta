// Aba "Aguardando acesso" de Usuários (emenda v2.3 da API; RW-50, RW-51): servidores que entraram
// pela primeira vez pela API do IFSul e esperam a gestão definir o perfil. A administração libera
// com qualquer perfil, inclusive quem foi recusado; a coordenação, só pendentes, com docente ou
// coordenação. Ambas recusam pendentes.
import { useId, useState } from 'react'
import { useOutletContext } from 'react-router'

import { ApiError } from '../api/erros'
import { aprovarAcesso, listarAcessos, recusarAcesso, type SituacaoPedido } from '../api/recursos/acessos'
import type { Acesso } from '../api/schemas'
import { dataRelativa } from '../lib/datas'
import { PERFIS_DE_ACESSO, rotuloDoPerfil, type PerfilDeAcesso } from '../lib/perfis'
import { Avatar } from '../componentes/comum/avatar'
import { Confirmacao } from '../componentes/comum/confirmacao'
import { Esqueleto } from '../componentes/comum/esqueleto'
import { EstadoErro } from '../componentes/comum/estado-erro'
import { EstadoVazio } from '../componentes/comum/estado-vazio'
import { MensagemDaAcao } from '../componentes/comum/mensagem-da-acao'
import { Modal } from '../componentes/comum/modal'
import { Paginacao } from '../componentes/comum/paginacao'
import { Tabela, type Coluna } from '../componentes/comum/tabela'
import type { ContextoGestao } from './area-gestao'
import { paginaDaUrl, useCargaPaginada, useFiltrosNaUrl, useMensagemDaLista } from './lista-na-url'

const POR_PAGINA = 20
const PERFIS_DA_COORDENACAO: PerfilDeAcesso[] = ['coordenacao', 'docente']

interface Props {
  /** Quem decide: a administração concede qualquer perfil e libera recusados. */
  administracao: boolean
}

export function PedidosDeAcesso({ administracao }: Props) {
  const { params, filtrar } = useFiltrosNaUrl()
  const situacao: SituacaoPedido = params.get('situacao') === 'recusado' ? 'recusado' : 'pendente'
  const offset = (paginaDaUrl(params.get('pagina')) - 1) * POR_PAGINA
  const { carga, recarregar, carregadaEm: agora } = useCargaPaginada(
    JSON.stringify(['acessos', situacao]),
    () => listarAcessos({ situacao, limit: POR_PAGINA, offset }),
    { offset, porPagina: POR_PAGINA, filtrar },
  )
  const [mensagem, setMensagem] = useMensagemDaLista()
  const [aprovando, setAprovando] = useState<Acesso>()
  const [recusando, setRecusando] = useState<Acesso>()
  // Fora da área de gestão (testes isolados), não há contador a atualizar.
  const gestao = useOutletContext<ContextoGestao | undefined>()

  const podeAprovar = situacao === 'pendente' || administracao

  /** Decisão aplicada ou recusada pela API: avisa, recarrega a lista e o contador da barra. */
  function depoisDe(texto: string, erro = false) {
    setMensagem({ texto, erro })
    recarregar()
    gestao?.atualizarPendentes()
  }

  async function recusar(a: Acesso) {
    setRecusando(undefined)
    try {
      await recusarAcesso(a.id)
      depoisDe(`Pedido de acesso de ${a.nome} recusado.`)
    } catch (e) {
      // Outra pessoa decidiu antes (409): informação, como no aprovar; o resto é falha.
      const jaDecidido = e instanceof ApiError && e.code === 'ACESSO_JA_DECIDIDO'
      depoisDe(
        e instanceof ApiError ? e.mensagem : 'Não foi possível concluir agora. Tente de novo em instantes.',
        !jaDecidido,
      )
    }
  }

  const colunas: Coluna<Acesso>[] = [
    {
      chave: 'pessoa',
      titulo: 'Pessoa',
      celula: (a) => (
        <div className="flex items-center gap-3">
          <Avatar nome={a.nome} />
          <div>
            <p className="font-semibold text-navy">{a.nome}</p>
            <p className="text-[12.5px] text-tenue">{a.username}</p>
          </div>
        </div>
      ),
    },
    { chave: 'email', titulo: 'E-mail institucional', celula: (a) => a.email ?? <span className="text-tenue">não informado</span> },
    { chave: 'pedido', titulo: 'Pediu acesso', celula: (a) => dataRelativa(a.solicitadoEm, agora) },
    ...(situacao === 'recusado'
      ? [
          {
            chave: 'decisao',
            titulo: 'Decisão',
            celula: (a: Acesso) =>
              `Recusado${a.decididoPor ? ` por ${a.decididoPor.nome}` : ''}${a.decididoEm ? `, ${dataRelativa(a.decididoEm, agora)}` : ''}`,
          },
        ]
      : []),
    ...(podeAprovar
      ? [
          {
            chave: 'acoes',
            titulo: 'Ações',
            celula: (a: Acesso) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Aprovar o acesso de ${a.nome}`}
                  onClick={() => setAprovando(a)}
                  className="botao-secundario h-9 px-3 text-[13px]"
                >
                  Aprovar
                </button>
                {situacao === 'pendente' && (
                  <button
                    type="button"
                    aria-label={`Recusar o acesso de ${a.nome}`}
                    onClick={() => setRecusando(a)}
                    className="h-9 rounded-[9px] px-3 text-[13px] font-semibold text-perigo hover:bg-perigo-fundo"
                  >
                    Recusar
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <MensagemDaAcao mensagem={mensagem} />
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 pt-4">
        <fieldset className="flex gap-2">
          <legend className="sr-only">Situação dos pedidos</legend>
          {(
            [
              ['pendente', 'Pendentes'],
              ['recusado', 'Recusados'],
            ] as const
          ).map(([valor, rotulo]) => (
            <label
              key={valor}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul ${
                situacao === valor ? 'border-painel bg-painel text-sobre-cor' : 'border-linha text-apagado hover:bg-fundo'
              }`}
            >
              <input
                type="radio"
                name="situacao-dos-pedidos"
                value={valor}
                checked={situacao === valor}
                onChange={() => {
                  setMensagem(undefined)
                  filtrar({ situacao: valor === 'pendente' ? '' : valor })
                }}
                className="sr-only"
              />
              {rotulo}
            </label>
          ))}
        </fieldset>
        {situacao === 'recusado' && !administracao && (
          <p className="text-[13px] text-apagado">Só a administração libera um acesso recusado.</p>
        )}
      </div>

      {carga.estado === 'carregando' ? (
        <Esqueleto rotulo="Carregando os pedidos de acesso" />
      ) : carga.estado === 'erro' ? (
        <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
      ) : carga.dados.items.length === 0 ? (
        <EstadoVazio
          icone="usuarios"
          titulo={situacao === 'pendente' ? 'Nenhum pedido de acesso' : 'Nenhum pedido recusado'}
          texto="Os pedidos vêm de servidores que entram pela primeira vez com o login institucional do IFSul. Alunos entram direto."
        />
      ) : (
        <>
          <div className="px-3 pt-4">
            <Tabela
              legenda={situacao === 'pendente' ? 'Pedidos de acesso — pendentes' : 'Pedidos de acesso — recusados'}
              colunas={colunas}
              linhas={carga.dados.items}
              chave={(a) => a.id}
            />
          </div>
          <div className="rodape-lista">
            <p className="text-[13px] text-apagado">
              Mostrando {carga.dados.items.length} de {carga.dados.total} pedidos
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

      {aprovando && (
        <LiberarAcessoModal
          pedido={aprovando}
          perfis={administracao ? PERFIS_DE_ACESSO.map((p) => p.id) : PERFIS_DA_COORDENACAO}
          administracao={administracao}
          onFechar={() => setAprovando(undefined)}
          onLiberado={(perfil) => {
            setAprovando(undefined)
            depoisDe(`${aprovando.nome} agora tem acesso como ${rotuloDoPerfil(perfil)}.`)
          }}
          onJaDecidido={(texto) => {
            // Outra pessoa decidiu antes: informação, não falha desta tela.
            setAprovando(undefined)
            depoisDe(texto)
          }}
        />
      )}
      {recusando && (
        <Confirmacao
          titulo={`Recusar o acesso de ${recusando.nome}?`}
          consequencia="A pessoa não entra no CONECTA: o login passa a ser recusado. A administração ainda pode liberar o acesso depois."
          acao="Recusar acesso"
          destrutiva
          onConfirmar={() => void recusar(recusando)}
          onCancelar={() => setRecusando(undefined)}
        />
      )}
    </>
  )
}

interface ModalProps {
  pedido: Acesso
  perfis: PerfilDeAcesso[]
  administracao: boolean
  onFechar: () => void
  onLiberado: (perfil: PerfilDeAcesso) => void
  /** O pedido mudou por outra decisão (409): fecha o modal e recarrega a lista. */
  onJaDecidido: (mensagem: string) => void
}

function LiberarAcessoModal({ pedido, perfis, administracao, onFechar, onLiberado, onJaDecidido }: ModalProps) {
  const opcoes = PERFIS_DE_ACESSO.filter((p) => perfis.includes(p.id))
  const [perfil, setPerfil] = useState<PerfilDeAcesso>(perfis.includes('docente') ? 'docente' : opcoes[0].id)
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const id = useId()

  async function liberar() {
    setErro(undefined)
    setEnviando(true)
    try {
      await aprovarAcesso(pedido.id, perfil)
      onLiberado(perfil)
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ACESSO_JA_DECIDIDO') return onJaDecidido(e.mensagem)
      setErro(e instanceof ApiError ? e.mensagem : 'Não foi possível concluir agora. Tente de novo em instantes.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      titulo="Liberar acesso"
      onFechar={() => !enviando && onFechar()}
      largura="max-w-xl"
      rodape={
        <>
          <span className="grow" />
          <button type="button" disabled={enviando} onClick={onFechar} className="botao-secundario">
            Cancelar
          </button>
          <button type="button" disabled={enviando} aria-busy={enviando} onClick={() => void liberar()} className="botao-primario">
            Liberar acesso
          </button>
        </>
      }
    >
      <div className="flex items-center gap-3 border-b border-linha-suave px-6 py-4">
        <Avatar nome={pedido.nome} />
        <div>
          <p className="text-[14.5px] font-semibold text-navy">{pedido.nome}</p>
          <p className="text-[13px] text-apagado">
            {pedido.username}
            {pedido.email && ` · ${pedido.email}`}
          </p>
        </div>
      </div>
      <div className="space-y-3 px-6 py-5">
        {erro && (
          <p role="alert" className="rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
            {erro}
          </p>
        )}
        <p className="text-[13.5px] text-apagado">
          Escolha o perfil com que a pessoa vai entrar. A classificação institucional do IFSul não decide permissões no
          CONECTA.
        </p>
        <div role="radiogroup" aria-label="Perfil de acesso" className="space-y-2.5">
          {opcoes.map((p) => {
            const marcado = perfil === p.id
            return (
              <label
                key={p.id}
                className={`flex cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3 ${
                  marcado ? 'border-azul-100 bg-azul-superficie' : 'border-linha hover:bg-fundo'
                }`}
              >
                <input
                  type="radio"
                  name={id}
                  value={p.id}
                  checked={marcado}
                  onChange={() => setPerfil(p.id)}
                  aria-labelledby={`${id}-${p.id}`}
                  aria-describedby={`${id}-${p.id}-d`}
                  className="size-[18px] accent-azul"
                />
                <span>
                  <span id={`${id}-${p.id}`} className="block text-[14.5px] font-semibold text-navy">
                    {p.rotulo}
                  </span>
                  <span id={`${id}-${p.id}-d`} className="block text-[13px] text-apagado">
                    {p.descricao}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        {!administracao && (
          <p className="text-[12.5px] text-apagado">Só a administração concede o perfil de administrador ou de aluno.</p>
        )}
      </div>
    </Modal>
  )
}
