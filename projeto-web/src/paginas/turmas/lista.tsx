// T07 (design w-07): turmas por situação, com busca, semestre e período na URL (RW-23). Criar e
// editar ficam com administração e coordenação; o docente vê as suas, só para leitura.
import { useState } from 'react'

import { criarTurma, editarTurma, listarTurmas } from '../../api/recursos/turmas'
import type { DadosTurma, Turma } from '../../api/schemas'
import { Abas, idDaAba, idDoPainel } from '../../componentes/comum/abas'
import { Busca } from '../../componentes/comum/busca'
import { Esqueleto } from '../../componentes/comum/esqueleto'
import { EstadoErro } from '../../componentes/comum/estado-erro'
import { EstadoVazio } from '../../componentes/comum/estado-vazio'
import { Icone } from '../../componentes/comum/icone'
import { Paginacao } from '../../componentes/comum/paginacao'
import { FormTurma } from '../../componentes/turmas/form-turma'
import { TabelaTurmas } from '../../componentes/turmas/tabela-turmas'
import { useSessao } from '../../sessao/contexto'
import { useMensagemTrazida } from '../comum'
import { paginaDaUrl, useCargaPaginada, useFiltrosNaUrl, useMensagemDaLista, useTextoNaUrl } from '../lista-na-url'

type Situacao = 'ativas' | 'inativas' | 'todas'
const SITUACOES: { id: Situacao; rotulo: string }[] = [
  { id: 'ativas', rotulo: 'Ativas' },
  { id: 'inativas', rotulo: 'Inativas' },
  { id: 'todas', rotulo: 'Todas' },
]
const ATIVA: Record<Situacao, boolean | undefined> = { ativas: true, inativas: false, todas: undefined }
const VAZIO: Record<Situacao, string> = { ativas: 'Nenhuma turma ativa', inativas: 'Nenhuma turma inativa', todas: 'Nenhuma turma' }
const POR_PAGINA = 20
const LIMITE_BUSCA = 100
const ID_ABAS = 'turmas-situacao'
const PERIODO = /^\d{4}\/[12]$/
const periodoCompleto = (v: string) => PERIODO.test(v)

/** O que mudou entre a turma e o formulário: o PATCH leva só isso. */
function diferencas(t: Turma, d: DadosTurma): Partial<DadosTurma> {
  const mudou: Partial<DadosTurma> = {}
  for (const campo of ['codigo', 'nome', 'semestreCurso', 'periodoLetivo', 'inscricoesAbertas'] as const) {
    if (d[campo] !== t[campo]) Object.assign(mudou, { [campo]: d[campo] })
  }
  return mudou
}

export default function ListaTurmas() {
  const { usuario } = useSessao()
  const gestao = usuario?.perfil === 'administrador' || usuario?.perfil === 'coordenacao'
  const { params, filtrar } = useFiltrosNaUrl()
  const trazida = useMensagemTrazida()

  const pedida = params.get('situacao') as Situacao | null
  const situacao: Situacao = SITUACOES.some((s) => s.id === pedida) ? pedida! : 'ativas'
  const q = (params.get('q') ?? '').slice(0, LIMITE_BUSCA)
  const semestreUrl = Number(params.get('semestre'))
  const semestre = Number.isInteger(semestreUrl) && semestreUrl >= 1 && semestreUrl <= 12 ? semestreUrl : undefined
  const periodo = periodoCompleto(params.get('periodo') ?? '') ? params.get('periodo')! : ''
  const offset = (paginaDaUrl(params.get('pagina')) - 1) * POR_PAGINA

  const [termo, setTermo] = useTextoNaUrl('q', q, filtrar)
  const [periodoDigitado, setPeriodoDigitado] = useTextoNaUrl('periodo', periodo, filtrar, periodoCompleto)
  const { carga, recarregar } = useCargaPaginada(
    JSON.stringify([situacao, q, semestre, periodo]),
    () =>
      listarTurmas({
        ativa: ATIVA[situacao],
        q: q || undefined,
        semestre_curso: semestre,
        periodo_letivo: periodo || undefined,
        limit: POR_PAGINA,
        offset,
      }),
    { offset, porPagina: POR_PAGINA, filtrar },
  )
  const [mensagem, setMensagem] = useMensagemDaLista(trazida ? { texto: trazida, erro: false } : undefined)
  // `undefined`: fechado; `null`: nova turma; turma: edição.
  const [formulario, setFormulario] = useState<Turma | null | undefined>(undefined)

  async function salvar(dados: DadosTurma) {
    if (formulario) {
      const mudou = diferencas(formulario, dados)
      if (Object.keys(mudou).length > 0) await editarTurma(formulario.id, mudou)
      setMensagem({ texto: `Turma ${dados.codigo} atualizada.`, erro: false })
    } else {
      await criarTurma(dados)
      setMensagem({ texto: `Turma ${dados.codigo} criada.`, erro: false })
    }
    setFormulario(undefined)
    recarregar()
  }

  const comFiltro = Boolean(q || semestre || periodo)
  const rotuloAba = SITUACOES.find((s) => s.id === situacao)!.rotulo

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.025em] text-navy">{gestao ? 'Turmas' : 'Minhas turmas'}</h1>
          <p className="mt-1.5 text-[14px] text-apagado">
            {gestao
              ? 'Turmas acadêmicas do curso. Desativar uma turma preserva os vínculos, mas interrompe a entrega dos avisos dela.'
              : 'As turmas em que você leciona.'}
          </p>
        </div>
        {gestao && (
          <button type="button" onClick={() => setFormulario(null)} className="botao-primario">
            <Icone nome="mais" tamanho={18} />
            Nova turma
          </button>
        )}
      </header>

      {mensagem && (
        <p role="status" className="mt-5 rounded-xl border border-linha bg-sucesso-fundo px-4 py-3 text-[13.5px] text-sucesso">
          {mensagem.texto}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <Abas
          rotulo="Situação das turmas"
          idBase={ID_ABAS}
          abas={SITUACOES}
          atual={situacao}
          onMudar={(s) => filtrar({ situacao: s === 'ativas' ? '' : s })}
        />
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-[280px]">
            <Busca rotulo="Buscar turma pelo código ou nome" dica="Buscar turma" valor={termo} onMudar={setTermo} maxLength={LIMITE_BUSCA} />
          </div>
          <label className="flex items-center gap-2 text-[13px] text-apagado">
            <span>Semestre</span>
            <select
              aria-label="Semestre"
              className="campo h-11 py-0"
              value={semestre ? String(semestre) : ''}
              onChange={(e) => filtrar({ semestre: e.target.value })}
            >
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1}º
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[13px] text-apagado">
            <span>Período</span>
            <input
              aria-label="Período letivo"
              className="campo h-11 w-28"
              placeholder="AAAA/N"
              maxLength={6}
              value={periodoDigitado}
              onChange={(e) => setPeriodoDigitado(e.target.value)}
            />
          </label>
        </div>
      </div>

      <div
        id={idDoPainel(ID_ABAS)}
        role="tabpanel"
        aria-labelledby={idDaAba(ID_ABAS, situacao)}
        className="mt-5 rounded-xl border border-linha bg-branco"
      >
        {carga.estado === 'carregando' ? (
          <Esqueleto rotulo="Carregando as turmas" />
        ) : carga.estado === 'erro' ? (
          <>
            <EstadoErro mensagem={carga.mensagem} onRepetir={recarregar} />
            {comFiltro && (
              <div className="-mt-10 pb-12 text-center">
                <button type="button" onClick={() => filtrar({ q: '', semestre: '', periodo: '' })} className="botao-secundario">
                  Limpar filtros
                </button>
              </div>
            )}
          </>
        ) : carga.dados.items.length === 0 ? (
          <EstadoVazio
            titulo={comFiltro ? 'Nenhuma turma encontrada' : VAZIO[situacao]}
            texto={comFiltro ? 'Ajuste a busca ou os filtros.' : gestao ? 'Crie uma turma para começar.' : 'Você não leciona em nenhuma turma nesta situação.'}
          />
        ) : (
          <>
            <div className="overflow-x-auto px-3 pt-4">
              <TabelaTurmas
                legenda={`Turmas — ${rotuloAba}`}
                turmas={carga.dados.items}
                onEditar={gestao ? (t) => setFormulario(t) : undefined}
              />
            </div>
            <div className="flex items-center justify-between border-t border-linha-suave px-6 py-4">
              <p className="text-[13px] text-apagado">
                Mostrando {carga.dados.items.length} de {carga.dados.total} turmas
              </p>
              <Paginacao
                total={carga.dados.total}
                limit={POR_PAGINA}
                offset={offset}
                onMudar={(o) => filtrar({ pagina: o === 0 ? '' : String(o / POR_PAGINA + 1) })}
              />
            </div>
          </>
        )}
      </div>

      {formulario !== undefined && (
        <FormTurma inicial={formulario ?? undefined} onSalvar={salvar} onFechar={() => setFormulario(undefined)} />
      )}
    </div>
  )
}
