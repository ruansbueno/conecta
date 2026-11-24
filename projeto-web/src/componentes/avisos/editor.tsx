// T04/T15 (design w-04, w-15): título, conteúdo com contador, destinos, agendamento e prévia do
// cartão do aplicativo. Só apresenta: quem envia, valida e guarda o rascunho é a página.
import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router'

import type { ApiError } from '../../api/erros'
import type { DestinoEscolhido, Turma } from '../../api/schemas'
import {
  chaveDestino,
  destinoParaExibir,
  LIMITE_CONTEUDO,
  momentoDaPublicacao,
  type CampoAviso,
  type ErrosAviso,
  type FormularioAviso,
} from '../../lib/formulario-aviso'
import { ChipDestino, rotuloDestino } from '../comum/chip-destino'
import { Icone } from '../comum/icone'
import { DestinosDocente } from '../comum/destinos-docente'
import { PreviaApp } from './previa-app'
import { SeletorDestinos } from '../comum/seletor-destinos'

const ORDEM_CAMPOS: CampoAviso[] = ['titulo', 'conteudo', 'destinos', 'publicar_em']
const idCampo = (c: CampoAviso) => `aviso-${c}`

/** Leva o foco ao primeiro campo com erro (RW-39). */
export function focarPrimeiroErro(erros: ErrosAviso) {
  const campo = ORDEM_CAMPOS.find((c) => erros[c])
  if (campo) document.getElementById(idCampo(campo))?.focus()
}

/** `errors[]` de VALIDATION_ERROR por campo; erro de um destino cita o destino pelo nome. */
export function errosDaApi(erro: ApiError, destinos: DestinoEscolhido[]): ErrosAviso {
  const erros: ErrosAviso = {}
  for (const { campo, mensagem } of erro.errors) {
    const [raiz, indice] = campo.replace(/^body\./, '').split('.')
    if (raiz === 'destinos') {
      const d = destinos[Number(indice)]
      const texto = d ? `${rotuloDestino(destinoParaExibir(d))}: ${mensagem}` : mensagem
      erros.destinos = erros.destinos ? `${erros.destinos} ${texto}` : texto
    } else if (ORDEM_CAMPOS.includes(raiz as CampoAviso)) {
      erros[raiz as CampoAviso] ??= mensagem
    }
  }
  return erros
}

interface Props {
  modo: 'novo' | 'editar'
  subtitulo: string
  formulario: FormularioAviso
  onMudar: (f: FormularioAviso) => void
  erros: ErrosAviso
  /** Falha da API, acima do formulário. */
  alerta?: ReactNode
  /** Informação que não é falha (ex.: nada foi alterado). */
  informacao?: string
  turmas: Turma[]
  docente: boolean
  autor: string
  /** Falso para aviso já publicado: a data de publicação não muda mais. */
  podeAgendar: boolean
  enviando: boolean
  voltarPara: string
  onEnviar: () => void
  onDescartar: () => void
}

export function Editor(props: Props) {
  const { modo, subtitulo, formulario: f, onMudar, erros, alerta, informacao, turmas, docente, autor } = props
  const { podeAgendar, enviando, voltarPara, onEnviar, onDescartar } = props
  const [seletorAberto, setSeletorAberto] = useState(false)
  const mudar = (parcial: Partial<FormularioAviso>) => onMudar({ ...f, ...parcial })
  const tituloPagina = modo === 'novo' ? 'Novo aviso' : 'Editar aviso'
  const rotuloEnviar =
    modo === 'editar' ? 'Salvar alterações' : f.agendar ? 'Agendar publicação' : 'Publicar aviso'

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    onEnviar()
  }
  const descricaoErro = (c: CampoAviso) => (erros[c] ? `${idCampo(c)}-erro` : undefined)
  const erroDoCampo = (c: CampoAviso) =>
    erros[c] && (
      <p id={`${idCampo(c)}-erro`} className="mt-1.5 text-[12.5px] font-medium text-perigo">
        {erros[c]}
      </p>
    )

  return (
    <form onSubmit={enviar} noValidate className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start gap-4">
        <Link to={voltarPara} aria-label="Voltar" className="botao-icone mt-1">
          <Icone nome="voltar" tamanho={20} />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-bold tracking-[-0.02em] text-navy">{tituloPagina}</h1>
          <p className="mt-1 text-[13px] text-apagado">{subtitulo}</p>
        </div>
        <div className="botoes-cabecalho">
          <button type="button" onClick={onDescartar} className="botao-secundario">
            Descartar
          </button>
          <button type="submit" disabled={enviando} aria-busy={enviando} className="botao-primario">
            {rotuloEnviar}
          </button>
        </div>
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

      {/* Abaixo de 1024 px, uma coluna na ordem de leitura: campos, destinos, publicação e prévia
          (spec 003, RR-18). No desktop o grid devolve a prévia à esquerda, sob os campos. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[auto_1fr] lg:gap-y-5">
        <div className="space-y-5 lg:col-start-1 lg:row-start-1">
          <div>
            <label htmlFor={idCampo('titulo')} className="rotulo">
              Título
            </label>
            <input
              id={idCampo('titulo')}
              className="campo w-full"
              value={f.titulo}
              maxLength={150}
              aria-invalid={!!erros.titulo}
              aria-describedby={descricaoErro('titulo')}
              onChange={(e) => mudar({ titulo: e.target.value })}
            />
            {erroDoCampo('titulo')}
          </div>
          <div>
            <label htmlFor={idCampo('conteudo')} className="rotulo">
              Conteúdo
            </label>
            <textarea
              id={idCampo('conteudo')}
              className="campo min-h-[300px] w-full resize-y leading-relaxed"
              value={f.conteudo}
              maxLength={LIMITE_CONTEUDO}
              aria-invalid={!!erros.conteudo}
              aria-describedby={[descricaoErro('conteudo'), `${idCampo('conteudo')}-contador`].filter(Boolean).join(' ')}
              onChange={(e) => mudar({ conteudo: e.target.value })}
            />
            {erroDoCampo('conteudo')}
            <p id={`${idCampo('conteudo')}-contador`} className="mt-1.5 text-[12.5px] text-tenue">
              {f.conteudo.length.toLocaleString('pt-BR')} de {LIMITE_CONTEUDO.toLocaleString('pt-BR')} caracteres
            </p>
          </div>
        </div>

        <div className="space-y-5 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <section aria-labelledby="quem-recebe" className="rounded-xl border border-linha bg-branco">
            <div className="border-b border-linha-suave px-7 py-5">
              <h2 id="quem-recebe" className="text-[15px] font-semibold text-navy">
                Quem vai receber
              </h2>
              <p className="mt-1 text-[13px] leading-snug text-apagado">
                {docente
                  ? 'Como docente, você publica para as turmas em que leciona.'
                  : 'De 1 a 20 destinos. Quem for alcançado por qualquer um deles vê o aviso uma única vez.'}
              </p>
            </div>
            <fieldset
              id={idCampo('destinos')}
              tabIndex={-1}
              aria-describedby={descricaoErro('destinos')}
              className="min-w-0 px-7 py-5 outline-none"
            >
              <legend className="sr-only">Destinos</legend>
              {docente ? (
                <DestinosDocente
                  turmas={turmas}
                  escolhidos={f.destinos}
                  idErro={descricaoErro('destinos')}
                  onMudar={(destinos) => mudar({ destinos })}
                />
              ) : (
                <>
                  {f.destinos.length > 0 && (
                    <ul aria-label="Destinos escolhidos" className="mb-4 flex flex-wrap gap-2">
                      {f.destinos.map((d) => (
                        <li key={chaveDestino(d)}>
                          <ChipDestino
                            destino={destinoParaExibir(d)}
                            onRemover={() =>
                              mudar({ destinos: f.destinos.filter((x) => chaveDestino(x) !== chaveDestino(d)) })
                            }
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

          {podeAgendar && (
            <section aria-labelledby="publicacao" className="rounded-xl border border-linha bg-branco">
              <h2 id="publicacao" className="border-b border-linha-suave px-7 py-5 text-[15px] font-semibold text-navy">
                Publicação
              </h2>
              <div className="px-7 py-5">
                <div className="flex gap-2.5">
                  {([true, false] as const).map((agendar) => (
                    <button
                      key={String(agendar)}
                      type="button"
                      aria-pressed={f.agendar === agendar}
                      onClick={() => mudar({ agendar })}
                      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-[14px] font-medium ${
                        f.agendar === agendar ? 'border-azul-100 bg-azul-superficie text-azul' : 'border-linha text-apagado'
                      }`}
                    >
                      {f.agendar === agendar && <Icone nome="check" tamanho={16} />}
                      {agendar ? 'Agendar' : 'Publicar agora'}
                    </button>
                  ))}
                </div>
                {f.agendar ? (
                  <>
                    <div className="mt-4 flex gap-3">
                      <input
                        id={idCampo('publicar_em')}
                        type="date"
                        aria-label="Data da publicação"
                        className="campo flex-1"
                        value={f.data}
                        aria-invalid={!!erros.publicar_em}
                        aria-describedby={descricaoErro('publicar_em')}
                        onChange={(e) => mudar({ data: e.target.value })}
                      />
                      <input
                        type="time"
                        aria-label="Hora da publicação"
                        className="campo w-36"
                        value={f.hora}
                        aria-invalid={!!erros.publicar_em}
                        aria-describedby={descricaoErro('publicar_em')}
                        onChange={(e) => mudar({ hora: e.target.value })}
                      />
                    </div>
                    {erroDoCampo('publicar_em')}
                    <p className="mt-3 text-[12.5px] text-tenue">Até lá o aviso não aparece para ninguém no aplicativo.</p>
                  </>
                ) : (
                  <p className="mt-3 text-[12.5px] text-tenue">Imediata, assim que você publicar.</p>
                )}
              </div>
            </section>
          )}
        </div>
        <div className="lg:col-start-1 lg:row-start-2 lg:self-start">
          <PreviaApp
            autor={autor}
            titulo={f.titulo}
            conteudo={f.conteudo}
            destinos={f.destinos}
            publicarEm={momentoDaPublicacao(f)}
          />
        </div>
      </div>

      {seletorAberto && (
        <SeletorDestinos
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
