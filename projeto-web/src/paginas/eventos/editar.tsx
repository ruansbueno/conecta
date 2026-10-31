// T12: editar evento por PATCH parcial; só o que mudou é enviado (RW-34, RW-42; plan-f2 D-F2-5).
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { editarEvento, obterEvento } from '../../api/recursos/eventos'
import type { EventoAgenda } from '../../api/schemas'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EditorEvento, errosDoEventoNaApi, focarPrimeiroErroEvento } from '../../componentes/eventos/formulario-evento'
import { edicaoDoEvento, formularioDoEvento, formularioEventoVazio, validarEvento, type ErrosEvento, type FormularioEvento } from '../../lib/formulario-evento'
import { apagarRascunho, lerRascunhoEvento, type ChaveRascunhoEvento } from '../../lib/rascunho'
import { useSessao } from '../../sessao/contexto'
import { mensagemDe, type Carga } from '../comum'
import { idDaUrl } from '../lista-na-url'
import { formularioDoRascunho, soTurmasDoDocente, useRascunhoDoEvento, useTurmasDestino } from './comum'

const VAZIO = formularioEventoVazio()

export default function EditarEvento() {
  const { id = '' } = useParams()
  const chave: ChaveRascunhoEvento = `rascunho:evento:${id}`
  const { usuario } = useSessao()
  const navegar = useNavigate()
  const turmas = useTurmasDestino()
  const [evento, setEvento] = useState<Carga<EventoAgenda>>({ estado: 'carregando' })
  const [digitado, setFormulario] = useState<FormularioEvento | null>(null)
  const [erros, setErros] = useState<ErrosEvento>({})
  const [alerta, setAlerta] = useState<string>()
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
      setEvento({ estado: 'pronto', dados: atual })
      const r = lerRascunhoEvento(chave)
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
  useRascunhoDoEvento(chave, digitado ?? VAZIO, digitado !== null && !salvo)

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
      setAlerta(mensagemDe(e))
      if (!(e instanceof ApiError)) return
      if (e.efeito === 'marcaCampos') setErros(errosDoEventoNaApi(e, formulario.destinos))
      if (e.efeito === 'recarrega') await turmas.recarregar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <EditorEvento
        modo="editar"
        subtitulo={`Versão ${atual.versaoAtual} · salvar cria a versão ${atual.versaoAtual + 1}, e a anterior fica no histórico`}
        formulario={formulario}
        onMudar={setFormulario}
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
            navegar(`/eventos/${atual.id}`)
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
