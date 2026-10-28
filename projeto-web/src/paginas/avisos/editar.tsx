// T04: editar aviso por PATCH parcial; destinos vão inteiros só quando mudam (RW-18, RW-42).
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'

import { ApiError } from '../../api/erros'
import { desarquivarAviso, editarAviso, obterAviso, type EdicaoAviso } from '../../api/recursos/avisos'
import type { AvisoGestao, DestinoEscolhido } from '../../api/schemas'
import { AvisoSalvo } from '../../componentes/avisos/aviso-salvo'
import { Editor, errosDaApi, focarPrimeiroErro } from '../../componentes/avisos/editor'
import { Confirmacao } from '../../componentes/comum/confirmacao'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import {
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

const doisDigitos = (n: number) => String(n).padStart(2, '0')

const escolhidos = (aviso: AvisoGestao): DestinoEscolhido[] =>
  aviso.destinos.map((d) => ({
    tipo: d.tipo,
    ...(d.turma ? { turmaId: d.turma.id, turmaNome: d.turma.nome } : {}),
    ...(d.semestre !== null ? { semestre: d.semestre } : {}),
  }))

function formularioDo(aviso: AvisoGestao): FormularioAviso {
  const agendado = aviso.situacao === 'agendado' && aviso.publicarEm
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

/** Só os campos alterados; `publicarEm` só conta em aviso ainda agendado. */
function diferencas(aviso: AvisoGestao, f: FormularioAviso): EdicaoAviso {
  const edicao: EdicaoAviso = {}
  if (f.titulo.trim() !== aviso.titulo) edicao.titulo = f.titulo.trim()
  if (f.conteudo.trim() !== aviso.conteudo) edicao.conteudo = f.conteudo.trim()
  if (!mesmosDestinos(f.destinos, escolhidos(aviso))) edicao.destinos = f.destinos
  if (aviso.situacao === 'agendado') {
    const quando = momentoDaPublicacao(f)
    if ((quando?.getTime() ?? null) !== (aviso.publicarEm?.getTime() ?? null)) edicao.publicarEm = quando
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
  const [formulario, setFormulario] = useState<FormularioAviso>(formularioVazio)
  const [alterado, setAlterado] = useState(false)
  const [erros, setErros] = useState<ErrosAviso>({})
  const [alerta, setAlerta] = useState<ReactNode>()
  const [enviando, setEnviando] = useState(false)
  const [salvo, setSalvo] = useState<AvisoGestao | null>(null)
  const [descartando, setDescartando] = useState(false)
  useRascunhoAutomatico(chave, formulario, alterado && !salvo)

  const carregar = useCallback(async () => {
    try {
      const atual = await obterAviso(id)
      const r = lerRascunho(`rascunho:aviso:${id}`)
      setAviso({ estado: 'pronto', dados: atual })
      setFormulario(
        r ? { ...formularioDo(atual), titulo: r.titulo, conteudo: r.conteudo, destinos: r.destinos } : formularioDo(atual),
      )
    } catch (e) {
      setAviso({ estado: 'erro', mensagem: mensagemDe(e) })
    }
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o estado muda depois do await
    void carregar()
  }, [carregar])

  if (!usuario || aviso.estado === 'carregando' || turmas.carga.estado === 'carregando') {
    return <Esqueleto rotulo="Carregando o aviso" />
  }
  if (aviso.estado === 'erro') return <EstadoErro mensagem={aviso.mensagem} onRepetir={carregar} />
  if (turmas.carga.estado === 'erro') return <EstadoErro mensagem={turmas.carga.mensagem} onRepetir={turmas.recarregar} />
  const original = aviso.dados
  const docente = usuario.perfil === 'docente'

  if (salvo) {
    return (
      <AvisoSalvo titulo="Alterações salvas" aviso={salvo}>
        <Link to="/painel" className="botao-primario">
          Voltar ao painel
        </Link>
      </AvisoSalvo>
    )
  }

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
    const locais = validarAviso(formulario)
    setErros(locais)
    setAlerta(undefined)
    if (Object.keys(locais).length > 0) {
      focarPrimeiroErro(locais)
      return
    }
    const edicao = diferencas(original, formulario)
    if (Object.keys(edicao).length === 0) {
      setAlerta('Nenhuma alteração para salvar.')
      return
    }
    setEnviando(true)
    try {
      const atual = await editarAviso(id, edicao)
      apagarRascunho(chave)
      setSalvo(atual)
    } catch (e) {
      setAlerta(mensagemDe(e))
      if (!(e instanceof ApiError)) return
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
        const lista = await turmas.recarregar()
        if (lista && docente) setFormulario((f) => soTurmasPermitidas(f, lista))
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <>
      <Editor
        modo="editar"
        subtitulo={`Salvar cria a versão ${original.versaoAtual + 1}; as anteriores ficam no histórico`}
        formulario={formulario}
        onMudar={(f) => {
          setFormulario(f)
          setAlterado(true)
        }}
        erros={erros}
        alerta={alerta}
        turmas={turmas.carga.dados}
        docente={docente}
        autor={original.autor.nome}
        podeAgendar={original.situacao === 'agendado'}
        enviando={enviando}
        voltarPara="/painel"
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
            navegar('/painel')
          }}
          onCancelar={() => setDescartando(false)}
        />
      )}
    </>
  )
}
