// T08: vincular docente ou aluno à turma, buscando a pessoa pelo nome ou usuário (RW-26). Quem já
// está na turma aparece indisponível; a API confere o papel contra o perfil (PERFIL_INCOMPATIVEL).
import { useEffect, useId, useState } from 'react'

import { ApiError } from '../../api/erros'
import { Busca } from '../comum/busca'
import { Modal } from '../comum/modal'

export interface PessoaEncontrada {
  id: string
  nome: string
  username: string
}

const MINIMO = 2
const ESPERA_MS = 300
const GENERICA = 'Não foi possível concluir agora. Tente de novo em instantes.'

interface Props {
  papel: 'docente' | 'aluno'
  jaVinculados: Set<string>
  /** Busca no servidor pessoas ativas com o perfil do papel. */
  buscar: (termo: string) => Promise<PessoaEncontrada[]>
  /** Lança ApiError quando a API recusa. */
  onVincular: (pessoa: PessoaEncontrada) => Promise<void>
  onFechar: () => void
}

type Resultado = { estado: 'parado' } | { estado: 'buscando' } | { estado: 'pronto'; pessoas: PessoaEncontrada[] } | { estado: 'erro'; mensagem: string }

export function FormVinculo({ papel, jaVinculados, buscar, onVincular, onFechar }: Props) {
  const [termo, setTermo] = useState('')
  const [resultado, setResultado] = useState<Resultado>({ estado: 'parado' })
  const [escolhida, setEscolhida] = useState<PessoaEncontrada | null>(null)
  const [alerta, setAlerta] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const nomeGrupo = useId()
  const rotulo = papel === 'docente' ? 'docente' : 'aluno'

  useEffect(() => {
    const valor = termo.trim()
    if (valor.length < MINIMO) return
    let valido = true
    const espera = setTimeout(() => {
      setResultado({ estado: 'buscando' })
      buscar(valor)
        .then((pessoas) => valido && setResultado({ estado: 'pronto', pessoas }))
        .catch((e: unknown) => valido && setResultado({ estado: 'erro', mensagem: e instanceof ApiError ? e.mensagem : GENERICA }))
    }, ESPERA_MS)
    return () => {
      valido = false
      clearTimeout(espera)
    }
  }, [termo, buscar])

  async function vincular() {
    if (!escolhida) return
    setAlerta(undefined)
    setEnviando(true)
    try {
      await onVincular(escolhida)
    } catch (e) {
      setAlerta(e instanceof ApiError ? e.mensagem : GENERICA)
    } finally {
      setEnviando(false)
    }
  }

  const pessoas = termo.trim().length >= MINIMO && resultado.estado === 'pronto' ? resultado.pessoas : []
  return (
    <Modal
      titulo={`Vincular ${rotulo}`}
      descricao={`Busque a pessoa pelo nome ou usuário. Só aparecem pessoas ativas com perfil ${rotulo}.`}
      onFechar={onFechar}
      largura="max-w-lg"
      rodape={
        <>
          <span className="grow" />
          <button type="button" onClick={onFechar} className="botao-secundario">
            Cancelar
          </button>
          <button type="button" disabled={!escolhida || enviando} aria-busy={enviando} onClick={vincular} className="botao-primario">
            Vincular
          </button>
        </>
      }
    >
      <div className="space-y-4 px-6 py-5">
        {alerta && (
          <p role="alert" className="rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
            {alerta}
          </p>
        )}
        <Busca
          rotulo={`Buscar ${rotulo} pelo nome ou usuário`}
          valor={termo}
          onMudar={(v) => {
            setTermo(v)
            setEscolhida(null)
            // Resultado de outra busca some na hora: nada fica escolhível até a nova resposta.
            setResultado({ estado: v.trim().length >= MINIMO ? 'buscando' : 'parado' })
          }}
          maxLength={100}
        />
        {/* A região viva anuncia só o estado da busca; a lista em si não é reanunciada a cada mudança. */}
        <p role="status" className="sr-only">
          {termo.trim().length < MINIMO
            ? ''
            : resultado.estado === 'buscando'
              ? 'Buscando…'
              : resultado.estado === 'pronto'
                ? pessoas.length === 0
                  ? 'Ninguém encontrado'
                  : `${pessoas.length} ${pessoas.length === 1 ? 'pessoa encontrada' : 'pessoas encontradas'}`
                : ''}
        </p>
        <div className="min-h-[180px]">
          {termo.trim().length < MINIMO ? (
            <p className="py-6 text-center text-[13px] text-apagado">Digite ao menos {MINIMO} letras para buscar.</p>
          ) : resultado.estado === 'buscando' ? (
            <p className="py-6 text-center text-[13px] text-apagado">Buscando…</p>
          ) : resultado.estado === 'erro' ? (
            <p className="py-6 text-center text-[13px] text-perigo">{resultado.mensagem}</p>
          ) : resultado.estado === 'pronto' && pessoas.length === 0 ? (
            <p className="py-6 text-center text-[13px] text-apagado">Ninguém encontrado com esse nome.</p>
          ) : (
            <ul role="radiogroup" aria-label="Pessoas encontradas" className="divide-y divide-linha-suave rounded-xl border border-linha">
              {pessoas.map((p) => {
                const vinculada = jaVinculados.has(p.id)
                return (
                  <li key={p.id}>
                    <label className={`flex items-center gap-3 px-4 py-3 ${vinculada ? 'opacity-60' : 'cursor-pointer hover:bg-fundo'}`}>
                      <input
                        type="radio"
                        name={nomeGrupo}
                        className="size-[18px] accent-azul"
                        disabled={vinculada}
                        checked={escolhida?.id === p.id}
                        onChange={() => setEscolhida(p)}
                      />
                      <span className="flex-1">
                        <span className="block text-[14px] font-semibold text-navy">{p.nome}</span>
                        <span className="block text-[12.5px] text-tenue">{p.username}</span>
                      </span>
                      {vinculada && <span className="text-[12.5px] text-tenue">Já está na turma</span>}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}
