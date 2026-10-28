// T07: criar e editar turma (RW-24). Valida localmente as regras do contrato; a API confirma e
// recusa código duplicado. Em erro, o digitado fica (RW-42).
import { useId, useState, type FormEvent, type ReactNode } from 'react'

import { ApiError } from '../../api/erros'
import type { DadosTurma } from '../../api/schemas'
import {
  CAMPO_DO_CONTRATO,
  dadosDaTurma,
  formularioDaTurma,
  turmaVazia,
  validarTurma,
  type CampoTurma,
  type ErrosTurma,
} from '../../lib/formulario-turma'
import { Modal } from '../comum/modal'

const ORDEM: CampoTurma[] = ['codigo', 'nome', 'semestre', 'periodo']
const GENERICA = 'Não foi possível concluir agora. Tente de novo em instantes.'

interface Props {
  /** Turma a editar; sem ela, o formulário cria uma nova. */
  inicial?: DadosTurma
  /** Lança ApiError quando a API recusa. */
  onSalvar: (dados: DadosTurma) => Promise<void>
  onFechar: () => void
}

export function FormTurma({ inicial, onSalvar, onFechar }: Props) {
  const [f, setF] = useState(() => (inicial ? formularioDaTurma(inicial) : turmaVazia()))
  const [erros, setErros] = useState<ErrosTurma>({})
  const [alerta, setAlerta] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const id = useId()
  const idCampo = (c: CampoTurma) => `${id}-${c}`

  const focar = (e: ErrosTurma) => {
    const primeiro = ORDEM.find((c) => e[c])
    if (primeiro) document.getElementById(idCampo(primeiro))?.focus()
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const locais = validarTurma(f)
    setErros(locais)
    setAlerta(undefined)
    if (Object.keys(locais).length > 0) return focar(locais)
    setEnviando(true)
    try {
      await onSalvar(dadosDaTurma(f))
    } catch (erro) {
      const apiErro = erro instanceof ApiError ? erro : null
      if (apiErro?.code === 'CODIGO_TURMA_DUPLICADO') {
        const marcados = { codigo: apiErro.mensagem }
        setErros(marcados)
        focar(marcados)
      } else if (apiErro?.efeito === 'marcaCampos') {
        const marcados: ErrosTurma = {}
        for (const { campo, mensagem } of apiErro.errors) {
          const c = CAMPO_DO_CONTRATO[campo.replace(/^body\./, '')]
          if (c) marcados[c] ??= mensagem
        }
        setErros(marcados)
        if (Object.keys(marcados).length > 0) focar(marcados)
        else setAlerta(apiErro.mensagem)
      } else {
        setAlerta(apiErro?.mensagem ?? GENERICA)
      }
    } finally {
      setEnviando(false)
    }
  }

  const campo = (c: CampoTurma, rotulo: string, entrada: (props: Record<string, unknown>) => ReactNode) => (
    <div>
      <label htmlFor={idCampo(c)} className="rotulo">
        {rotulo}
      </label>
      {entrada({
        id: idCampo(c),
        'aria-invalid': !!erros[c],
        'aria-describedby': erros[c] ? `${idCampo(c)}-erro` : undefined,
      })}
      {erros[c] && (
        <p id={`${idCampo(c)}-erro`} className="mt-1.5 text-[12.5px] font-medium text-perigo">
          {erros[c]}
        </p>
      )}
    </div>
  )

  return (
    <Modal
      titulo={inicial ? 'Editar turma' : 'Nova turma'}
      descricao="Código único, semestre do curso de 1 a 12 e período letivo no formato AAAA/N."
      onFechar={onFechar}
      largura="max-w-lg"
      rodape={
        <>
          <span className="grow" />
          <button type="button" onClick={onFechar} className="botao-secundario">
            Cancelar
          </button>
          <button type="submit" form={id} disabled={enviando} aria-busy={enviando} className="botao-primario">
            {inicial ? 'Salvar alterações' : 'Criar turma'}
          </button>
        </>
      }
    >
      <form id={id} onSubmit={enviar} noValidate className="space-y-4 px-6 py-5">
        {alerta && (
          <p role="alert" className="rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
            {alerta}
          </p>
        )}
        {campo('codigo', 'Código', (p) => (
          <input {...p} className="campo w-full" maxLength={40} value={f.codigo} onChange={(e) => setF({ ...f, codigo: e.target.value })} />
        ))}
        {campo('nome', 'Nome', (p) => (
          <input {...p} className="campo w-full" maxLength={120} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
        ))}
        <div className="grid grid-cols-2 gap-4">
          {campo('semestre', 'Semestre do curso', (p) => (
            <select {...p} className="campo w-full" value={f.semestre} onChange={(e) => setF({ ...f, semestre: e.target.value })}>
              <option value="">Escolha</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={String(i + 1)}>
                  {i + 1}º
                </option>
              ))}
            </select>
          ))}
          {campo('periodo', 'Período letivo', (p) => (
            <input
              {...p}
              className="campo w-full"
              placeholder="2026/2"
              maxLength={6}
              value={f.periodo}
              onChange={(e) => setF({ ...f, periodo: e.target.value })}
            />
          ))}
        </div>
        <label className="flex items-start gap-3 rounded-xl border border-linha px-4 py-3">
          <input
            type="checkbox"
            className="mt-0.5 size-[18px] accent-azul"
            checked={f.inscricoesAbertas}
            onChange={(e) => setF({ ...f, inscricoesAbertas: e.target.checked })}
          />
          <span>
            <span className="block text-[14px] font-semibold text-navy">Inscrições abertas</span>
            <span className="block text-[12.5px] text-apagado">Alunos veem a turma no aplicativo e podem pedir inscrição.</span>
          </span>
        </label>
      </form>
    </Modal>
  )
}
