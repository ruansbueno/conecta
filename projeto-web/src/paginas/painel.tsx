import { Link } from 'react-router'

import { Icone } from '../componentes/comum/icone'
import { useSessao } from '../sessao/contexto'

/** Painel provisório: o painel com os números da gestão (T02/T14) entra na fase de integração. */
export default function Painel() {
  const { usuario } = useSessao()
  return (
    <section className="max-w-3xl">
      <h1 className="text-[26px] font-bold tracking-[-0.025em] text-navy">
        Olá, {usuario?.nome.split(' ')[0]}
      </h1>
      <p className="mt-2 text-[13.5px] text-apagado">
        Publique um aviso e escolha exatamente quem vai recebê-lo no aplicativo.
      </p>
      <Link to="/avisos/novo" className="botao-primario mt-6">
        <Icone nome="mais" tamanho={18} />
        Novo aviso
      </Link>
    </section>
  )
}
