import { Link, useLocation } from 'react-router'

import { BotaoTema } from '../componentes/comum/botao-tema'
import { Icone } from '../componentes/comum/icone'

/** T16. Explica sem expor dado nenhum (RW-12); aluno é orientado a usar o aplicativo (RW-06). */
export function SemPermissao({ aluno }: { aluno?: boolean }) {
  const { state } = useLocation()
  const ehAluno = aluno ?? state?.aluno === true
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="flex size-[60px] items-center justify-center rounded-2xl border border-linha bg-branco text-apagado">
        <Icone nome="cadeado" tamanho={26} />
      </div>
      {ehAluno ? (
        <>
          <h1 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-navy">
            A gestão é para administração, coordenação e docentes
          </h1>
          <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-apagado">
            Seus avisos, turmas e solicitações ficam no aplicativo CONECTA. Entre por ele com o
            mesmo usuário e senha.
          </p>
          <Link to="/login" className="botao-secundario mt-6">
            Voltar ao login
          </Link>
        </>
      ) : (
        <>
          <h1 className="mt-5 text-[22px] font-bold tracking-[-0.02em] text-navy">
            Esta área não está disponível para o seu perfil
          </h1>
          <p className="mt-2 max-w-lg text-[13.5px] leading-relaxed text-apagado">
            Se você precisa desse acesso, fale com a administração do CONECTA.
          </p>
          <Link to="/painel" className="botao-secundario mt-6">
            Voltar ao painel
          </Link>
        </>
      )}
      {/* Fora da casca da gestão: o botão do modo noturno fica no canto da página (spec 002). */}
      <BotaoTema className="fixed top-5 right-5" />
    </div>
  )
}
