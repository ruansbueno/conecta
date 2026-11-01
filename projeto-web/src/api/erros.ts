// Falhas da API na forma que a interface entende, e o mapa único code → (mensagem, efeito) da
// spec §6. Nenhuma tela decide pelo texto de `detail` (RW-08).

export type Efeito =
  | 'permanece'
  | 'encerraSessao'
  | 'semPermissao'
  | 'recarrega'
  | 'marcaCampos'
  | 'voltaLista'
  | 'ofereceDesarquivar'
  | 'repetir'

export interface ErroDeCampo {
  campo: string
  mensagem: string
}

export const SEM_REDE = 'SEM_REDE'
export const TIMEOUT = 'TIMEOUT'
export const RESPOSTA_INVALIDA = 'RESPOSTA_INVALIDA'
/** Interno: o login foi aceito, mas o cookie de sessão não voltou na chamada seguinte. */
export const SESSAO_NAO_GUARDADA = 'SESSAO_NAO_GUARDADA'

const SEM_CONEXAO = 'Não foi possível conectar. Verifique a rede e tente de novo.'
const GENERICA = 'Não foi possível concluir agora. Tente de novo em instantes.'

const MAPA: Record<string, [string, Efeito]> = {
  CREDENCIAIS_INVALIDAS: ['Usuário ou senha incorretos.', 'permanece'],
  USUARIO_INATIVO: ['Este acesso está desativado. Procure a administração.', 'encerraSessao'],
  NAO_AUTENTICADO: ['Sua sessão expirou. Entre de novo.', 'encerraSessao'],
  CSRF_INVALIDO: ['Não foi possível confirmar a sessão. Recarregue a página e tente de novo.', 'permanece'],
  SEM_PERMISSAO: ['Esta área não está disponível para o seu perfil.', 'semPermissao'],
  DESTINO_NAO_PERMITIDO: ['Você só pode publicar para as turmas em que leciona.', 'recarrega'],
  CODIGO_TURMA_DUPLICADO: ['Já existe uma turma com este código.', 'marcaCampos'],
  JA_VINCULADO: ['Esta pessoa já está vinculada à turma.', 'recarrega'],
  PERFIL_INCOMPATIVEL: ['O papel precisa corresponder ao perfil da pessoa.', 'permanece'],
  SOLICITACAO_NAO_PENDENTE: ['Esta solicitação já foi decidida.', 'recarrega'],
  SOLICITACAO_NAO_ENCONTRADA: ['Esta solicitação não está mais disponível.', 'recarrega'],
  AVISO_NAO_EDITAVEL: ['Avisos arquivados ou excluídos não podem ser editados.', 'ofereceDesarquivar'],
  AVISO_SITUACAO_INVALIDA: ['A situação deste aviso mudou enquanto você olhava. A lista foi atualizada.', 'recarrega'],
  AVISO_NAO_ENCONTRADO: ['Este aviso não está mais disponível.', 'voltaLista'],
  EVENTO_NAO_EDITAVEL: ['Eventos arquivados ou excluídos não podem ser editados.', 'ofereceDesarquivar'],
  EVENTO_SITUACAO_INVALIDA: ['A situação deste evento mudou enquanto você olhava. A agenda foi atualizada.', 'recarrega'],
  EVENTO_NAO_ENCONTRADO: ['Este evento não está mais disponível.', 'voltaLista'],
  HORARIO_NAO_ENCONTRADO: ['Esta aula não está mais na grade.', 'recarrega'],
  TURMA_NAO_ENCONTRADA: ['Esta turma não está mais disponível.', 'recarrega'],
  USUARIO_NAO_ENCONTRADO: ['Esta pessoa não está mais disponível.', 'recarrega'],
  VINCULO_NAO_ENCONTRADO: ['Este vínculo já tinha sido removido.', 'recarrega'],
  VALIDATION_ERROR: ['Confira os campos destacados.', 'marcaCampos'],
  [SESSAO_NAO_GUARDADA]: [
    'O acesso foi aceito, mas o navegador não guardou a sessão. Verifique se os cookies estão permitidos e tente de novo.',
    'permanece',
  ],
  [SEM_REDE]: [SEM_CONEXAO, 'repetir'],
  [TIMEOUT]: [SEM_CONEXAO, 'repetir'],
}

/** Todo `code` com mensagem própria na web — conferidos contra a tabela da spec §6 (T071). */
export const CODES_DA_WEB = Object.keys(MAPA)

export class ApiError extends Error {
  readonly code: string
  readonly status?: number
  /** Texto do servidor: só para registro, nunca exibido. */
  readonly detail?: string
  readonly errors: ErroDeCampo[]

  constructor({
    code,
    status,
    detail,
    errors = [],
  }: {
    code: string
    status?: number
    detail?: string
    errors?: ErroDeCampo[]
  }) {
    super(code)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.detail = detail
    this.errors = errors
  }

  private get resolvido(): [string, Efeito] {
    if ((this.status ?? 0) >= 500) return [GENERICA, 'repetir']
    const conhecido = MAPA[this.code]
    if (conhecido) return conhecido
    if (this.code !== RESPOSTA_INVALIDA) console.warn(`code desconhecido da API: ${this.code}`)
    return [GENERICA, 'repetir']
  }

  get mensagem(): string {
    return this.resolvido[0]
  }

  get efeito(): Efeito {
    return this.resolvido[1]
  }

  /** Mensagem do campo devolvida em `errors[]` de VALIDATION_ERROR. */
  erroDoCampo(campo: string): string | undefined {
    return this.errors.find((e) => e.campo === campo || e.campo.startsWith(`${campo}.`))?.mensagem
  }
}
