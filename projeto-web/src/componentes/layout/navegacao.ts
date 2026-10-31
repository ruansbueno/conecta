import type { NomeIcone } from '../comum/icones-svg'

export interface ItemNavegacao {
  para: string
  rotulo: string
  icone: NomeIcone
}

export interface GrupoNavegacao {
  titulo: string
  itens: ItemNavegacao[]
}

export const ROTULO_PERFIL: Record<string, string> = {
  administrador: 'Administração',
  coordenacao: 'Coordenação',
  docente: 'Docente',
  aluno: 'Aluno',
}

/**
 * Itens visíveis por perfil (spec §3, RW-11). Conveniência de interface: quem nega é a API.
 * Agenda (F2) é de administração, coordenação e docente (plan-f2 D-F2-13).
 */
export function navegacaoDoPerfil(perfil: string): GrupoNavegacao[] {
  const docente = perfil === 'docente'
  const grupos: GrupoNavegacao[] = [
    { titulo: 'Acompanhar', itens: [{ para: '/painel', rotulo: 'Painel', icone: 'painel' }] },
    {
      titulo: 'Comunicação',
      itens: [
        { para: '/avisos', rotulo: docente ? 'Meus avisos' : 'Avisos', icone: 'avisos' },
        { para: '/eventos', rotulo: 'Agenda', icone: 'agenda' },
      ],
    },
    {
      titulo: 'Acadêmico',
      itens: [
        { para: '/turmas', rotulo: docente ? 'Minhas turmas' : 'Turmas', icone: 'turmas' },
        { para: '/solicitacoes', rotulo: 'Solicitações', icone: 'solicitacoes' },
      ],
    },
  ]
  if (perfil === 'administrador' || perfil === 'coordenacao') {
    grupos.push({
      titulo: 'Administração',
      itens: [{ para: '/usuarios', rotulo: 'Usuários', icone: 'usuarios' }],
    })
  }
  return grupos
}
