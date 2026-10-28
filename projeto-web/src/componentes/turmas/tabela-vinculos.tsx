// T08 (design w-08): quem está na turma, com papel, origem e data do vínculo (RW-26).
import type { Vinculo } from '../../api/schemas'
import { Avatar } from '../comum/avatar'
import { Tabela, type Coluna } from '../comum/tabela'

const ORIGEM: Record<string, string> = {
  solicitacao: 'Solicitação aprovada',
  gestao: 'Vínculo pela gestão',
  seed: 'Carga inicial',
}

const data = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function SeloPapel({ papel }: { papel: string }) {
  const docente = papel === 'docente'
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
        docente ? 'bg-alerta-fundo text-alerta' : 'bg-azul-superficie text-azul'
      }`}
    >
      {docente ? 'Docente' : papel === 'aluno' ? 'Aluno' : papel}
    </span>
  )
}

interface Props {
  vinculos: Vinculo[]
  /** Sem esta função (docente), a tabela é só de leitura. */
  onRemover?: (vinculo: Vinculo) => void
}

export function TabelaVinculos({ vinculos, onRemover }: Props) {
  const colunas: Coluna<Vinculo>[] = [
    {
      chave: 'pessoa',
      titulo: 'Pessoa',
      celula: (v) => (
        <div className="flex items-center gap-3">
          <Avatar nome={v.usuario.nome} />
          <div>
            <p className="font-semibold text-navy">{v.usuario.nome}</p>
            <p className="text-[12.5px] text-tenue">{v.usuario.username}</p>
          </div>
        </div>
      ),
    },
    { chave: 'papel', titulo: 'Papel', celula: (v) => <SeloPapel papel={v.papel} /> },
    { chave: 'origem', titulo: 'Origem', celula: (v) => ORIGEM[v.origem] ?? v.origem },
    { chave: 'desde', titulo: 'Vinculado desde', celula: (v) => data.format(v.criadoEm) },
    ...(onRemover
      ? [
          {
            chave: 'acoes',
            titulo: 'Ações',
            celula: (v: Vinculo) => (
              <button
                type="button"
                aria-label={`Remover vínculo de ${v.usuario.nome}`}
                onClick={() => onRemover(v)}
                className="text-[13.5px] font-semibold whitespace-nowrap text-perigo hover:underline"
              >
                Remover vínculo
              </button>
            ),
          },
        ]
      : []),
  ]
  return <Tabela legenda="Vínculos da turma" colunas={colunas} linhas={vinculos} chave={(v) => v.usuario.id} />
}
