// T07 (design w-07): turmas com semestre, período, totais e os selos de inscrições e situação.
import { Link } from 'react-router'

import type { Turma } from '../../api/schemas'
import { Icone } from '../comum/icone'
import { Tabela, type Coluna } from '../comum/tabela'

export function SeloInscricoes({ abertas }: { abertas: boolean }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
        abertas ? 'bg-sucesso-fundo text-sucesso' : 'bg-linha-suave text-apagado'
      }`}
    >
      {abertas ? 'Abertas' : 'Fechadas'}
    </span>
  )
}

export function SeloTurma({ ativa }: { ativa: boolean }) {
  return (
    <span
      className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold ${
        ativa ? 'bg-azul-superficie text-azul' : 'bg-linha-suave text-apagado'
      }`}
    >
      {ativa ? 'Ativa' : 'Inativa'}
    </span>
  )
}

interface Props {
  legenda: string
  turmas: Turma[]
  /** Sem esta função (docente), a tabela é só de leitura. */
  onEditar?: (turma: Turma) => void
}

export function TabelaTurmas({ legenda, turmas, onEditar }: Props) {
  const colunas: Coluna<Turma>[] = [
    { chave: 'codigo', titulo: 'Código', celula: (t) => <span className="font-semibold whitespace-nowrap text-navy">{t.codigo}</span> },
    { chave: 'nome', titulo: 'Turma', celula: (t) => t.nome },
    { chave: 'semestre', titulo: 'Semestre', celula: (t) => `${t.semestreCurso}º` },
    { chave: 'periodo', titulo: 'Período', celula: (t) => t.periodoLetivo },
    { chave: 'alunos', titulo: 'Alunos', celula: (t) => t.totalAlunos.toLocaleString('pt-BR') },
    { chave: 'docentes', titulo: 'Docentes', celula: (t) => t.totalDocentes.toLocaleString('pt-BR') },
    { chave: 'inscricoes', titulo: 'Inscrições', celula: (t) => <SeloInscricoes abertas={t.inscricoesAbertas} /> },
    { chave: 'situacao', titulo: 'Situação', celula: (t) => <SeloTurma ativa={t.ativa} /> },
    {
      chave: 'acoes',
      titulo: 'Ações',
      celula: (t) => (
        <div className="flex items-center gap-1">
          {onEditar && (
            <button type="button" aria-label={`Editar ${t.codigo}`} title="Editar turma" onClick={() => onEditar(t)} className="botao-icone">
              <Icone nome="lapis" tamanho={17} />
            </button>
          )}
          <Link to={`/turmas/${t.id}`} aria-label={`Vínculos de ${t.codigo}`} title="Vínculos e detalhes" className="botao-icone">
            <Icone nome="usuarios" tamanho={17} />
          </Link>
        </div>
      ),
    },
  ]
  return <Tabela legenda={legenda} colunas={colunas} linhas={turmas} chave={(t) => t.id} />
}
