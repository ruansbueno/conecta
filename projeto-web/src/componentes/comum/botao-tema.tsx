import { useCallback, useEffect, useSyncExternalStore } from 'react'

import {
  aplicarTema,
  CHAVE_TEMA,
  consultaDoSistema,
  EVENTO_TEMA,
  guardarEscolha,
  lerEscolha,
  temaAplicado,
  temaDoSistema,
  temaEfetivo,
} from '../../lib/tema'
import { Icone } from './icone'

// O tema mora no <html> (data-tema). Cada botão lê dele e é avisado quando muda: por outro botão
// (EVENTO_TEMA), por outra aba (storage) ou pelo sistema, enquanto não há escolha guardada.
function assinar(avisar: () => void): () => void {
  const consulta = consultaDoSistema()
  const doSistema = () => {
    if (lerEscolha() === null) aplicarTema(temaDoSistema())
  }
  const deOutraAba = (e: StorageEvent) => {
    if (e.key === CHAVE_TEMA || e.key === null) aplicarTema(temaEfetivo())
  }
  window.addEventListener(EVENTO_TEMA, avisar)
  window.addEventListener('storage', deOutraAba)
  consulta?.addEventListener?.('change', doSistema)
  return () => {
    window.removeEventListener(EVENTO_TEMA, avisar)
    window.removeEventListener('storage', deOutraAba)
    consulta?.removeEventListener?.('change', doSistema)
  }
}

export function useTema() {
  const tema = useSyncExternalStore(assinar, temaAplicado)

  // Sem o script inicial (testes, ou se ele falhar), o primeiro botão aplica o tema efetivo.
  useEffect(() => {
    if (!document.documentElement.dataset.tema) aplicarTema(temaEfetivo())
  }, [])

  const alternar = useCallback(() => {
    const novo = temaAplicado() === 'escuro' ? 'claro' : 'escuro'
    guardarEscolha(novo)
    aplicarTema(novo)
  }, [])

  return { tema, alternar }
}

/** Spec 002 (FR-001, FR-002): lua no claro, sol no escuro; o nome diz o que o toque faz. */
export function BotaoTema({ className = '' }: { className?: string }) {
  const { tema, alternar } = useTema()
  const escuro = tema === 'escuro'
  const rotulo = escuro ? 'Desativar modo noturno' : 'Ativar modo noturno'
  return (
    <button type="button" onClick={alternar} aria-label={rotulo} title={rotulo} className={`botao-icone ${className}`}>
      <Icone nome={escuro ? 'sol' : 'lua'} tamanho={18} />
    </button>
  )
}
