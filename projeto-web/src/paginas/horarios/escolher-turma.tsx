// T13 (plan-f2 D-F2-3): o item "Horários" abre aqui. Lista as turmas ativas e oferece primeiro a
// última grade aberta neste navegador.
import { Link } from 'react-router'

import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EstadoVazio } from '../../componentes/comum/estado-vazio'
import { Icone } from '../../componentes/comum/icone'
import { ultimaTurmaDosHorarios } from '../../lib/rascunho'
import { useTurmasDestino } from '../avisos/comum'

const grade = (id: string) => `/turmas/${id}/horarios`

export default function EscolherTurmaHorarios() {
  const { carga, recarregar } = useTurmasDestino()

  if (carga.estado === 'carregando') return <Esqueleto rotulo="Carregando as turmas" />
  if (carga.estado === 'erro') return <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
  const turmas = carga.dados
  const ultimaId = ultimaTurmaDosHorarios()
  const ultima = turmas.find((t) => t.id === ultimaId)

  return (
    <div className="mx-auto max-w-[1180px]">
      <h1 className="text-[28px] font-bold tracking-[-0.025em] text-navy">Horários</h1>
      <p className="mt-1.5 text-[14px] text-apagado">Escolha a turma para ver e ajustar a grade semanal.</p>

      {ultima && (
        <Link
          to={grade(ultima.id)}
          className="mt-6 flex items-center justify-between gap-4 rounded-xl border border-azul-100 bg-azul-superficie px-6 py-4 text-navy hover:border-azul"
        >
          <span>
            <span className="block text-[12.5px] font-medium text-apagado">Última grade aberta</span>
            <span className="block text-[15px] font-semibold">
              Continuar em {ultima.codigo} — {ultima.nome}
            </span>
          </span>
          <Icone nome="seta" tamanho={18} />
        </Link>
      )}

      <div className="mt-6 rounded-xl border border-linha bg-branco">
        {turmas.length === 0 ? (
          <EstadoVazio titulo="Nenhuma turma ativa" texto="A grade é montada por turma. Crie ou reative uma turma em Turmas." icone="turmas" />
        ) : (
          <ul aria-label="Turmas ativas" className="divide-y divide-linha-suave">
            {turmas.map((t) => (
              <li key={t.id}>
                <Link to={grade(t.id)} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-fundo">
                  <span>
                    <span className="block text-[14px] font-semibold text-navy">
                      {t.codigo} — {t.nome}
                    </span>
                    <span className="block text-[12.5px] text-apagado">
                      {t.semestreCurso}º semestre · {t.periodoLetivo}
                    </span>
                  </span>
                  <Icone nome="seta" tamanho={17} className="text-tenue" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
