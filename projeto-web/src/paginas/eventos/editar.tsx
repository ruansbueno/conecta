// T12: editar evento por PATCH parcial; só o que mudou é enviado (RW-34, RW-42; plan-f2 D-F2-5).
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { desarquivarEvento, editarEvento, obterEvento } from '../../api/recursos/eventos'
import type { EventoAgenda } from '../../api/schemas'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EditorEvento, errosDoEventoNaApi, focarPrimeiroErroEvento } from '../../componentes/eventos/formulario-evento'
import { dataRelativa } from '../../lib/datas'
import { edicaoDoEvento, formularioDoEvento, formularioEventoVazio, validarEvento, type ErrosEvento, type FormularioEvento } from '../../lib/formulario-evento'
import { apagarRascunho, lerRascunhoEvento, type ChaveRascunhoEvento } from '../../lib/rascunho'
import { useSessao } from '../../sessao/contexto'
import { mensagemDe, useSairDoEditor, type Carga } from '../comum'
import { idDaUrl } from '../lista-na-url'
import { formularioDoRascunho, soTurmasDoDocente, useRascunhoDoEvento, useTurmasDestino } from './comum'

const VAZIO = formularioEventoVazio()

export default function EditarEvento() {
  const { id = '' } = useParams()
  const chave: ChaveRascunhoEvento = `rascunho:evento:${id}`
  const { usuario } = useSessao()
  const navegar = useNavigate()
  const sairDoEditor = useSairDoEditor(`/eventos/${id}`)
  const turmas = useTurmasDestino()
  const [evento, setEvento] = useState<Carga<EventoAgenda>>({ estado: 'carregando' })
  const [digitado, setFormulario] = useState<FormularioEvento | null>(null)
  const [erros, setErros] = useState<ErrosEvento>({})
  const [alerta, setAlerta] = useState<ReactNode>()
  const [alterado, setAlterado] = useState(false)
  const [recuperadoEm, setRecuperadoEm] = useState<Date | null>(null)
  const [informacao, setInformacao] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [descartando, setDescartando] = useState(false)

  const carregar = useCallback(async () => {
    if (!idDaUrl(id)) {
      setEvento({ estado: 'erro', mensagem: new ApiError({ code: 'EVENTO_NAO_ENCONTRADO' }).mensagem, repetivel: false })
      return
    }
    try {
      const atual = await obterEvento(id)
      // Rascunho mais antigo que a última edição no servidor desfaria a versão de outra pessoa sem
      // ninguém perceber: descarta. O mais novo volta, e a página avisa (como no aviso).
      let r = lerRascunhoEvento(chave)
      if (r && r.salvoEm <= (atual.editadoEm ?? atual.criadoEm)) {
        apagarRascunho(chave)
        r = null
      }
      setEvento({ estado: 'pronto', dados: atual })
      setRecuperadoEm(r?.salvoEm ?? null)
      setFormulario(r ? formularioDoRascunho(r) : formularioDoEvento(atual))
    } catch (e) {
      if (e instanceof ApiError && e.efeito === 'semPermissao') return navegar('/sem-permissao', { replace: true })
      setEvento({ estado: 'erro', mensagem: mensagemDe(e), repetivel: !(e instanceof ApiError && e.efeito === 'voltaLista') })
    }
  }, [id, chave, navegar])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregar()
  }, [carregar])
  // Só depois de uma mudança: abrir e sair sem mexer não deixa rascunho.
  useRascunhoDoEvento(chave, digitado ?? VAZIO, alterado && !salvo)

  if (!usuario || evento.estado === 'carregando' || turmas.carga.estado === 'carregando' || (evento.estado === 'pronto' && !digitado)) {
    return <Esqueleto rotulo="Carregando o evento" />
  }
  if (evento.estado === 'erro') {
    if (evento.repetivel) return <EstadoErro mensagem={evento.mensagem} onRepetir={carregar} />
    return <Indisponivel mensagem={evento.mensagem} />
  }
  if (turmas.carga.estado === 'erro') return <EstadoErro mensagem={turmas.carga.mensagem} onRepetir={turmas.recarregar} />
  const atual = evento.dados
  if (atual.situacao !== 'ativo') return <Indisponivel mensagem={new ApiError({ code: 'EVENTO_NAO_EDITAVEL' }).mensagem} />
  const docente = usuario.perfil === 'docente'
  const formulario = docente ? soTurmasDoDocente(digitado!, turmas.carga.dados) : digitado!

  async function desarquivar() {
    try {
      setEvento({ estado: 'pronto', dados: await desarquivarEvento(id) })
      setAlerta('Evento desarquivado. Agora você pode salvar as alterações.')
    } catch (e) {
      setAlerta(mensagemDe(e))
    }
  }

  async function enviar() {
    const locais = validarEvento(formulario)
    setErros(locais)
    setAlerta(undefined)
    setInformacao(undefined)
    if (Object.keys(locais).length > 0) {
      focarPrimeiroErroEvento(locais)
      return
    }
    const edicao = edicaoDoEvento(formulario, atual)
    if (Object.keys(edicao).length === 0) {
      setInformacao('Nada foi alterado.')
      return
    }
    setEnviando(true)
    try {
      await editarEvento(atual.id, edicao)
      apagarRascunho(chave)
      setSalvo(true)
      navegar('/eventos', { replace: true, state: { mensagem: 'Evento salvo.' } })
    } catch (e) {
      // A API também compara (ex.: espaços ou segundos de outro cliente): não é falha.
      if (e instanceof ApiError && e.errors.some((x) => x.campo === 'body' && x.mensagem === 'nenhuma alteração')) {
        setInformacao('Nada foi alterado.')
        return
      }
      setAlerta(mensagemDe(e))
      if (!(e instanceof ApiError)) return
      if (e.efeito === 'semPermissao') navegar('/sem-permissao', { replace: true })
      if (e.efeito === 'voltaLista') {
        // Excluído enquanto se editava: o rascunho não serve mais.
        apagarRascunho(chave)
        navegar('/eventos', { replace: true, state: { mensagem: e.mensagem } })
      }
      if (e.efeito === 'marcaCampos') setErros(errosDoEventoNaApi(e, formulario.destinos))
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
      if (e.efeito === 'recarrega') await turmas.recarregar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <EditorEvento
        modo="editar"
        subtitulo={
          (recuperadoEm ? `Rascunho recuperado (salvo ${dataRelativa(recuperadoEm)}) · ` : '') +
          `Salvar cria a versão ${atual.versaoAtual + 1}; as anteriores ficam no histórico`
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
        enviando={enviando}
        voltarPara={`/eventos/${atual.id}`}
        onEnviar={enviar}
        onDescartar={() => setDescartando(true)}
      />
      {descartando && (
        <Confirmacao
          titulo="Descartar as alterações?"
          consequencia="O que mudou será apagado deste navegador. O evento continua como estava."
          acao="Descartar"
          destrutiva
          onConfirmar={() => {
            apagarRascunho(chave)
            sairDoEditor()
          }}
          onCancelar={() => setDescartando(false)}
        />
      )}
    </>
  )
}

function Indisponivel({ mensagem }: { mensagem: string }) {
  return (
    <div role="alert" className="flex flex-col items-center px-12 py-16 text-center">
      <p className="text-[13.5px] text-apagado">{mensagem}</p>
      <Link to="/eventos" className="botao-secundario mt-5">
        Voltar à agenda
      </Link>
    </div>
  )
}
