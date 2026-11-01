// T12: criar evento (RW-34, RW-42; plan-f2 D-F2-5).
import { useState } from 'react'
import { useNavigate } from 'react-router'

import { ApiError } from '../../api/erros'
import { criarEvento } from '../../api/recursos/eventos'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EditorEvento, errosDoEventoNaApi, focarPrimeiroErroEvento } from '../../componentes/eventos/formulario-evento'
import { dataRelativa } from '../../lib/datas'
import { formularioEventoVazio, novoEvento, validarEvento, type ErrosEvento, type FormularioEvento } from '../../lib/formulario-evento'
import { apagarRascunho, lerRascunhoEvento } from '../../lib/rascunho'
import { useSessao } from '../../sessao/contexto'
import { mensagemDe, useSairDoEditor } from '../comum'
import { formularioDoRascunho, soTurmasDoDocente, useRascunhoDoEvento, useTurmasDestino } from './comum'

const CHAVE = 'rascunho:evento:novo'

function inicial(): { formulario: FormularioEvento; recuperadoEm: Date | null } {
  const r = lerRascunhoEvento(CHAVE)
  if (!r) return { formulario: formularioEventoVazio(), recuperadoEm: null }
  return { formulario: formularioDoRascunho(r), recuperadoEm: r.salvoEm }
}

export default function NovoEvento() {
  const { usuario } = useSessao()
  const navegar = useNavigate()
  const sairDoEditor = useSairDoEditor('/eventos')
  const { carga, recarregar } = useTurmasDestino()
  const [comeco] = useState(inicial)
  const [digitado, setFormulario] = useState(comeco.formulario)
  const [erros, setErros] = useState<ErrosEvento>({})
  const [alerta, setAlerta] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [criado, setCriado] = useState(false)
  const [descartando, setDescartando] = useState(false)
  useRascunhoDoEvento(CHAVE, digitado, !criado)

  if (!usuario || carga.estado === 'carregando') return <Esqueleto rotulo="Carregando o editor" />
  if (carga.estado === 'erro') return <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
  const docente = usuario.perfil === 'docente'
  const turmas = carga.dados
  const formulario = docente ? soTurmasDoDocente(digitado, turmas) : digitado

  async function enviar() {
    const locais = validarEvento(formulario)
    setErros(locais)
    setAlerta(undefined)
    if (Object.keys(locais).length > 0) {
      focarPrimeiroErroEvento(locais)
      return
    }
    setEnviando(true)
    try {
      await criarEvento(novoEvento(formulario))
      apagarRascunho(CHAVE)
      setCriado(true)
      // Substitui o editor no histórico: voltar não reabre o formulário de um evento já criado.
      navegar('/eventos', { replace: true, state: { mensagem: 'Evento criado.' } })
    } catch (e) {
      setAlerta(mensagemDe(e))
      if (!(e instanceof ApiError)) return
      if (e.efeito === 'marcaCampos') setErros(errosDoEventoNaApi(e, formulario.destinos))
      if (e.efeito === 'recarrega') await recarregar()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <EditorEvento
        modo="novo"
        subtitulo={
          comeco.recuperadoEm
            ? `Rascunho recuperado (salvo ${dataRelativa(comeco.recuperadoEm)}) · ninguém vê o evento ainda`
            : 'Rascunho salvo automaticamente · ninguém vê o evento ainda'
        }
        formulario={formulario}
        onMudar={setFormulario}
        erros={erros}
        alerta={alerta}
        turmas={turmas}
        docente={docente}
        enviando={enviando}
        voltarPara="/eventos"
        onEnviar={enviar}
        onDescartar={() => setDescartando(true)}
      />
      {descartando && (
        <Confirmacao
          titulo="Descartar este evento?"
          consequencia="O que foi preenchido será apagado deste navegador. Nada foi criado."
          acao="Descartar"
          destrutiva
          onConfirmar={() => {
            apagarRascunho(CHAVE)
            sairDoEditor()
          }}
          onCancelar={() => setDescartando(false)}
        />
      )}
    </>
  )
}
