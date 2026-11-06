// Guarda das rotas de gestão (RW-07, RW-12): sem sessão vai ao login guardando o destino; aluno
// vê sem permissão e tem a sessão encerrada (RW-06); perfil fora da lista vê sem permissão.
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation, useOutletContext } from 'react-router'

import { Esqueleto } from '../componentes/comum/esqueleto'
import { EstadoErro } from '../componentes/comum/estado-erro'
import type { Perfil } from '../api/schemas'
import { useSessao } from './contexto'

export function ExigirSessao({ perfis }: { perfis?: readonly Perfil[] }) {
  const { estado, encerrar, recarregar } = useSessao()
  const local = useLocation()
  // Guarda aninhada (perfis) dentro da área de gestão: repassa o contexto dela às páginas, senão
  // elas perdem `atualizarPendentes` e os contadores da barra lateral ficam desatualizados.
  const contexto = useOutletContext()
  const aluno = estado.tipo === 'autenticado' && estado.usuario.perfil === 'aluno'

  useEffect(() => {
    if (aluno) void encerrar('aluno')
  }, [aluno, encerrar])

  switch (estado.tipo) {
    case 'carregando':
      return <Esqueleto rotulo="Carregando sua sessão" />
    case 'erro':
      return <EstadoErro mensagem={estado.erro.mensagem} onRepetir={recarregar} />
    case 'anonimo':
      if (estado.encerramento?.motivo === 'aluno') {
        return <Navigate to="/sem-permissao" replace state={{ aluno: true }} />
      }
      {
        // O destino só volta para quem vai reentrar: quem abriu sem sessão ou teve a sessão expirada.
        // Depois de sair (ou de um acesso desativado), a próxima pessoa no navegador vai ao painel.
        const motivo = estado.encerramento?.motivo
        const guardaDestino = !motivo || motivo === 'expirada'
        return (
          <Navigate
            to="/login"
            replace
            state={{
              ...(guardaDestino ? { destino: `${local.pathname}${local.search}` } : {}),
              mensagem: estado.encerramento?.mensagem,
            }}
          />
        )
      }
    case 'autenticado':
      if (aluno) return <Navigate to="/sem-permissao" replace state={{ aluno: true }} />
      if (perfis && !perfis.includes(estado.usuario.perfil as Perfil)) {
        return <Navigate to="/sem-permissao" replace />
      }
      return <Outlet context={contexto} />
  }
}
