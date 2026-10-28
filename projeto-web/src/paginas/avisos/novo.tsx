// T04/T15: publicar aviso (RW-15, RW-16, RW-17, RW-22, RW-42).
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { ApiError } from '../../api/erros'
import { criarAviso } from '../../api/recursos/avisos'
import type { AvisoGestao } from '../../api/schemas'
import { AvisoSalvo } from '../../componentes/avisos/aviso-salvo'
import { Editor, errosDaApi, focarPrimeiroErro } from '../../componentes/avisos/editor'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { dataRelativa } from '../../lib/datas'
import {
  estaAgendado,
  formularioVazio,
  momentoDaPublicacao,
  validarAviso,
  type ErrosAviso,
  type FormularioAviso,
} from '../../lib/formulario-aviso'
import { apagarRascunho, lerRascunho } from '../../lib/rascunho'
import { useSessao } from '../../sessao/contexto'
import { mensagemDe, soTurmasPermitidas, useRascunhoAutomatico, useTurmasDestino } from './comum'

const CHAVE = 'rascunho:aviso:novo'

function inicial(): { formulario: FormularioAviso; recuperadoEm: Date | null } {
  const r = lerRascunho(CHAVE)
  if (!r) return { formulario: formularioVazio(), recuperadoEm: null }
  return {
    formulario: { ...formularioVazio(), titulo: r.titulo, conteudo: r.conteudo, destinos: r.destinos },
    recuperadoEm: r.salvoEm,
  }
}

export default function NovoAviso() {
  const { usuario } = useSessao()
  const navegar = useNavigate()
  const { carga, recarregar } = useTurmasDestino()
  const [comeco] = useState(inicial)
  const [digitado, setFormulario] = useState(comeco.formulario)
  const [recuperadoEm, setRecuperadoEm] = useState(comeco.recuperadoEm)
  const [erros, setErros] = useState<ErrosAviso>({})
  const [alerta, setAlerta] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const [publicado, setPublicado] = useState<AvisoGestao | null>(null)
  const [descartando, setDescartando] = useState(false)
  useRascunhoAutomatico(CHAVE, digitado, !publicado)

  if (!usuario || carga.estado === 'carregando') return <Esqueleto rotulo="Carregando o editor" />
  if (carga.estado === 'erro') return <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
  const docente = usuario.perfil === 'docente'
  const turmas = carga.dados
  const formulario = docente ? soTurmasPermitidas(digitado, turmas) : digitado

  if (publicado) {
    return (
      <AvisoSalvo titulo={estaAgendado(publicado) ? 'Aviso agendado' : 'Aviso publicado'} aviso={publicado}>
        <button
          type="button"
          className="botao-primario"
          onClick={() => {
            setFormulario(formularioVazio())
            setRecuperadoEm(null)
            setErros({})
            setPublicado(null)
          }}
        >
          Publicar outro
        </button>
        <Link to="/painel" className="botao-secundario">
          Voltar ao painel
        </Link>
      </AvisoSalvo>
    )
  }

  async function enviar() {
    const locais = validarAviso(formulario)
    setErros(locais)
    setAlerta(undefined)
    if (Object.keys(locais).length > 0) {
      focarPrimeiroErro(locais)
      return
    }
    setEnviando(true)
    try {
      const aviso = await criarAviso({
        titulo: formulario.titulo.trim(),
        conteudo: formulario.conteudo.trim(),
        publicarEm: momentoDaPublicacao(formulario),
        destinos: formulario.destinos,
      })
      apagarRascunho(CHAVE)
      setPublicado(aviso)
    } catch (e) {
      setAlerta(mensagemDe(e))
      if (!(e instanceof ApiError)) return
      if (e.efeito === 'marcaCampos') setErros(errosDaApi(e, formulario.destinos))
      if (e.efeito === 'recarrega') {
        await recarregar()
      }
    } finally {
      setEnviando(false)
    }
  }

  const descartar = () => {
    apagarRascunho(CHAVE)
    navegar('/painel')
  }

  return (
    <>
      <Editor
        modo="novo"
        subtitulo={
          recuperadoEm
            ? `Rascunho recuperado (salvo ${dataRelativa(recuperadoEm)}) · nenhuma pessoa foi notificada ainda`
            : 'Rascunho salvo automaticamente · nenhuma pessoa foi notificada ainda'
        }
        formulario={formulario}
        onMudar={setFormulario}
        erros={erros}
        alerta={alerta}
        turmas={turmas}
        docente={docente}
        autor={usuario.nome}
        podeAgendar
        enviando={enviando}
        voltarPara="/painel"
        onEnviar={enviar}
        onDescartar={() => setDescartando(true)}
      />
      {descartando && (
        <Confirmacao
          titulo="Descartar este aviso?"
          consequencia="O texto e os destinos escolhidos serão apagados deste navegador. Nada foi publicado."
          acao="Descartar"
          destrutiva
          onConfirmar={descartar}
          onCancelar={() => setDescartando(false)}
        />
      )}
    </>
  )
}
