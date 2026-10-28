// T10 (design w-10): pessoas com perfil, último acesso e situação — sempre com texto, nunca só cor
// (RW-40). A ação de alterar perfil só existe para a administração (RW-11).
import type { UsuarioGestao } from '../../api/schemas'
import { dataRelativa } from '../../lib/datas'
import { rotuloDoPerfil } from '../../lib/perfis'
import { Avatar } from '../comum/avatar'
import { Icone } from '../comum/icone'
import { Tabela, type Coluna } from '../comum/tabela'

const COR_PERFIL: Record<string, string> = {
  administrador: 'bg-perigo-fundo text-perigo',
  coordenacao: 'bg-alerta-fundo text-alerta',
  docente: 'bg-azul-superficie text-azul',
  aluno: 'bg-linha-suave text-apagado',
}

const selo = (texto: string, classe: string) => (
  <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-xs font-semibold whitespace-nowrap ${classe}`}>{texto}</span>
)

interface Props {
  legenda: string
  usuarios: UsuarioGestao[]
  agora: Date
  /** Só para a administração. */
  onAlterar?: (u: UsuarioGestao) => void
}

export function TabelaUsuarios({ legenda, usuarios, agora, onAlterar }: Props) {
  const colunas: Coluna<UsuarioGestao>[] = [
    {
      chave: 'usuario',
      titulo: 'Usuário',
      celula: (u) => (
        <div className="flex items-center gap-3">
          <Avatar nome={u.nome} />
          <div>
            <p className="font-semibold text-navy">{u.nome}</p>
            <p className="text-[12.5px] text-tenue">{u.username}</p>
          </div>
        </div>
      ),
    },
    { chave: 'perfil', titulo: 'Perfil', celula: (u) => selo(rotuloDoPerfil(u.perfil), COR_PERFIL[u.perfil] ?? COR_PERFIL.aluno) },
    {
      chave: 'acesso',
      titulo: 'Último acesso',
      celula: (u) => (u.ultimoLoginEm ? dataRelativa(u.ultimoLoginEm, agora) : <span className="text-tenue">nunca entrou</span>),
    },
    {
      chave: 'situacao',
      titulo: 'Situação',
      celula: (u) => (u.ativo ? selo('Ativo', 'bg-sucesso-fundo text-sucesso') : selo('Inativo', 'bg-linha-suave text-apagado')),
    },
    ...(onAlterar
      ? [
          {
            chave: 'acoes',
            titulo: 'Ações',
            celula: (u: UsuarioGestao) => (
              <button
                type="button"
                aria-label={`Alterar perfil de ${u.nome}`}
                title="Alterar perfil de acesso"
                onClick={() => onAlterar(u)}
                className="botao-icone"
              >
                <Icone nome="escudo" tamanho={17} />
              </button>
            ),
          },
        ]
      : []),
  ]
  return <Tabela legenda={legenda} colunas={colunas} linhas={usuarios} chave={(u) => u.id} />
}
