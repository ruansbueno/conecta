// T01 (design w-01). A sessão nasce no cookie httpOnly que a API grava; esta tela nunca vê o
// token (RW-01, RW-02). Depois do login, GET /me decide o destino (RW-06, RW-07).
import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router'

import { ApiError, SESSAO_NAO_GUARDADA } from '../api/erros'
import { login, me } from '../api/recursos/auth'
import { BotaoTema } from '../componentes/comum/botao-tema'
import { Icone, Marca } from '../componentes/comum/icone'
import { useSessao } from '../sessao/contexto'

export default function Login() {
  const { estado, entrar, encerrar } = useSessao()
  const navegar = useNavigate()
  const { state } = useLocation()
  const destino: string = state?.destino && state.destino !== '/login' ? state.destino : '/painel'

  const [usuario, setUsuario] = useState('')
  const [senha, setSenha] = useState('')
  const [tentou, setTentou] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [falha, setFalha] = useState<ApiError | null>(null)

  if (estado.tipo === 'autenticado' && !enviando) return <Navigate to={destino} replace />

  const encerramento = estado.tipo === 'anonimo' ? estado.encerramento?.mensagem : undefined
  const mensagem = falha?.mensagem ?? encerramento
  const erroUsuario = tentou && !usuario.trim() ? 'Informe o usuário.' : falha?.erroDoCampo('username')
  const erroSenha = tentou && !senha ? 'Informe a senha.' : falha?.erroDoCampo('password')

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    setFalha(null)
    if (!usuario.trim() || !senha) return
    setEnviando(true)
    try {
      await login(usuario.trim(), senha)
      const atual = await me().catch((e: unknown) => {
        // 401 logo depois de um login aceito não é expiração: o cookie não ficou (bloqueado ou proxy).
        throw e instanceof ApiError && e.code === 'NAO_AUTENTICADO' ? new ApiError({ code: SESSAO_NAO_GUARDADA }) : e
      })
      if (atual.perfil === 'aluno') {
        await encerrar('aluno')
        navegar('/sem-permissao', { replace: true, state: { aluno: true } })
        return
      }
      entrar(atual)
      navegar(destino, { replace: true })
    } catch (erro) {
      const apiErro = erro instanceof ApiError ? erro : new ApiError({ code: 'RESPOSTA_INVALIDA' })
      setFalha(apiErro)
      setTentou(false)
      // Falha de credencial limpa a senha; sem rede, ela fica para tentar de novo (RW-42).
      if (apiErro.efeito !== 'repetir') setSenha('')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex min-h-dvh bg-branco">
      <aside className="hidden w-[60%] max-w-[860px] flex-col justify-between bg-painel px-14 py-14 text-sobre-cor lg:flex">
        <div className="flex items-center gap-2.5">
          <Marca tamanho={30} />
          <span className="text-[26px] font-extrabold tracking-[0.07em]">CONECTA</span>
        </div>
        <div>
          <p className="max-w-[460px] text-[34px] leading-tight font-bold tracking-[-0.025em]">
            Um só lugar para avisar a turma certa.
          </p>
          <p className="mt-5 max-w-[420px] text-[15px] leading-relaxed text-sobre-painel-suave">
            Publique avisos e eventos para todos, para semestres inteiros, para os docentes ou para
            turmas específicas — e acompanhe o que foi publicado, editado e arquivado.
          </p>
        </div>
        <p className="text-[12.5px] text-sobre-painel-suave">IFSul · Análise e Desenvolvimento de Sistemas</p>
      </aside>

      <main className="relative flex flex-1 items-center justify-center px-5 py-16 sm:px-8 lg:py-0">
        <form noValidate onSubmit={enviar} className="w-full max-w-[380px]">
          {/* O painel azul com a marca só aparece no desktop: abaixo de 1024 px a marca vai ao topo (spec 003, RR-20). */}
          <div className="mb-10 flex items-center gap-2.5 text-navy lg:hidden">
            <Marca tamanho={26} />
            <span className="text-[20px] font-extrabold tracking-[0.07em]">CONECTA</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-[-0.025em] text-navy">Acesso à gestão</h1>
          <p className="mt-2 text-[13.5px] leading-normal text-apagado">
            Disponível para administração, coordenação e docentes. Alunos usam o aplicativo.
          </p>

          <Campo
            id="usuario"
            rotulo="Usuário"
            icone="perfil"
            valor={usuario}
            onMudar={setUsuario}
            erro={erroUsuario}
            dica="seu.usuario"
            autoComplete="username"
          />
          <Campo
            id="senha"
            rotulo="Senha"
            icone="cadeado"
            tipo="password"
            valor={senha}
            onMudar={setSenha}
            erro={erroSenha}
            autoComplete="current-password"
          />

          {mensagem && (
            <p role="alert" className="mt-5 flex items-center gap-2.5 rounded-[10px] bg-perigo-fundo px-3.5 py-2.5 text-[13px] text-perigo">
              <Icone nome="info" tamanho={17} />
              {mensagem}
            </p>
          )}

          <button type="submit" disabled={enviando} className="botao-primario mt-6 w-full">
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>

          <p className="mt-6 flex items-center gap-2.5 rounded-xl bg-fundo px-4 py-3.5 text-[12.5px] leading-normal text-navy-suave">
            <Icone nome="escudo" tamanho={18} className="shrink-0" />
            Use o login e a senha institucionais do IFSul. A sessão expira em 24 h.
          </p>
        </form>
        {/* Depois do formulário na ordem do teclado; no canto superior direito na tela (spec 002). */}
        <BotaoTema className="absolute top-5 right-5" />
      </main>
    </div>
  )
}

interface PropsCampo {
  id: string
  rotulo: string
  icone: 'perfil' | 'cadeado'
  valor: string
  onMudar: (valor: string) => void
  erro?: string
  dica?: string
  tipo?: string
  autoComplete: string
}

function Campo({ id, rotulo, icone, valor, onMudar, erro, dica, tipo = 'text', autoComplete }: PropsCampo) {
  const idErro = `${id}-erro`
  return (
    <div className="mt-5 first-of-type:mt-8">
      <label htmlFor={id} className="rotulo">
        {rotulo}
      </label>
      <div className={`campo flex items-center gap-2.5 ${erro ? 'border-perigo' : ''}`}>
        <Icone nome={icone} tamanho={18} className="text-tenue" />
        <input
          id={id}
          type={tipo}
          value={valor}
          placeholder={dica}
          autoComplete={autoComplete}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? idErro : undefined}
          onChange={(e) => onMudar(e.target.value)}
          className="w-full bg-transparent outline-none placeholder:text-tenue"
        />
      </div>
      {erro && (
        <p id={idErro} className="mt-1.5 text-xs text-perigo">
          {erro}
        </p>
      )}
    </div>
  )
}
