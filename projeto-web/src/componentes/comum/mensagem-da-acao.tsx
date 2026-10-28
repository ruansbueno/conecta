// Resultado de uma ação na página ("Aviso arquivado.", ou a falha). Ao aparecer, recebe o foco: o
// leitor de tela anuncia o texto, e o foco não cai no corpo da página quando o botão da ação some
// (a linha arquivada sai da lista, o botão de decidir vira o selo da decisão) — RW-39.
import { useEffect, useRef } from 'react'

export interface MensagemDaAcaoProps {
  mensagem?: { texto: string; erro: boolean }
}

export function MensagemDaAcao({ mensagem }: MensagemDaAcaoProps) {
  const elemento = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (mensagem) elemento.current?.focus()
  }, [mensagem])
  if (!mensagem) return null
  return (
    <p
      ref={elemento}
      tabIndex={-1}
      role={mensagem.erro ? 'alert' : 'status'}
      className={`mt-5 rounded-xl border px-4 py-3 text-[13.5px] outline-none ${
        mensagem.erro ? 'border-perigo-borda bg-perigo-fundo text-perigo' : 'border-linha bg-sucesso-fundo text-sucesso'
      }`}
    >
      {mensagem.texto}
    </p>
  )
}
