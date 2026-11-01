// T04/T15: publicar aviso (RW-15, RW-16, RW-17, RW-22, RW-42).
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { criarAviso } from '../../api/recursos/avisos'
import { Editor, errosDaApi, focarPrimeiroErro } from '../../componentes/avisos/editor'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { dataHora, dataRelativa } from '../../lib/datas'
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
import { idDaUrl } from '../lista-na-url'
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
  const [recuperadoEm] = useState(comeco.recuperadoEm)
  const [erros, setErros] = useState<ErrosAviso>({})
  const [alerta, setAlerta] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  // Depois de publicar, o rascunho não volta enquanto a página sai.
  const [publicado, setPublicado] = useState(false)
  const [descartando, setDescartando] = useState(false)
  useRascunhoAutomatico(CHAVE, digitado, !publicado)

  // `?turma=<id>` (vindo da grade de horários, RW-36): a turma entra como destino, uma vez, se
  // estiver entre as que a pessoa pode escolher.
  const [params] = useSearchParams()
  const turmaDaUrl = idDaUrl(params.get('turma'))
  const turmaAplicada = useRef(false)
  useEffect(() => {
    if (turmaAplicada.current || !turmaDaUrl || carga.estado !== 'pronto') return
    turmaAplicada.current = true
    const t = carga.dados.find((x) => x.id === turmaDaUrl)
    if (!t) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- aplicado uma vez, quando as turmas chegam
    setFormulario((f) =>
      f.destinos.some((d) => d.tipo === 'turma' && d.turmaId === t.id)
        ? f
        : { ...f, destinos: [...f.destinos, { tipo: 'turma', turmaId: t.id, turmaNome: t.nome }] },
    )
  }, [turmaDaUrl, carga])

  if (!usuario || carga.estado === 'carregando') return <Esqueleto rotulo="Carregando o editor" />
  if (carga.estado === 'erro') return <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
  const docente = usuario.perfil === 'docente'
  const turmas = carga.dados
  const formulario = docente ? soTurmasPermitidas(digitado, turmas) : digitado

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
      setPublicado(true)
      // Agendado vai para a aba dele; publicado, para os ativos (a lista recarrega ao abrir).
      // Substitui o editor no histórico: voltar não reabre o formulário de um aviso já publicado.
      navegar(estaAgendado(aviso) ? '/avisos?situacao=agendado' : '/avisos', {
        replace: true,
        state: {
          mensagem:
            estaAgendado(aviso) && aviso.publicarEm ? `Aviso agendado para ${dataHora(aviso.publicarEm)}.` : 'Aviso publicado.',
        },
      })
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
    navegar('/avisos')
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
        voltarPara="/avisos"
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
