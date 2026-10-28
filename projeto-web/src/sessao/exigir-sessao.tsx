// Guarda das rotas de gestão (RW-07, RW-12): sem sessão vai ao login guardando o destino; aluno
// vê sem permissão e tem a sessão encerrada (RW-06); perfil fora da lista vê sem permissão.
import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'

import { Esqueleto } from '../componentes/comum/esqueleto'
import { EstadoErro } from '../componentes/comum/estado-erro'
import type { Perfil } from '../api/schemas'
import { useSessao } from './contexto'

export function ExigirSessao({ perfis }: { perfis?: readonly Perfil[] }) {
  const { estado, encerrar, recarregar } = useSessao()
  const local = useLocation()
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
      return (
        <Navigate
          to="/login"
          replace
          state={{ destino: `${local.pathname}${local.search}`, mensagem: estado.encerramento?.mensagem }}
        />
      )
    case 'autenticado':
      if (aluno) return <Navigate to="/sem-permissao" replace state={{ aluno: true }} />
      if (perfis && !perfis.includes(estado.usuario.perfil as Perfil)) {
        return <Navigate to="/sem-permissao" replace />
      }
      return <Outlet />
  }
}
