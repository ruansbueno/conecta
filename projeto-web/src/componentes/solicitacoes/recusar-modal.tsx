// T09: recusar com motivo opcional de até 300 caracteres (RW-29), que o aluno vê no aplicativo.
import { useId, useState } from 'react'

import { Modal } from '../comum/modal'

export const LIMITE_MOTIVO = 300

interface Props {
  aluno: string
  turma: string
  /** O modal fica aberto durante o envio; em falha, mostra o erro e mantém o motivo (RW-42). */
  enviando: boolean
  erro?: string
  onRecusar: (motivo: string) => void
  onFechar: () => void
}

export function RecusarModal({ aluno, turma, enviando, erro, onRecusar, onFechar }: Props) {
  const [motivo, setMotivo] = useState('')
  const id = useId()
  return (
    <Modal
      titulo={`Recusar a solicitação de ${aluno}?`}
      descricao={`${aluno} não entra em ${turma} e vê o motivo no aplicativo, se você escrever um.`}
      onFechar={onFechar}
      largura="max-w-lg"
      rodape={
        <>
          <span className="grow" />
          <button type="button" onClick={onFechar} className="botao-secundario">
            Cancelar
          </button>
          <button type="button" disabled={enviando} aria-busy={enviando} onClick={() => onRecusar(motivo)} className="botao-perigo">
            Recusar solicitação
          </button>
        </>
      }
    >
      <div className="px-6 py-5">
        {erro && (
          <p role="alert" className="mb-4 rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
            {erro}
          </p>
        )}
        <label htmlFor={id} className="rotulo">
          Motivo (opcional)
        </label>
        <textarea
          id={id}
          className="campo min-h-[110px] w-full resize-y"
          maxLength={LIMITE_MOTIVO}
          value={motivo}
          aria-describedby={`${id}-contador`}
          onChange={(e) => setMotivo(e.target.value)}
        />
        <p id={`${id}-contador`} className="mt-1.5 text-[12.5px] text-tenue">
          {motivo.length} de {LIMITE_MOTIVO}
        </p>
      </div>
    </Modal>
  )
}
