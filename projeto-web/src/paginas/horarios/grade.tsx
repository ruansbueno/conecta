// T13 (design w-13): grade semanal de uma turma, com a modal de aula, os conflitos como atenção,
// os docentes da grade e o convite a avisar a turma (RW-35, RW-36, RW-46; plan-f2 D-F2-8 a 12).
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { criarAula, editarAula, gradeDaTurma, removerAula } from '../../api/recursos/horarios'
import { obterTurma } from '../../api/recursos/turmas'
import { listarUsuarios } from '../../api/recursos/usuarios'
import type { Aula, Turma } from '../../api/schemas'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EstadoVazio } from '../../componentes/comum/estado-vazio'
import { Icone } from '../../componentes/comum/icone'
import { linkAvisarTurma, ResultadoDaAula, type ResultadoDaGrade } from '../../componentes/horarios/conflitos'
import { DocentesDaGrade } from '../../componentes/horarios/docentes-da-grade'
import { GradeSemanal } from '../../componentes/horarios/grade-semanal'
import { ModalAula, type DocenteOpcao } from '../../componentes/horarios/modal-aula'
import {
  aulaNova,
  dadosDaAula,
  docentesDaGrade,
  edicaoDaAula,
  formularioDaAula,
  montarGrade,
  textoDoConflito,
  validarAula,
  type ErrosAula,
  type FormularioAula,
} from '../../lib/grade'
import { lembrarTurmaDosHorarios } from '../../lib/rascunho'
import { mensagemDe, type Carga } from '../comum'
import { idDaUrl } from '../lista-na-url'

type Edicao = { modo: 'nova'; inicial: FormularioAula } | { modo: 'editar'; aula: Aula }

/** Campos do 422 (`body.dia_semana`) para os do formulário. */
const CAMPO_DA_API: Record<string, keyof FormularioAula> = {
  dia_semana: 'diaSemana',
  inicio: 'inicio',
  fim: 'fim',
  disciplina: 'disciplina',
  local: 'local',
  docente_id: 'docenteId',
}

function errosDaApi(e: ApiError): ErrosAula {
  const erros: ErrosAula = {}
  for (const { campo, mensagem } of e.errors) {
    const alvo = CAMPO_DA_API[campo.replace(/^body\./, '').split('.')[0]]
    if (alvo) erros[alvo] ??= mensagem
  }
  return erros
}

const DOCENTE_INVALIDO: Record<string, string> = {
  PERFIL_INCOMPATIVEL: 'Esta pessoa não tem mais o perfil docente. Escolha outra.',
  USUARIO_NAO_ENCONTRADO: 'Esta pessoa não está mais disponível. Escolha outra.',
}

export default function GradeHorarios() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const [turma, setTurma] = useState<Carga<Turma>>({ estado: 'carregando' })
  const [aulas, setAulas] = useState<Aula[]>([])
  const [docentes, setDocentes] = useState<Carga<DocenteOpcao[]>>({ estado: 'carregando' })
  const [edicao, setEdicao] = useState<Edicao | null>(null)
  const [erros, setErros] = useState<ErrosAula>({})
  const [alerta, setAlerta] = useState<string>()
  const [informacao, setInformacao] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [removendo, setRemovendo] = useState(false)
  const [resultado, setResultado] = useState<ResultadoDaGrade>()

  const carregar = useCallback(async () => {
    // Id que não é UUID nunca existiu: a API real responderia 422, e "tentar de novo" não resolveria.
    if (!idDaUrl(id)) {
      setTurma({ estado: 'erro', mensagem: new ApiError({ code: 'TURMA_NAO_ENCONTRADA' }).mensagem, repetivel: false })
      return
    }
    setTurma({ estado: 'carregando' })
    try {
      const [t, grade] = await Promise.all([obterTurma(id), gradeDaTurma(id)])
      setAulas(grade.items)
      setTurma({ estado: 'pronto', dados: t })
      if (t.ativa) lembrarTurmaDosHorarios(t.id)
    } catch (e) {
      if (e instanceof ApiError && e.efeito === 'semPermissao') return navegar('/sem-permissao', { replace: true })
      const sumiu = e instanceof ApiError && e.code === 'TURMA_NAO_ENCONTRADA'
      setTurma({ estado: 'erro', mensagem: mensagemDe(e), repetivel: !sumiu })
    }
  }, [id, navegar])

  /** Depois de uma mudança: só a grade, sem esqueleto. */
  const recarregarAulas = useCallback(async () => {
    try {
      setAulas((await gradeDaTurma(id)).items)
    } catch (e) {
      setResultado({ tipo: 'erro', texto: `A grade não pôde ser atualizada: ${mensagemDe(e)}` })
    }
  }, [id])

  const carregarDocentes = useCallback(async () => {
    try {
      const { items } = await listarUsuarios({ perfil: 'docente', ativo: true, limit: 100 })
      setDocentes({ estado: 'pronto', dados: items.map((u) => ({ id: u.id, nome: u.nome })) })
    } catch (e) {
      setDocentes({ estado: 'erro', mensagem: mensagemDe(e) })
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregar()
    void carregarDocentes()
  }, [carregar, carregarDocentes])

  const grade = useMemo(() => montarGrade(aulas), [aulas])
  const docentesDaTurma = useMemo(() => docentesDaGrade(aulas), [aulas])

  function abrir(nova: Edicao) {
    setErros({})
    setAlerta(undefined)
    setInformacao(undefined)
    setEdicao(nova)
    if (docentes.estado === 'erro') void carregarDocentes()
  }
  const fechar = () => setEdicao(null)

  /** Falha comum a salvar e remover; devolve se a modal deve fechar. */
  async function falhou(e: unknown): Promise<boolean> {
    if (e instanceof ApiError && e.efeito === 'semPermissao') {
      navegar('/sem-permissao', { replace: true })
      return true
    }
    if (e instanceof ApiError && (e.code === 'HORARIO_NAO_ENCONTRADO' || e.code === 'TURMA_NAO_ENCONTRADA')) {
      setResultado({ tipo: 'erro', texto: mensagemDe(e) })
      void (e.code === 'TURMA_NAO_ENCONTRADA' ? carregar() : recarregarAulas())
      return true
    }
    if (e instanceof ApiError && DOCENTE_INVALIDO[e.code]) {
      setErros({ docenteId: DOCENTE_INVALIDO[e.code] })
      await carregarDocentes()
      return false
    }
    if (e instanceof ApiError && e.efeito === 'marcaCampos') setErros(errosDaApi(e))
    setAlerta(mensagemDe(e))
    return false
  }

  async function salvar(f: FormularioAula) {
    if (!edicao) return
    const locais = validarAula(f)
    setErros(locais)
    setAlerta(undefined)
    setInformacao(undefined)
    if (Object.keys(locais).length > 0) return
    let pedido
    if (edicao.modo === 'editar') {
      const mudanca = edicaoDaAula(edicao.aula, f)
      if (Object.keys(mudanca).length === 0) return setInformacao('Nenhuma alteração para salvar.')
      pedido = () => editarAula(id, edicao.aula.id, mudanca)
    } else {
      pedido = () => criarAula(id, dadosDaAula(f))
    }
    setEnviando(true)
    try {
      const { horario, conflitos } = await pedido()
      setEdicao(null)
      setResultado(
        conflitos.length > 0
          ? {
              tipo: 'atencao',
              texto: 'Aula salva, com choque de horário. Confira se é isso mesmo:',
              conflitos: conflitos.map((c) => textoDoConflito(c, horario)),
            }
          : { tipo: 'sucesso', texto: 'Aula salva.' },
      )
      void recarregarAulas()
    } catch (e) {
      if (await falhou(e)) setEdicao(null)
    } finally {
      setEnviando(false)
    }
  }

  async function remover() {
    if (edicao?.modo !== 'editar') return
    setRemovendo(false)
    setEnviando(true)
    try {
      await removerAula(id, edicao.aula.id)
      setEdicao(null)
      setResultado({ tipo: 'sucesso', texto: 'Aula removida.' })
      void recarregarAulas()
    } catch (e) {
      if (await falhou(e)) setEdicao(null)
    } finally {
      setEnviando(false)
    }
  }

  if (turma.estado === 'carregando') return <Esqueleto rotulo="Carregando a grade" />
  if (turma.estado === 'erro') {
    if (turma.repetivel) return <EstadoErro mensagem={turma.mensagem} onRepetir={carregar} />
    return (
      <div role="alert" className="flex flex-col items-center px-12 py-16 text-center">
        <p className="text-[13.5px] text-apagado">{turma.mensagem}</p>
        <Link to="/horarios" className="botao-secundario mt-5">
          Escolher outra turma
        </Link>
      </div>
    )
  }
  const t = turma.dados

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.025em] text-navy">Horários</h1>
          <p className="mt-1.5 text-[14px] text-apagado">
            Grade semanal da turma. Os alunos vinculados veem esta mesma grade no aplicativo.
          </p>
        </div>
        <button type="button" onClick={() => abrir({ modo: 'nova', inicial: aulaNova() })} className="botao-primario">
          <Icone nome="mais" tamanho={18} />
          Nova aula
        </button>
      </header>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Link
          to="/horarios"
          aria-label={`Trocar de turma: ${t.codigo} — ${t.nome}`}
          className="inline-flex h-11 items-center gap-2.5 rounded-[10px] border border-linha bg-branco px-4 text-[14px] font-semibold text-navy hover:bg-fundo"
        >
          {t.codigo} — {t.nome}
          <Icone nome="seta" tamanho={16} />
        </Link>
        <span className="inline-flex h-11 items-center rounded-[10px] border border-linha bg-branco px-4 text-[14px] font-medium text-navy-suave">
          {t.periodoLetivo}
        </span>
      </div>

      {!t.ativa && (
        <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-linha bg-alerta-fundo px-4 py-3 text-[13px] text-alerta">
          <Icone nome="info" tamanho={17} className="mt-0.5 shrink-0" />
          Turma inativa: a grade fica guardada, mas não aparece no aplicativo e não é conferida contra as outras turmas.
        </p>
      )}

      <ResultadoDaAula resultado={resultado} turma={t} />

      <div className="mt-5">
        {aulas.length === 0 ? (
          <div className="rounded-xl border border-linha bg-branco">
            <EstadoVazio
              icone="horarios"
              titulo="Nenhuma aula nesta grade"
              texto='Use "Nova aula" para montar a grade da turma. Os alunos veem a grade no aplicativo assim que ela é salva.'
            />
          </div>
        ) : (
          <GradeSemanal
            turma={t.codigo}
            grade={grade}
            onEditar={(aula) => abrir({ modo: 'editar', aula })}
            onNova={(dia, inicio) => abrir({ modo: 'nova', inicial: aulaNova(dia, inicio) })}
          />
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <DocentesDaGrade docentes={docentesDaTurma} />
        <section aria-labelledby="mudou-aula" className="self-start rounded-xl border border-linha bg-branco">
          <h2 id="mudou-aula" className="border-b border-linha-suave px-7 py-5 text-[15px] font-semibold text-navy">
            Mudou alguma aula?
          </h2>
          <div className="px-7 py-5">
            <p className="text-[13.5px] leading-relaxed text-apagado">
              Ajuste a grade aqui e avise a turma pelo módulo de avisos — a mudança de horário não gera aviso automático.
            </p>
            <Link to={linkAvisarTurma(t.id)} className="botao-secundario mt-4">
              Criar aviso para a {t.codigo}
            </Link>
          </div>
        </section>
      </div>

      {edicao && (
        <ModalAula
          key={edicao.modo === 'editar' ? edicao.aula.id : 'nova'}
          modo={edicao.modo}
          inicial={edicao.modo === 'editar' ? formularioDaAula(edicao.aula) : edicao.inicial}
          docentes={docentes.estado === 'pronto' ? docentes.dados : []}
          docenteAtual={edicao.modo === 'editar' ? edicao.aula.docente : null}
          docentesIndisponiveis={docentes.estado === 'erro'}
          erros={erros}
          alerta={alerta}
          informacao={informacao}
          enviando={enviando}
          onEnviar={salvar}
          onRemover={edicao.modo === 'editar' ? () => setRemovendo(true) : undefined}
          onFechar={fechar}
        />
      )}
      {removendo && edicao?.modo === 'editar' && (
        <Confirmacao
          titulo="Remover esta aula?"
          consequencia={`${edicao.aula.disciplina} sai da grade da turma e do aplicativo. A remoção é definitiva: horário não fica no histórico.`}
          acao="Remover"
          destrutiva
          onConfirmar={() => void remover()}
          onCancelar={() => setRemovendo(false)}
        />
      )}
    </div>
  )
}
