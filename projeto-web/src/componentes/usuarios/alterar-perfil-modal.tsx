// T11 (design w-11): alterar o perfil de acesso e ativar/desativar (só administração, RW-32). Cada
// opção diz o que o perfil pode fazer (RW-33); a mudança vale na requisição seguinte da pessoa.
import { useEffect, useId, useRef, useState } from 'react'

import { ApiError } from '../../api/erros'
import type { UsuarioGestao } from '../../api/schemas'
import { PERFIS_DE_ACESSO, type PerfilDeAcesso } from '../../lib/perfis'
import { quantidade } from '../../lib/texto'
import { Avatar } from '../comum/avatar'
import { Icone } from '../comum/icone'
import { Modal } from '../comum/modal'

const VINCULOS_INCOMPATIVEIS =
  'Esta pessoa tem vínculos com turmas que não combinam com o novo perfil. Remova os vínculos na página da turma antes de mudar o perfil.'
const ULTIMO_ADMIN = 'É preciso manter ao menos um administrador ativo.'
const PROPRIA_CONTA = 'Você não pode desativar a sua própria conta.'

interface Props {
  usuario: UsuarioGestao
  /** Turmas em que a pessoa tem vínculo (null enquanto carrega ou se falhar). */
  turmas: number | null
  /** O administrador editando a si mesmo: não pode se desativar. */
  eProprio: boolean
  /** Lançam ApiError quando a API recusa. */
  onSalvarPerfil: (perfil: PerfilDeAcesso) => Promise<void>
  onMudarSituacao: (ativo: boolean) => Promise<void>
  onFechar: () => void
}

/** Recusas desta tela com o sentido que têm aqui (o `detail` da API nunca aparece). */
function mensagemDa(e: unknown, desativandoAPropria: boolean) {
  if (!(e instanceof ApiError)) return 'Não foi possível concluir agora. Tente de novo em instantes.'
  if (e.code === 'PERFIL_INCOMPATIVEL') return VINCULOS_INCOMPATIVEIS
  if (e.code === 'VALIDATION_ERROR') {
    // A API diz qual campo recusou: só esses dois casos têm explicação própria.
    if (desativandoAPropria && e.erroDoCampo('ativo')) return PROPRIA_CONTA
    if (e.erroDoCampo('perfil') || e.erroDoCampo('ativo')) return ULTIMO_ADMIN
  }
  return e.mensagem
}

export function AlterarPerfilModal({ usuario, turmas, eProprio, onSalvarPerfil, onMudarSituacao, onFechar }: Props) {
  const [perfil, setPerfil] = useState(usuario.perfil)
  const [confirmandoDesativar, setConfirmandoDesativar] = useState(false)
  const [erro, setErro] = useState<string>()
  const [enviando, setEnviando] = useState(false)
  const id = useId()
  // Entrar e sair da confirmação troca os botões: o foco acompanha e não escapa do modal (RW-39).
  const botaoConfirmar = useRef<HTMLButtonElement>(null)
  const botaoDesativar = useRef<HTMLButtonElement>(null)
  const montado = useRef(false)
  useEffect(() => {
    if (!montado.current) {
      montado.current = true
      return
    }
    ;(confirmandoDesativar ? botaoConfirmar : botaoDesativar).current?.focus()
  }, [confirmandoDesativar])

  async function executar(acao: () => Promise<void>, desativandoAPropria = false) {
    setErro(undefined)
    setEnviando(true)
    try {
      await acao()
    } catch (e) {
      setErro(mensagemDa(e, desativandoAPropria))
      setConfirmandoDesativar(false)
    } finally {
      setEnviando(false)
    }
  }

  const rodape = confirmandoDesativar ? (
    <>
      <span className="grow" />
      <button type="button" onClick={() => setConfirmandoDesativar(false)} className="botao-secundario">
        Voltar
      </button>
      <button
        ref={botaoConfirmar}
        type="button"
        disabled={enviando}
        onClick={() => executar(() => onMudarSituacao(false), eProprio)}
        className="botao-perigo"
      >
        Confirmar desativação
      </button>
    </>
  ) : (
    <>
      {usuario.ativo && !eProprio && (
        <button
          ref={botaoDesativar}
          type="button"
          disabled={enviando}
          onClick={() => setConfirmandoDesativar(true)}
          className="text-[14px] font-semibold text-perigo hover:underline disabled:opacity-50"
        >
          Desativar usuário
        </button>
      )}
      {!usuario.ativo && (
        <button
          type="button"
          disabled={enviando}
          onClick={() => executar(() => onMudarSituacao(true))}
          className="text-[14px] font-semibold text-azul hover:underline disabled:opacity-50"
        >
          Reativar usuário
        </button>
      )}
      <span className="grow" />
      <button type="button" disabled={enviando} onClick={onFechar} className="botao-secundario">
        Cancelar
      </button>
      <button
        type="button"
        disabled={enviando || perfil === usuario.perfil}
        aria-busy={enviando}
        onClick={() => executar(() => onSalvarPerfil(perfil as PerfilDeAcesso))}
        className="botao-primario"
      >
        Salvar perfil
      </button>
    </>
  )

  return (
    // Durante o envio não se fecha: a resposta é desta pessoa, e o resultado precisa aparecer aqui.
    <Modal titulo="Alterar perfil de acesso" onFechar={() => !enviando && onFechar()} largura="max-w-xl" rodape={rodape}>
      <div className="flex items-center gap-3 border-b border-linha-suave px-6 py-4">
        <Avatar nome={usuario.nome} />
        <div>
          <p className="text-[14.5px] font-semibold text-navy">{usuario.nome}</p>
          <p className="text-[13px] text-apagado">
            {usuario.username}
            {turmas !== null && ` · ${turmas === 0 ? 'sem vínculo em turmas' : `vínculo em ${quantidade(turmas, 'turma')}`}`}
          </p>
        </div>
      </div>
      <div className="space-y-3 px-6 py-5">
        {erro && (
          <p role="alert" className="rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13.5px] text-perigo">
            {erro}
          </p>
        )}
        {confirmandoDesativar ? (
          <div className="rounded-xl border border-perigo-borda bg-perigo-fundo px-5 py-4 text-[13.5px] text-perigo">
            <p className="font-semibold">Desativar {usuario.nome}?</p>
            <p className="mt-1">
              A pessoa perde o acesso na hora: a sessão em uso deixa de funcionar e o login passa a ser recusado. Vínculos e
              avisos publicados ficam. Dá para reativar depois.
            </p>
          </div>
        ) : (
          <>
            <div role="radiogroup" aria-label="Perfil de acesso" className="space-y-2.5">
              {PERFIS_DE_ACESSO.map((p) => {
                const marcado = perfil === p.id
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-center gap-3.5 rounded-xl border px-4 py-3 ${
                      marcado ? 'border-azul-100 bg-azul-superficie' : 'border-linha hover:bg-fundo'
                    }`}
                  >
                    <input
                      type="radio"
                      name={id}
                      value={p.id}
                      checked={marcado}
                      onChange={() => setPerfil(p.id)}
                      aria-labelledby={`${id}-${p.id}`}
                      aria-describedby={`${id}-${p.id}-d`}
                      className="size-[18px] accent-azul"
                    />
                    <span>
                      <span id={`${id}-${p.id}`} className="block text-[14.5px] font-semibold text-navy">
                        {p.rotulo}
                      </span>
                      <span id={`${id}-${p.id}-d`} className="block text-[13px] text-apagado">
                        {p.descricao}
                      </span>
                    </span>
                  </label>
                )
              })}
            </div>
            <p className="flex items-start gap-2.5 rounded-xl bg-alerta-fundo px-4 py-3 text-[13px] text-alerta">
              <Icone nome="info" tamanho={17} className="mt-0.5 shrink-0" />
              A mudança vale já na próxima ação da pessoa, sem precisar sair e entrar de novo.
            </p>
            {eProprio && usuario.perfil === 'administrador' && perfil !== 'administrador' && (
              <p className="rounded-xl border border-perigo-borda bg-perigo-fundo px-4 py-3 text-[13px] text-perigo">
                {perfil === 'coordenacao'
                  ? 'Você vai deixar a administração: depois de salvar, não poderá mais alterar perfis.'
                  : 'Você vai deixar a administração: depois de salvar, perde o acesso a esta tela.'}
              </p>
            )}
            {eProprio && <p className="text-[12.5px] text-tenue">{PROPRIA_CONTA}</p>}
          </>
        )}
      </div>
    </Modal>
  )
}
