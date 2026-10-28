// T04: editar aviso por PATCH parcial; destinos vão inteiros só quando mudam (RW-18, RW-42).
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { desarquivarAviso, editarAviso, obterAviso, type EdicaoAviso } from '../../api/recursos/avisos'
import type { AvisoGestao, DestinoEscolhido } from '../../api/schemas'
import { Editor, errosDaApi, focarPrimeiroErro } from '../../componentes/avisos/editor'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { dataRelativa } from '../../lib/datas'
import {
  estaAgendado,
  formularioVazio,
  mesmosDestinos,
  momentoDaPublicacao,
  validarAviso,
  type ErrosAviso,
  type FormularioAviso,
} from '../../lib/formulario-aviso'
import { apagarRascunho, lerRascunho, type ChaveRascunho } from '../../lib/rascunho'
import { useSessao } from '../../sessao/contexto'
import { mensagemDe, soTurmasPermitidas, useRascunhoAutomatico, useTurmasDestino, type Carga } from './comum'

const NADA_ALTERADO = 'Nenhuma alteração para salvar.'

const doisDigitos = (n: number) => String(n).padStart(2, '0')

const escolhidos = (aviso: AvisoGestao): DestinoEscolhido[] =>
  aviso.destinos.map((d) => ({
    tipo: d.tipo,
    ...(d.turma ? { turmaId: d.turma.id, turmaNome: d.turma.nome } : {}),
    ...(d.semestre !== null ? { semestre: d.semestre } : {}),
  }))

function formularioDo(aviso: AvisoGestao): FormularioAviso {
  const agendado = estaAgendado(aviso)
  const p = aviso.publicarEm
  return {
    ...formularioVazio(),
    titulo: aviso.titulo,
    conteudo: aviso.conteudo,
    destinos: escolhidos(aviso),
    agendar: !!agendado,
    data: agendado && p ? `${p.getFullYear()}-${doisDigitos(p.getMonth() + 1)}-${doisDigitos(p.getDate())}` : '',
    hora: agendado && p ? `${doisDigitos(p.getHours())}:${doisDigitos(p.getMinutes())}` : '',
  }
}

const aoMinuto = (d: Date | null) => (d ? Math.floor(d.getTime() / 60_000) : null)

/** Só os campos alterados; `publicarEm` só conta em aviso ainda agendado, comparado ao minuto (o formulário não tem segundos). */
function diferencas(aviso: AvisoGestao, f: FormularioAviso): EdicaoAviso {
  const edicao: EdicaoAviso = {}
  if (f.titulo.trim() !== aviso.titulo) edicao.titulo = f.titulo.trim()
  if (f.conteudo.trim() !== aviso.conteudo) edicao.conteudo = f.conteudo.trim()
  if (!mesmosDestinos(f.destinos, escolhidos(aviso))) edicao.destinos = f.destinos
  if (estaAgendado(aviso)) {
    const quando = momentoDaPublicacao(f)
    if (aoMinuto(quando) !== aoMinuto(aviso.publicarEm)) edicao.publicarEm = quando
  }
  return edicao
}

export default function EditarAviso() {
  const { id = '' } = useParams()
  const chave: ChaveRascunho = `rascunho:aviso:${id}`
  const { usuario } = useSessao()
  const navegar = useNavigate()
  const turmas = useTurmasDestino()
  const [aviso, setAviso] = useState<Carga<AvisoGestao>>({ estado: 'carregando' })
  const [digitado, setFormulario] = useState<FormularioAviso>(formularioVazio)
  const [alterado, setAlterado] = useState(false)
  const [recuperadoEm, setRecuperadoEm] = useState<Date | null>(null)
  const [erros, setErros] = useState<ErrosAviso>({})
  const [alerta, setAlerta] = useState<ReactNode>()
  const [informacao, setInformacao] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [descartando, setDescartando] = useState(false)
  useRascunhoAutomatico(chave, digitado, alterado && !salvo)

  const carregar = useCallback(async () => {
    try {
      const atual = await obterAviso(id)
      // Rascunho mais antigo que a última edição no servidor sobrescreveria a versão de outra
      // pessoa sem ninguém perceber: descarta. O mais novo volta, e a página avisa.
      let r = lerRascunho(`rascunho:aviso:${id}`)
      if (r && r.salvoEm <= (atual.editadoEm ?? atual.criadoEm)) {
        apagarRascunho(`rascunho:aviso:${id}`)
        r = null
      }
      setAviso({ estado: 'pronto', dados: atual })
      setRecuperadoEm(r?.salvoEm ?? null)
      setFormulario(
        r ? { ...formularioDo(atual), titulo: r.titulo, conteudo: r.conteudo, destinos: r.destinos } : formularioDo(atual),
      )
    } catch (e) {
      // Aviso alheio leva à tela sem permissão (RW-12); aviso que sumiu não volta tentando de novo.
      if (e instanceof ApiError && e.efeito === 'semPermissao') return navegar('/sem-permissao', { replace: true })
      setAviso({ estado: 'erro', mensagem: mensagemDe(e), repetivel: !(e instanceof ApiError && e.efeito === 'voltaLista') })
    }
  }, [id, navegar])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregar()
  }, [carregar])

  if (!usuario || aviso.estado === 'carregando' || turmas.carga.estado === 'carregando') {
    return <Esqueleto rotulo="Carregando o aviso" />
  }
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
  if (turmas.carga.estado === 'erro') return <EstadoErro mensagem={turmas.carga.mensagem} onRepetir={turmas.recarregar} />
  const original = aviso.dados
  const docente = usuario.perfil === 'docente'
  const formulario = docente ? soTurmasPermitidas(digitado, turmas.carga.dados) : digitado

  async function desarquivar() {
    try {
      const atual = await desarquivarAviso(id)
      setAviso({ estado: 'pronto', dados: atual })
      setAlerta('Aviso desarquivado. Agora você pode salvar as alterações.')
    } catch (e) {
      setAlerta(mensagemDe(e))
    }
  }

  async function enviar() {
    const edicao = diferencas(original, formulario)
    const locais = validarAviso(formulario, new Date(), { validarData: 'publicarEm' in edicao })
    setErros(locais)
    setAlerta(undefined)
    setInformacao(undefined)
    if (Object.keys(locais).length > 0) {
      focarPrimeiroErro(locais)
      return
    }
    if (Object.keys(edicao).length === 0) {
      setInformacao(NADA_ALTERADO)
      return
    }
    setEnviando(true)
    try {
      const atual = await editarAviso(id, edicao)
      apagarRascunho(chave)
      setSalvo(true)
      navegar(`/avisos/${id}`, {
        state: { mensagem: `Alterações salvas. Esta é a versão ${atual.versaoAtual}.` },
      })
    } catch (e) {
      // A API também compara (ex.: espaços que o navegador manteve): "nenhuma alteração" não é falha.
      if (e instanceof ApiError && e.errors.some((x) => x.campo === 'body' && x.mensagem === 'nenhuma alteração')) {
        setInformacao(NADA_ALTERADO)
        return
      }
      setAlerta(mensagemDe(e))
      if (!(e instanceof ApiError)) return
      if (e.efeito === 'semPermissao') navegar('/sem-permissao', { replace: true })
      if (e.efeito === 'marcaCampos') setErros(errosDaApi(e, formulario.destinos))
      if (e.efeito === 'ofereceDesarquivar') {
        setAlerta(
          <span className="flex flex-wrap items-center gap-3">
            {e.mensagem}
            <button type="button" onClick={desarquivar} className="botao-secundario">
              Desarquivar
            </button>
          </span>,
        )
      }
      if (e.efeito === 'recarrega') {
        await turmas.recarregar()
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Editor
        modo="editar"
        subtitulo={
          (recuperadoEm ? `Rascunho recuperado (salvo ${dataRelativa(recuperadoEm)}) · ` : '') +
          `Salvar cria a versão ${original.versaoAtual + 1}; as anteriores ficam no histórico`
        }
        formulario={formulario}
        onMudar={(f) => {
          setFormulario(f)
          setAlterado(true)
        }}
        erros={erros}
        alerta={alerta}
        informacao={informacao}
        turmas={turmas.carga.dados}
        docente={docente}
        autor={original.autor.nome}
        podeAgendar={estaAgendado(original)}
        enviando={enviando}
        voltarPara={`/avisos/${id}`}
        onEnviar={enviar}
        onDescartar={() => setDescartando(true)}
      />
      {descartando && (
        <Confirmacao
          titulo="Descartar as alterações?"
          consequencia="O aviso continua como está; o que você mudou aqui será apagado deste navegador."
          acao="Descartar"
          destrutiva
          onConfirmar={() => {
            apagarRascunho(chave)
            navegar(`/avisos/${id}`)
          }}
          onCancelar={() => setDescartando(false)}
        />
      )}
    </>
  )
}
