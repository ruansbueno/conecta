// Foco preso numa caixa (RW-39): foco inicial no primeiro focável, Tab circula dentro, Esc fecha e,
// ao desmontar, o foco volta a quem estava com ele. Usado pelo Modal e pela gaveta de navegação.
import { useEffect, useRef, type RefObject } from 'react'

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Caixas abertas, da mais antiga à mais recente: só a de cima responde a Esc e a Tab. */
const abertos: symbol[] = []

/** `retorno`: para onde o foco volta ao fechar. Sem ele, volta a quem tinha o foco ao abrir — o que
 * falha no Safari, onde tocar num botão não o foca (aí o foco ficaria no body). */
export function useFocoPreso(caixa: RefObject<HTMLElement | null>, onFechar: () => void, retorno?: RefObject<HTMLElement | null>): void {
  // Em ref: o pai costuma passar uma função nova a cada renderização, e refazer o efeito
  // devolveria o foco à origem e o puxaria de novo para o primeiro botão.
  const fechar = useRef(onFechar)
  useEffect(() => {
    fechar.current = onFechar
  }, [onFechar])

  useEffect(() => {
    const origem = (retorno?.current ?? document.activeElement) as HTMLElement | null
    const focaveis = () => [...(caixa.current?.querySelectorAll<HTMLElement>(FOCAVEIS) ?? [])]
    ;(focaveis()[0] ?? caixa.current)?.focus()

    const eu = Symbol()
    abertos.push(eu)
    const aoTeclar = (e: KeyboardEvent) => {
      // Uma confirmação aberta sobre outra caixa: Esc fecha só ela.
      if (abertos.at(-1) !== eu) return
      if (e.key === 'Escape') {
        e.preventDefault()
        fechar.current()
        return
      }
      if (e.key !== 'Tab') return
      const lista = focaveis()
      if (lista.length === 0) return e.preventDefault()
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && document.activeElement === primeiro) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', aoTeclar)
    return () => {
      document.removeEventListener('keydown', aoTeclar)
      abertos.splice(abertos.indexOf(eu), 1)
      origem?.focus()
    }
    // A caixa é uma ref estável: o efeito roda uma vez por abertura.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
