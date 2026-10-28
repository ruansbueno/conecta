// T05 (design w-05): turmas, semestres e grupos em abas, com busca e seleção múltipla; respeita o
// limite de 20 destinos do aviso (RW-16).
import { useId, useMemo, useState } from 'react'

import type { DestinoEscolhido, Turma } from '../../api/schemas'
import { chaveDestino, LIMITE_DESTINOS } from '../../lib/formulario-aviso'
import { quantidade } from '../../lib/texto'
import { Abas, idDaAba, idDoPainel } from '../comum/abas'
import { Busca } from '../comum/busca'
import { Modal } from '../comum/modal'

const ABAS = ['turmas', 'semestres', 'grupos'] as const
type Aba = (typeof ABAS)[number]
const ROTULO_ABA: Record<Aba, string> = { turmas: 'Turmas', semestres: 'Semestres', grupos: 'Grupos' }

const GRUPOS: { destino: DestinoEscolhido; rotulo: string; descricao: string }[] = [
  { destino: { tipo: 'todos' }, rotulo: 'Todos os usuários', descricao: 'Alunos, docentes, coordenação e administração' },
  { destino: { tipo: 'docentes' }, rotulo: 'Docentes', descricao: 'Todas as pessoas com perfil docente' },
]

interface Props {
  turmas: Turma[]
  jaEscolhidos: DestinoEscolhido[]
  onAdicionar: (novos: DestinoEscolhido[]) => void
  onFechar: () => void
}

export function SeletorDestinos({ turmas, jaEscolhidos, onAdicionar, onFechar }: Props) {
  const [aba, setAba] = useState<Aba>('turmas')
  const [busca, setBusca] = useState('')
  const [marcados, setMarcados] = useState<DestinoEscolhido[]>([])
  const idPainel = useId()


  const jaNoAviso = useMemo(() => new Set(jaEscolhidos.map(chaveDestino)), [jaEscolhidos])
  const marcadosChaves = new Set(marcados.map(chaveDestino))
  const total = jaEscolhidos.length + marcados.length
  const passou = total > LIMITE_DESTINOS

  const alternar = (d: DestinoEscolhido) =>
    setMarcados((atual) =>
      marcadosChaves.has(chaveDestino(d)) ? atual.filter((m) => chaveDestino(m) !== chaveDestino(d)) : [...atual, d],
    )

  const termo = busca.trim().toLowerCase()
  const turmasVisiveis = termo
    ? turmas.filter((t) => `${t.codigo} ${t.nome}`.toLowerCase().includes(termo))
    : turmas

  const opcao = (d: DestinoEscolhido, rotulo: string, descricao: string) => {
    const chave = chaveDestino(d)
    const noAviso = jaNoAviso.has(chave)
    // O nome acessível é só o rótulo; a descrição vai à parte (leitores de tela e testes por nome).
    const id = `${idPainel}-${chave}`
    return (
      <li key={chave} className="border-b border-linha-suave last:border-b-0">
        <label className={`flex items-center gap-3.5 px-6 py-3 ${noAviso ? 'opacity-60' : 'cursor-pointer hover:bg-fundo'}`}>
          <input
            type="checkbox"
            className="size-[18px] accent-azul"
            aria-labelledby={`${id}-r`}
            aria-describedby={`${id}-d`}
            checked={noAviso || marcadosChaves.has(chave)}
            disabled={noAviso}
            onChange={() => alternar(d)}
          />
          <span>
            <span id={`${id}-r`} className="block text-[14px] font-semibold text-navy">
              {rotulo}
            </span>
            <span id={`${id}-d`} className="block text-[12.5px] text-apagado">
              {noAviso ? 'Já está no aviso' : descricao}
            </span>
          </span>
        </label>
      </li>
    )
  }

  const quantos = marcados.length
  return (
    <Modal
      titulo="Adicionar destino"
      descricao={`Escolha grupos inteiros ou turmas específicas. Você pode combinar quantos quiser, até ${LIMITE_DESTINOS}.`}
      onFechar={onFechar}
      largura="max-w-[620px]"
      rodape={
        <>
          <p className={`text-[13px] ${passou ? 'font-semibold text-perigo' : 'text-apagado'}`} aria-live="polite">
            {passou
              ? `Um aviso pode ter até ${LIMITE_DESTINOS} destinos: desmarque ${total - LIMITE_DESTINOS}.`
              : `${quantos} selecionado${quantos === 1 ? '' : 's'} · ${total} destino${total === 1 ? '' : 's'} no aviso`}
          </p>
          <span className="grow" />
          <button type="button" onClick={onFechar} className="botao-secundario">
            Cancelar
          </button>
          <button
            type="button"
            disabled={quantos === 0 || passou}
            onClick={() => onAdicionar(marcados)}
            className="botao-primario"
          >
            {`Adicionar ${quantos} destino${quantos === 1 ? '' : 's'}`}
          </button>
        </>
      }
    >
      <Abas
        rotulo="Tipo de destino"
        idBase={idPainel}
        abas={ABAS.map((a) => ({ id: a, rotulo: ROTULO_ABA[a] }))}
        atual={aba}
        onMudar={setAba}
        classe="flex gap-[22px] border-b border-linha px-6 pt-1"
        classeAba="pt-3 pb-[11px] text-[13.5px]"
      />
      <div id={idDoPainel(idPainel)} role="tabpanel" aria-labelledby={idDaAba(idPainel, aba)} className="min-h-[320px]">
        {aba === 'turmas' && (
          <>
            <div className="px-6 pt-4 pb-2">
              <Busca rotulo="Buscar turma pelo código ou nome" valor={busca} onMudar={setBusca} />
            </div>
            {turmasVisiveis.length === 0 ? (
              <p className="px-6 py-8 text-center text-[13px] text-apagado">Nenhuma turma ativa encontrada.</p>
            ) : (
              <ul>
                {turmasVisiveis.map((t) =>
                  opcao(
                    { tipo: 'turma', turmaId: t.id, turmaNome: t.nome },
                    `${t.codigo} — ${t.nome}`,
                    `${t.semestreCurso}º semestre · ${quantidade(t.totalAlunos, 'aluno')} · ${quantidade(t.totalDocentes, 'docente')}`,
                  ),
                )}
              </ul>
            )}
          </>
        )}
        {aba === 'semestres' && (
          <ul>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) =>
              opcao({ tipo: 'semestre', semestre: n }, `${n}º semestre`, 'Quem tem vínculo em turma ativa deste semestre'),
            )}
          </ul>
        )}
        {aba === 'grupos' && <ul>{GRUPOS.map((g) => opcao(g.destino, g.rotulo, g.descricao))}</ul>}
      </div>
    </Modal>
  )
}
