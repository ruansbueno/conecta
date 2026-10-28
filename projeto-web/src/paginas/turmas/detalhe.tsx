// T08 (design w-08): dados da turma, ações de inscrições e situação (RW-25) e os vínculos por papel,
// com vincular e desvincular (RW-26, RW-27). O docente vê a turma em que leciona, só para leitura.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { desativarTurma, editarTurma, obterTurma } from '../../api/recursos/turmas'
import { listarUsuarios } from '../../api/recursos/usuarios'
import { desvincular, listarVinculos, vincular, type Papel } from '../../api/recursos/vinculos'
import type { DadosTurma, Pagina, Turma, Vinculo } from '../../api/schemas'
import { Busca } from '../../componentes/comum/busca'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { MensagemDaAcao } from '../../componentes/comum/mensagem-da-acao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EstadoVazio } from '../../componentes/comum/estado-vazio'
import { Icone } from '../../componentes/comum/icone'
import { FormTurma } from '../../componentes/turmas/form-turma'
import { FormVinculo, type PessoaEncontrada } from '../../componentes/turmas/form-vinculo'
import { SeloInscricoes, SeloTurma } from '../../componentes/turmas/tabela-turmas'
import { TabelaVinculos } from '../../componentes/turmas/tabela-vinculos'
import { quantidade } from '../../lib/texto'
import { useSessao } from '../../sessao/contexto'
import { mensagemDe, type Carga } from '../comum'
import { idDaUrl } from '../lista-na-url'

/** Uma página só: turma com mais de 100 vínculos mostra os 100 primeiros e avisa. */
const LIMITE_VINCULOS = 100
const dataCompleta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

type Pedido =
  | { tipo: 'inscricoes'; abrir: boolean }
  | { tipo: 'desativar' }
  | { tipo: 'remover'; vinculo: Vinculo }

function confirmacaoDe(p: Pedido, t: Turma) {
  switch (p.tipo) {
    case 'inscricoes':
      return p.abrir
        ? {
            titulo: `Abrir as inscrições de ${t.codigo}?`,
            consequencia:
              'Alunos sem vínculo passam a ver esta turma no aplicativo e podem pedir inscrição; cada pedido espera aprovação.',
            acao: 'Abrir inscrições',
          }
        : {
            titulo: `Fechar as inscrições de ${t.codigo}?`,
            consequencia:
              'Alunos deixam de ver esta turma para pedir inscrição no aplicativo. Quem já está vinculado continua com acesso.',
            acao: 'Fechar inscrições',
          }
    case 'desativar':
      return {
        titulo: `Desativar ${t.codigo}?`,
        consequencia:
          'Os vínculos são preservados, mas a turma sai das inscrições e os avisos enviados para ela ou para o semestre dela deixam de ser entregues. Dá para reativar depois.',
        acao: 'Desativar turma',
        destrutiva: true,
      }
    case 'remover':
      return {
        titulo: `Remover o vínculo de ${p.vinculo.usuario.nome}?`,
        consequencia: `${p.vinculo.usuario.nome} perde na hora o acesso aos avisos desta turma no aplicativo. Para voltar, é preciso vincular de novo ou aprovar uma nova solicitação.`,
        acao: 'Remover vínculo',
        destrutiva: true,
      }
  }
}

export default function DetalheTurma() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const { usuario } = useSessao()
  const gestao = usuario?.perfil === 'administrador' || usuario?.perfil === 'coordenacao'

  const [turma, setTurma] = useState<Carga<Turma>>({ estado: 'carregando' })
  const [vinculos, setVinculos] = useState<Carga<Pagina<Vinculo>>>({ estado: 'carregando' })
  const [papel, setPapel] = useState<Papel | ''>('')
  const [busca, setBusca] = useState('')
  const [mensagem, setMensagem] = useState<{ texto: string; erro: boolean }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [editando, setEditando] = useState(false)
  const [vinculando, setVinculando] = useState<Papel | null>(null)
  const emCurso = useRef(false)
  const [ocupado, setOcupado] = useState(false)

  const carregarTurma = useCallback(async () => {
    // Id que não é UUID nunca existiu: a API real responderia 422, e "tentar de novo" não resolveria.
    if (!idDaUrl(id)) {
      setTurma({ estado: 'erro', mensagem: new ApiError({ code: 'TURMA_NAO_ENCONTRADA' }).mensagem, repetivel: false })
      return
    }
    try {
      setTurma({ estado: 'pronto', dados: await obterTurma(id) })
    } catch (e) {
      if (e instanceof ApiError && e.efeito === 'semPermissao') return navegar('/sem-permissao', { replace: true })
      const sumiu = e instanceof ApiError && e.code === 'TURMA_NAO_ENCONTRADA'
      setTurma({ estado: 'erro', mensagem: mensagemDe(e), repetivel: !sumiu })
    }
  }, [id, navegar])

  // Só a resposta do pedido mais recente vale, sempre com o papel escolhido agora (a remoção, por
  // exemplo, recarrega depois que a pessoa já pode ter trocado o filtro).
  const papelAtual = useRef(papel)
  const ultimoPedido = useRef(0)
  const carregarVinculos = useCallback(async () => {
    if (!idDaUrl(id)) return
    const pedido = ++ultimoPedido.current
    try {
      const dados = await listarVinculos(id, { papel: papelAtual.current || undefined, limit: LIMITE_VINCULOS })
      if (pedido === ultimoPedido.current) setVinculos({ estado: 'pronto', dados })
    } catch (e) {
      if (pedido === ultimoPedido.current) setVinculos({ estado: 'erro', mensagem: mensagemDe(e), repetivel: true })
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregarTurma()
  }, [carregarTurma])

  useEffect(() => {
    papelAtual.current = papel
    void carregarVinculos()
  }, [papel, carregarVinculos])

  /** Uma ação por vez; em falha, mostra a mensagem e recarrega o que pode ter mudado por fora. */
  async function executar(acao: () => Promise<string>) {
    if (emCurso.current) return
    emCurso.current = true
    setOcupado(true)
    setMensagem(undefined)
    try {
      setMensagem({ texto: await acao(), erro: false })
    } catch (e) {
      setMensagem({ texto: mensagemDe(e), erro: true })
      if (e instanceof ApiError && e.efeito === 'recarrega') {
        void carregarTurma()
        void carregarVinculos()
      }
    } finally {
      emCurso.current = false
      setOcupado(false)
    }
  }

  function confirmar(p: Pedido, t: Turma) {
    setPedido(null)
    void executar(async () => {
      switch (p.tipo) {
        case 'inscricoes':
          setTurma({ estado: 'pronto', dados: await editarTurma(t.id, { inscricoesAbertas: p.abrir }) })
          return p.abrir ? 'Inscrições abertas.' : 'Inscrições fechadas.'
        case 'desativar':
          await desativarTurma(t.id)
          await carregarTurma()
          return 'Turma desativada.'
        case 'remover':
          await desvincular(t.id, p.vinculo.usuario.id)
          await Promise.all([carregarTurma(), carregarVinculos()])
          return `Vínculo de ${p.vinculo.usuario.nome} removido.`
      }
    })
  }

  const buscarPessoas = useCallback(
    async (termo: string): Promise<PessoaEncontrada[]> =>
      (await listarUsuarios({ q: termo, perfil: vinculando ?? undefined, ativo: true, limit: 10 })).items,
    [vinculando],
  )

  if (turma.estado === 'carregando') return <Esqueleto rotulo="Carregando a turma" />
  if (turma.estado === 'erro') {
    if (turma.repetivel) return <EstadoErro mensagem={turma.mensagem} onRepetir={carregarTurma} />
    return (
      <div role="alert" className="flex flex-col items-center px-12 py-16 text-center">
        <p className="text-[13.5px] text-apagado">{turma.mensagem}</p>
        <Link to="/turmas" className="botao-secundario mt-5">
          Voltar às turmas
        </Link>
      </div>
    )
  }
  const t = turma.dados
  const termo = semAcento(busca.trim())
  const visiveis =
    vinculos.estado === 'pronto'
      ? vinculos.dados.items.filter((v) => !termo || semAcento(`${v.usuario.nome} ${v.usuario.username}`).includes(termo))
      : []

  async function salvarTurma(dados: DadosTurma) {
    const mudou: Partial<DadosTurma> = {}
    for (const campo of ['codigo', 'nome', 'semestreCurso', 'periodoLetivo', 'inscricoesAbertas'] as const) {
      if (dados[campo] !== t[campo]) Object.assign(mudou, { [campo]: dados[campo] })
    }
    if (Object.keys(mudou).length > 0) setTurma({ estado: 'pronto', dados: await editarTurma(t.id, mudou) })
    setEditando(false)
    setMensagem({ texto: 'Turma atualizada.', erro: false })
  }

  async function vincularPessoa(pessoa: PessoaEncontrada) {
    if (!vinculando) return
    try {
      await vincular(t.id, pessoa.id, vinculando)
    } catch (e) {
      // Já vinculada por outro caminho (ex.: aprovação): a lista recarrega por trás do formulário.
      if (e instanceof ApiError && e.efeito === 'recarrega') void carregarVinculos()
      throw e
    }
    setVinculando(null)
    setMensagem({ texto: `${pessoa.nome} agora está na turma como ${vinculando}.`, erro: false })
    await Promise.all([carregarTurma(), carregarVinculos()])
  }

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start gap-4">
        <Link to="/turmas" aria-label="Voltar às turmas" className="botao-icone mt-1">
          <Icone nome="voltar" tamanho={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[24px] font-bold tracking-[-0.02em] text-navy">{t.nome}</h1>
          <p className="mt-1 text-[13px] text-apagado">Turma acadêmica · criada em {dataCompleta.format(t.criadoEm)}</p>
        </div>
        {gestao && (
          <div className="flex flex-wrap gap-2.5">
            {t.ativa && (
              <button
                type="button"
                disabled={ocupado}
                onClick={() => setPedido({ tipo: 'inscricoes', abrir: !t.inscricoesAbertas })}
                className="botao-secundario"
              >
                {t.inscricoesAbertas ? 'Fechar inscrições' : 'Abrir inscrições'}
              </button>
            )}
            <button type="button" disabled={ocupado} onClick={() => setEditando(true)} className="botao-secundario">
              <Icone nome="lapis" tamanho={17} />
              Editar turma
            </button>
            {t.ativa ? (
              <button type="button" disabled={ocupado} onClick={() => setPedido({ tipo: 'desativar' })} className="botao-perigo">
                Desativar turma
              </button>
            ) : (
              <button
                type="button"
                disabled={ocupado}
                onClick={() =>
                  void executar(async () => {
                    setTurma({ estado: 'pronto', dados: await editarTurma(t.id, { ativa: true }) })
                    return 'Turma reativada.'
                  })
                }
                className="botao-secundario"
              >
                Reativar turma
              </button>
            )}
          </div>
        )}
      </header>

      <MensagemDaAcao mensagem={mensagem} />

      <section aria-label="Dados da turma" className="mt-6 flex flex-wrap gap-x-12 gap-y-4 rounded-xl border border-linha bg-branco px-7 py-5">
        {[
          ['Código', t.codigo],
          ['Semestre do curso', `${t.semestreCurso}º`],
          ['Período letivo', t.periodoLetivo],
          ['Vínculos', `${quantidade(t.totalAlunos, 'aluno')} · ${quantidade(t.totalDocentes, 'docente')}`],
        ].map(([rotulo, valor]) => (
          <div key={rotulo}>
            <p className="text-[12.5px] text-tenue">{rotulo}</p>
            <p className="mt-1 text-[15px] font-semibold text-navy">{valor}</p>
          </div>
        ))}
        <div>
          <p className="text-[12.5px] text-tenue">Inscrições</p>
          <p className="mt-1">
            <SeloInscricoes abertas={t.inscricoesAbertas} />
          </p>
        </div>
        <div>
          <p className="text-[12.5px] text-tenue">Situação</p>
          <p className="mt-1">
            <SeloTurma ativa={t.ativa} />
          </p>
        </div>
      </section>

      <section aria-labelledby="titulo-vinculos" className="mt-8">
        <h2 id="titulo-vinculos" className="text-[17px] font-semibold text-navy">
          Vínculos
        </h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="w-[300px]">
            <Busca rotulo="Buscar pessoa na turma" valor={busca} onMudar={setBusca} maxLength={100} />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-apagado">
            <span>Papel</span>
            <select aria-label="Papel" className="campo h-11 py-0" value={papel} onChange={(e) => setPapel(e.target.value as Papel | '')}>
              <option value="">Todos</option>
              <option value="docente">Docentes</option>
              <option value="aluno">Alunos</option>
            </select>
          </label>
          <span className="grow" />
          {gestao && (
            <>
              <button type="button" disabled={ocupado} onClick={() => setVinculando('docente')} className="botao-secundario">
                <Icone nome="mais" tamanho={17} />
                Vincular docente
              </button>
              <button type="button" disabled={ocupado} onClick={() => setVinculando('aluno')} className="botao-primario">
                <Icone nome="mais" tamanho={17} />
                Vincular aluno
              </button>
            </>
          )}
        </div>
        <div className="mt-4 rounded-xl border border-linha bg-branco">
          {vinculos.estado === 'carregando' ? (
            <Esqueleto rotulo="Carregando os vínculos" />
          ) : vinculos.estado === 'erro' ? (
            <EstadoErro mensagem={vinculos.mensagem} onRepetir={carregarVinculos} />
          ) : visiveis.length === 0 ? (
            <EstadoVazio
              icone="usuarios"
              titulo={termo ? 'Ninguém encontrado' : 'Nenhum vínculo'}
              texto={termo ? 'Ajuste a busca.' : 'Vincule docentes e alunos, ou aprove as solicitações de inscrição.'}
            />
          ) : (
            <>
              <div className="overflow-x-auto px-3 pt-4">
                <TabelaVinculos
                  vinculos={visiveis}
                  desabilitado={ocupado}
                  onRemover={gestao ? (v) => setPedido({ tipo: 'remover', vinculo: v }) : undefined}
                />
              </div>
              <p className="border-t border-linha-suave px-6 py-4 text-[13px] text-apagado">
                Mostrando {visiveis.length} de {vinculos.dados.total} vínculos
                {vinculos.dados.total > vinculos.dados.items.length && ` (a busca alcança os ${vinculos.dados.items.length} primeiros)`}
              </p>
            </>
          )}
        </div>
      </section>

      {pedido && (
        <Confirmacao {...confirmacaoDe(pedido, t)} onConfirmar={() => confirmar(pedido, t)} onCancelar={() => setPedido(null)} />
      )}
      {editando && <FormTurma inicial={t} onSalvar={salvarTurma} onFechar={() => setEditando(false)} />}
      {vinculando && (
        <FormVinculo
          papel={vinculando}
          jaVinculados={new Set(vinculos.estado === 'pronto' ? vinculos.dados.items.map((v) => v.usuario.id) : [])}
          buscar={buscarPessoas}
          onVincular={vincularPessoa}
          onFechar={() => setVinculando(null)}
        />
      )}
    </div>
  )
}
