import { Modal } from './modal'

interface Props {
  titulo: string
  /** Obrigatória: toda ação de efeito amplo explica a consequência (RW-41). */
  consequencia: string
  acao: string
  destrutiva?: boolean
  onConfirmar: () => void
  onCancelar: () => void
}

export function Confirmacao({ titulo, consequencia, acao, destrutiva, onConfirmar, onCancelar }: Props) {
  return (
    <Modal
      papel="alertdialog"
      titulo={titulo}
      descricao={consequencia}
      onFechar={onCancelar}
      largura="max-w-md"
      rodape={
        <>
          <span className="grow" />
          <button type="button" onClick={onCancelar} className="botao-secundario">
            Cancelar
          </button>
          <button type="button" onClick={onConfirmar} className={destrutiva ? 'botao-perigo' : 'botao-primario'}>
            {acao}
          </button>
        </>
      }
    >
      {null}
    </Modal>
  )
}
