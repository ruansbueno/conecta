// T12: editor de evento (plan-f2 D-F2-5) — título, tipo, início, fim, local, descrição e destinos,
// com o mesmo seletor de destinos dos avisos. Só apresenta: quem envia e guarda o rascunho é a página.
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'

import type { ApiError } from '../../api/erros'
import type { DestinoEscolhido, Turma } from '../../api/schemas'
import { ROTULO_TIPO, TIPOS_EVENTO } from '../../lib/agenda'
import { chaveDestino, destinoParaExibir } from '../../lib/formulario-aviso'
import type { CampoEvento, ErrosEvento, FormularioEvento } from '../../lib/formulario-evento'
import { ChipDestino, rotuloDestino } from '../comum/chip-destino'
import { DestinosDocente } from '../comum/destinos-docente'
import { Icone } from '../comum/icone'
import { SeletorDestinos } from '../comum/seletor-destinos'

const ORDEM: CampoEvento[] = ['titulo', 'tipo', 'inicio', 'fim', 'local', 'descricao', 'destinos']
const idCampo = (c: CampoEvento) => `evento-${c}`

/** Leva o foco ao primeiro campo com erro (RW-39). */
export function focarPrimeiroErroEvento(erros: ErrosEvento) {
  const campo = ORDEM.find((c) => erros[c])
  if (campo) document.getElementById(idCampo(campo))?.focus()
}

/** `errors[]` de VALIDATION_ERROR por campo; erro de um destino cita o destino pelo nome. */
export function errosDoEventoNaApi(erro: ApiError, destinos: DestinoEscolhido[]): ErrosEvento {
  const erros: ErrosEvento = {}
  for (const { campo, mensagem } of erro.errors) {
    const [raiz, indice] = campo.replace(/^body\./, '').split('.')
    if (raiz === 'destinos') {
      const d = destinos[Number(indice)]
      const texto = d ? `${rotuloDestino(destinoParaExibir(d))}: ${mensagem}` : mensagem
      erros.destinos = erros.destinos ? `${erros.destinos} ${texto}` : texto
    } else if (ORDEM.includes(raiz as CampoEvento)) {
      erros[raiz as CampoEvento] ??= mensagem
    }
  }
  return erros
}

interface Props {
  modo: 'novo' | 'editar'
  subtitulo: string
  formulario: FormularioEvento
  onMudar: (f: FormularioEvento) => void
  erros: ErrosEvento
  alerta?: ReactNode
  informacao?: string
  turmas: Turma[]
  docente: boolean
  enviando: boolean
  voltarPara: string
  onEnviar: () => void
  onDescartar: () => void
}

export function EditorEvento(props: Props) {
  const { modo, subtitulo, formulario: f, onMudar, erros, alerta, informacao, turmas, docente } = props
  const { enviando, voltarPara, onEnviar, onDescartar } = props
  const [seletorAberto, setSeletorAberto] = useState(false)
  const mudar = (parcial: Partial<FormularioEvento>) => onMudar({ ...f, ...parcial })

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onEnviar()
  }
  const descricaoErro = (c: CampoEvento) => (erros[c] ? `${idCampo(c)}-erro` : undefined)
  const erroDoCampo = (c: CampoEvento) =>
    erros[c] && (
      <p id={`${idCampo(c)}-erro`} className="mt-1.5 text-[12.5px] font-medium text-perigo">
        {erros[c]}
      </p>
    )
  const campoTexto = (c: 'titulo' | 'local', rotulo: string, max: number, ajuda?: string) => (
    <div>
      <label htmlFor={idCampo(c)} className="rotulo">
        {rotulo}
      </label>
      <input
        id={idCampo(c)}
        className="campo w-full"
        value={f[c]}
        maxLength={max}
        aria-invalid={!!erros[c]}
        aria-describedby={[descricaoErro(c), ajuda && `${idCampo(c)}-ajuda`].filter(Boolean).join(' ') || undefined}
        onChange={(e) => mudar({ [c]: e.target.value })}
      />
      {ajuda && (
        <p id={`${idCampo(c)}-ajuda`} className="mt-1.5 text-[12.5px] text-tenue">
          {ajuda}
        </p>
      )}
      {erroDoCampo(c)}
    </div>
  )
  const campoData = (c: 'inicio' | 'fim', rotulo: string, ajuda?: string) => (
    <div>
      <label htmlFor={idCampo(c)} className="rotulo">
        {rotulo}
      </label>
      <input
        id={idCampo(c)}
        type="datetime-local"
        className="campo w-full"
        value={f[c] === 'incompleto' ? '' : f[c]}
        aria-invalid={!!erros[c]}
        aria-describedby={[descricaoErro(c), ajuda && `${idCampo(c)}-ajuda`].filter(Boolean).join(' ') || undefined}
        // Data sem hora (ou o contrário) chega vazia: marcar como incompleta, para não virar pontual.
        onChange={(e) => mudar({ [c]: e.target.validity.badInput ? 'incompleto' : e.target.value })}
      />
      {ajuda && (
        <p id={`${idCampo(c)}-ajuda`} className="mt-1.5 text-[12.5px] text-tenue">
          {ajuda}
        </p>
      )}
      {erroDoCampo(c)}
    </div>
  )

  return (
    <form onSubmit={enviar} noValidate className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start gap-4">
        <Link to={voltarPara} aria-label="Voltar" className="botao-icone mt-1">
          <Icone nome="voltar" tamanho={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-navy">{modo === 'novo' ? 'Novo evento' : 'Editar evento'}</h1>
          <p className="mt-1 text-[13px] text-apagado">{subtitulo}</p>
        </div>
        <button type="button" onClick={onDescartar} className="botao-secundario">
          Descartar
        </button>
        <button type="submit" disabled={enviando} aria-busy={enviando} className="botao-primario">
          {modo === 'novo' ? 'Criar evento' : 'Salvar alterações'}
        </button>
      </header>

      {alerta && (
        <div role="alert" className="mt-5 rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
          {alerta}
        </div>
      )}
      {informacao && (
        <p role="status" className="mt-5 rounded-xl border border-linha bg-azul-superficie px-4 py-3 text-[13.5px] text-navy">
          {informacao}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-5 rounded-xl border border-linha bg-branco p-7">
          {campoTexto('titulo', 'Título', 150)}
          <div>
            <label htmlFor={idCampo('tipo')} className="rotulo">
              Tipo
            </label>
            <select
              id={idCampo('tipo')}
              className="campo w-full"
              value={f.tipo}
              aria-invalid={!!erros.tipo}
              aria-describedby={descricaoErro('tipo')}
              onChange={(e) => mudar({ tipo: e.target.value })}
            >
              <option value="">Escolha o tipo</option>
              {TIPOS_EVENTO.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO[t]}
                </option>
              ))}
            </select>
            {erroDoCampo('tipo')}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {campoData('inicio', 'Início')}
            {campoData('fim', 'Fim', 'Opcional. Sem fim, o evento aparece só com a hora de início.')}
          </div>
          {campoTexto('local', 'Local', 120, 'Opcional.')}
          <div>
            <label htmlFor={idCampo('descricao')} className="rotulo">
              Descrição
            </label>
            <textarea
              id={idCampo('descricao')}
              className="campo min-h-[160px] w-full resize-y leading-relaxed"
              value={f.descricao}
              maxLength={5000}
              aria-invalid={!!erros.descricao}
              aria-describedby={descricaoErro('descricao')}
              onChange={(e) => mudar({ descricao: e.target.value })}
            />
            <p className="mt-1.5 text-[12.5px] text-tenue">Opcional.</p>
            {erroDoCampo('descricao')}
          </div>
        </div>

        <section aria-labelledby="quem-ve" className="self-start rounded-xl border border-linha bg-branco">
          <div className="border-b border-linha-suave px-7 py-5">
            <h2 id="quem-ve" className="text-[15px] font-semibold text-navy">
              Quem vê na agenda
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-apagado">
              {docente
                ? 'Como docente, você cria eventos para as turmas em que leciona.'
                : 'De 1 a 20 destinos, como nos avisos. Quem for alcançado por qualquer um vê o evento uma única vez.'}
            </p>
          </div>
          <fieldset id={idCampo('destinos')} tabIndex={-1} aria-describedby={descricaoErro('destinos')} className="min-w-0 px-7 py-5 outline-none">
            <legend className="sr-only">Destinos</legend>
            {docente ? (
              <DestinosDocente turmas={turmas} escolhidos={f.destinos} idErro={descricaoErro('destinos')} onMudar={(destinos) => mudar({ destinos })} />
            ) : (
              <>
                {f.destinos.length > 0 && (
                  <ul aria-label="Destinos escolhidos" className="mb-4 flex flex-wrap gap-2">
                    {f.destinos.map((d) => (
                      <li key={chaveDestino(d)}>
                        <ChipDestino
                          destino={destinoParaExibir(d)}
                          onRemover={() => mudar({ destinos: f.destinos.filter((x) => chaveDestino(x) !== chaveDestino(d)) })}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={() => setSeletorAberto(true)} className="botao-secundario">
                  <Icone nome="mais" tamanho={18} />
                  Adicionar destino
                </button>
              </>
            )}
            {erroDoCampo('destinos')}
          </fieldset>
        </section>
      </div>

      {seletorAberto && (
        <SeletorDestinos
          assunto="evento"
          turmas={turmas}
          jaEscolhidos={f.destinos}
          onFechar={() => setSeletorAberto(false)}
          onAdicionar={(novos) => {
            mudar({ destinos: [...f.destinos, ...novos] })
            setSeletorAberto(false)
          }}
        />
      )}
    </form>
  )
}
