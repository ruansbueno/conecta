// T13 (plan-f2 D-F2-9): criar, editar e remover uma aula. A modal guarda o que foi digitado; quem
// valida e envia é a página, que devolve os erros por campo, o alerta (falha) e a informação.
import { useEffect, useState, type FormEvent } from 'react'

import { NOME_DIA, type CampoAula, type ErrosAula, type FormularioAula } from '../../lib/grade'
import { Modal } from '../comum/modal'

export interface DocenteOpcao {
  id: string
  nome: string
}

interface Props {
  modo: 'nova' | 'editar'
  inicial: FormularioAula
  docentes: DocenteOpcao[]
  /** Docente atual da aula, se não estiver mais entre os de perfil docente. */
  docenteAtual?: DocenteOpcao | null
  docentesIndisponiveis?: boolean
  erros: ErrosAula
  alerta?: string
  informacao?: string
  enviando: boolean
  onEnviar: (f: FormularioAula) => void
  onRemover?: () => void
  onFechar: () => void
}

const ORDEM: CampoAula[] = ['diaSemana', 'inicio', 'fim', 'disciplina', 'local', 'docenteId']
const id = (c: CampoAula) => `aula-${c}`

export function ModalAula(props: Props) {
  const { modo, inicial, docentes, docenteAtual, docentesIndisponiveis, erros, alerta, informacao, enviando } = props
  const { onEnviar, onRemover, onFechar } = props
  const [f, setF] = useState(inicial)
  const mudar = (parcial: Partial<FormularioAula>) => setF((atual) => ({ ...atual, ...parcial }))

  // Cada novo conjunto de erros leva o foco ao primeiro campo marcado (RW-39).
  useEffect(() => {
    const campo = ORDEM.find((c) => erros[c])
    if (campo) document.getElementById(id(campo))?.focus()
  }, [erros])

  const opcoes =
    docenteAtual && !docentes.some((d) => d.id === docenteAtual.id) ? [...docentes, docenteAtual] : docentes
  // Docente que saiu da lista (perdeu o perfil, recarregada depois de um 409): o que se vê
  // ("Sem docente") é o que vai, para não reenviar o mesmo id recusado.
  const docenteId = opcoes.some((d) => d.id === f.docenteId) ? f.docenteId : ''

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    if (!enviando) onEnviar({ ...f, docenteId })
  }
  const atributos = (c: CampoAula) => ({
    id: id(c),
    'aria-invalid': !!erros[c],
    'aria-describedby': erros[c] ? `${id(c)}-erro` : undefined,
  })
  const erro = (c: CampoAula) =>
    erros[c] && (
      <p id={`${id(c)}-erro`} className="mt-1.5 text-[12.5px] font-medium text-perigo">
        {erros[c]}
      </p>
    )
  const rotulo = (c: CampoAula, texto: string) => (
    <label htmlFor={id(c)} className="rotulo">
      {texto}
    </label>
  )

  return (
    <Modal
      titulo={modo === 'nova' ? 'Nova aula' : 'Editar aula'}
      onFechar={onFechar}
      rodape={
        <>
          {onRemover && (
            <button
              type="button"
              onClick={() => !enviando && onRemover()}
              aria-disabled={enviando}
              className="botao-perigo aria-disabled:opacity-60"
            >
              Remover aula
            </button>
          )}
          <span className="grow" />
          <button type="button" onClick={onFechar} className="botao-secundario">
            Cancelar
          </button>
          {/* aria-disabled, não disabled: o foco que volta da confirmação não cai num botão desabilitado. */}
          <button
            type="submit"
            form="form-aula"
            aria-disabled={enviando}
            aria-busy={enviando}
            className="botao-primario aria-disabled:opacity-60"
          >
            Salvar aula
          </button>
        </>
      }
    >
      <form id="form-aula" onSubmit={enviar} noValidate className="space-y-4 px-6 py-5">
        {alerta && (
          <p role="alert" className="rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
            {alerta}
          </p>
        )}
        {informacao && (
          <p role="status" className="rounded-xl border border-linha bg-azul-superficie px-4 py-3 text-[13.5px] text-navy">
            {informacao}
          </p>
        )}
        {/* No celular, Dia na linha de cima e Início e Fim lado a lado, para os horários caberem. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            {rotulo('diaSemana', 'Dia')}
            <select {...atributos('diaSemana')} className="campo" value={f.diaSemana} onChange={(e) => mudar({ diaSemana: e.target.value })}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <option key={d} value={d}>
                  {NOME_DIA[d]}
                </option>
              ))}
            </select>
            {erro('diaSemana')}
          </div>
          <div>
            {rotulo('inicio', 'Início')}
            <input type="time" {...atributos('inicio')} className="campo" value={f.inicio} onChange={(e) => mudar({ inicio: e.target.value })} />
            {erro('inicio')}
          </div>
          <div>
            {rotulo('fim', 'Fim')}
            <input type="time" {...atributos('fim')} className="campo" value={f.fim} onChange={(e) => mudar({ fim: e.target.value })} />
            {erro('fim')}
          </div>
        </div>
        <div>
          {rotulo('disciplina', 'Disciplina')}
          <input {...atributos('disciplina')} className="campo" maxLength={120} value={f.disciplina} onChange={(e) => mudar({ disciplina: e.target.value })} />
          {erro('disciplina')}
        </div>
        <div>
          {rotulo('local', 'Local (opcional)')}
          <input {...atributos('local')} className="campo" maxLength={80} value={f.local} onChange={(e) => mudar({ local: e.target.value })} />
          {erro('local')}
        </div>
        <div>
          {rotulo('docenteId', 'Docente')}
          <select {...atributos('docenteId')} className="campo" value={docenteId} onChange={(e) => mudar({ docenteId: e.target.value })}>
            <option value="">Sem docente</option>
            {opcoes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
          {erro('docenteId')}
          {docentesIndisponiveis && (
            <p className="mt-1.5 text-[12.5px] text-apagado">Não foi possível carregar os docentes. Feche e abra de novo para tentar.</p>
          )}
        </div>
      </form>
    </Modal>
  )
}
