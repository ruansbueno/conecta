// T10/T11 (design w-10, w-11): pessoas por perfil e situação, com busca na URL (RW-31). Alterar
// perfil e ativar/desativar só para a administração (RW-32); a coordenação só lê (RW-11).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'

import { ApiError } from '../api/erros'
import { alterarUsuario, listarUsuarios, obterUsuario, type FiltrosUsuarios } from '../api/recursos/usuarios'
import type { UsuarioGestao } from '../api/schemas'
import { Abas, idDaAba, idDoPainel } from '../componentes/comum/abas'
import { Busca } from '../componentes/comum/busca'
import { MensagemDaAcao } from '../componentes/comum/mensagem-da-acao'
import { Esqueleto } from '../componentes/comum/esqueleto'
import { EstadoErro } from '../componentes/comum/estado-erro'
import { EstadoVazio } from '../componentes/comum/estado-vazio'
import { Paginacao } from '../componentes/comum/paginacao'
import { AlterarPerfilModal } from '../componentes/usuarios/alterar-perfil-modal'
import { TabelaUsuarios } from '../componentes/usuarios/tabela'
import { rotuloDoPerfil, type PerfilDeAcesso } from '../lib/perfis'
import { useSessao } from '../sessao/contexto'
import { paginaDaUrl, useCargaPaginada, useFiltrosNaUrl, useMensagemDaLista, useTextoNaUrl } from './lista-na-url'

type Aba = 'todos' | 'administracao' | 'coordenacao' | 'docentes' | 'alunos' | 'inativos'
const ABAS: { id: Aba; rotulo: string; filtro: Pick<FiltrosUsuarios, 'perfil' | 'ativo'>; vazio: string }[] = [
  { id: 'todos', rotulo: 'Todos', filtro: {}, vazio: 'Nenhuma pessoa' },
  { id: 'administracao', rotulo: 'Administração', filtro: { perfil: 'administrador' }, vazio: 'Ninguém na administração' },
  { id: 'coordenacao', rotulo: 'Coordenação', filtro: { perfil: 'coordenacao' }, vazio: 'Ninguém na coordenação' },
  { id: 'docentes', rotulo: 'Docentes', filtro: { perfil: 'docente' }, vazio: 'Nenhum docente' },
  { id: 'alunos', rotulo: 'Alunos', filtro: { perfil: 'aluno' }, vazio: 'Nenhum aluno' },
  { id: 'inativos', rotulo: 'Inativos', filtro: { ativo: false }, vazio: 'Nenhuma pessoa inativa' },
]
const POR_PAGINA = 20
const LIMITE_BUSCA = 100
const ID_ABAS = 'usuarios-aba'

export default function Usuarios() {
  const { usuario: eu, recarregar: recarregarSessao } = useSessao()
  const administracao = eu?.perfil === 'administrador'
  const navegar = useNavigate()
  const { params, filtrar } = useFiltrosNaUrl()

  const pedida = params.get('aba')
  const aba = ABAS.find((a) => a.id === pedida) ?? ABAS[0]
  const q = (params.get('q') ?? '').slice(0, LIMITE_BUSCA)
  const offset = (paginaDaUrl(params.get('pagina')) - 1) * POR_PAGINA
  const [termo, setTermo] = useTextoNaUrl('q', q, filtrar)

  const { carga, recarregar, carregadaEm: agora } = useCargaPaginada(
    JSON.stringify([aba.id, q]),
    () => listarUsuarios({ ...aba.filtro, q: q || undefined, limit: POR_PAGINA, offset }),
    { offset, porPagina: POR_PAGINA, filtrar },
  )
  const [mensagem, setMensagem] = useMensagemDaLista()
  const [alterando, setAlterando] = useState<{ usuario: UsuarioGestao; turmas: number | null } | null>(null)

  // A API decide quem lê esta lista: um 403 (perfil mudou) leva à tela sem permissão (RW-12).
  const semPermissao = carga.estado === 'erro' && carga.codigo === 'SEM_PERMISSAO'
  useEffect(() => {
    if (semPermissao) navegar('/sem-permissao', { replace: true })
  }, [semPermissao, navegar])

  function abrirAlteracao(u: UsuarioGestao) {
    setAlterando({ usuario: u, turmas: null })
    obterUsuario(u.id)
      .then((d) => setAlterando((a) => (a?.usuario.id === u.id ? { ...a, turmas: d.turmas.length } : a)))
      .catch(() => undefined)
  }

  /** Aplica a mudança; 403 leva à tela sem permissão, outras recusas voltam ao modal. */
  async function aplicar(u: UsuarioGestao, mudanca: { perfil?: PerfilDeAcesso; ativo?: boolean }, sucesso: string) {
    try {
      await alterarUsuario(u.id, mudanca)
    } catch (e) {
      if (e instanceof ApiError && e.efeito === 'semPermissao') return navegar('/sem-permissao', { replace: true })
      throw e
    }
    // Fecha só o modal desta pessoa (outro pode ter sido aberto enquanto a resposta não vinha).
    setAlterando((a) => (a?.usuario.id === u.id ? null : a))
    if (u.id === eu?.id && mudanca.perfil) {
      const texto = `Seu perfil agora é ${rotuloDoPerfil(mudanca.perfil)}.`
      // Perfil que já não lê esta lista (docente, aluno): vai ao painel com a mensagem, sem reler a
      // sessão aqui — a navegação é uma transição e a releitura chegaria antes, fazendo a guarda da
      // rota mandar para a tela sem permissão. A área de gestão relê a sessão ao trocar de página.
      // Coordenação continua lendo usuários: fica aqui.
      if (mudanca.perfil !== 'administrador' && mudanca.perfil !== 'coordenacao') {
        navegar('/painel', { replace: true, state: { mensagem: texto } })
        return
      }
      setMensagem({ texto, erro: false })
      recarregar()
      void recarregarSessao()
      return
    }
    setMensagem({ texto: sucesso, erro: false })
    recarregar()
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <header>
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-navy">Usuários</h1>
        <p className="mt-1.5 text-[14px] text-apagado">
          Todo usuário entra como aluno no primeiro acesso. Só a administração muda o perfil ou desativa alguém.
        </p>
      </header>

      <MensagemDaAcao mensagem={mensagem} />

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Abas
          rotulo="Perfil e situação"
          idBase={ID_ABAS}
          abas={ABAS}
          atual={aba.id}
          onMudar={(a) => {
            setMensagem(undefined)
            filtrar({ aba: a === 'todos' ? '' : a })
          }}
        />
        <div className="w-[300px]">
          <Busca rotulo="Buscar por nome ou usuário" valor={termo} onMudar={setTermo} maxLength={LIMITE_BUSCA} />
        </div>
      </div>

      <div
        id={idDoPainel(ID_ABAS)}
        role="tabpanel"
        aria-labelledby={idDaAba(ID_ABAS, aba.id)}
        className="mt-5 rounded-xl border border-linha bg-branco"
      >
        {carga.estado === 'carregando' || semPermissao ? (
          <Esqueleto rotulo="Carregando os usuários" />
        ) : carga.estado === 'erro' ? (
          <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
        ) : carga.dados.items.length === 0 ? (
          <EstadoVazio
            icone="usuarios"
            titulo={q ? 'Ninguém encontrado' : aba.vazio}
            texto={q ? 'Ajuste a busca.' : 'As pessoas aparecem aqui depois do primeiro acesso.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto px-3 pt-4">
              <TabelaUsuarios
                legenda={`Usuários — ${aba.rotulo}`}
                usuarios={carga.dados.items}
                agora={agora}
                onAlterar={administracao ? abrirAlteracao : undefined}
              />
            </div>
            <div className="flex items-center justify-between border-t border-linha-suave px-6 py-4">
              <p className="text-[13px] text-apagado">
                Mostrando {carga.dados.items.length} de {carga.dados.total} usuários
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

      {alterando && (
        <AlterarPerfilModal
          usuario={alterando.usuario}
          turmas={alterando.turmas}
          eProprio={alterando.usuario.id === eu?.id}
          onFechar={() => setAlterando(null)}
          onSalvarPerfil={(perfil) =>
            aplicar(alterando.usuario, { perfil }, `${alterando.usuario.nome} agora tem o perfil ${rotuloDoPerfil(perfil)}.`)
          }
          onMudarSituacao={(ativo) =>
            aplicar(
              alterando.usuario,
              { ativo },
              ativo ? `Acesso de ${alterando.usuario.nome} reativado.` : `Acesso de ${alterando.usuario.nome} desativado.`,
            )
          }
        />
      )}
    </div>
  )
}
