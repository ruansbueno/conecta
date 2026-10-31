import { describe, expect, it } from 'vitest'

import { ApiError } from '../../src/api/erros'

const e = (code: string, status?: number) => new ApiError({ code, status })

describe('mapa code → mensagem e efeito (spec §6)', () => {
  it('mensagens e efeitos da web', () => {
    expect(e('CREDENCIAIS_INVALIDAS', 401).mensagem).toBe('Usuário ou senha incorretos.')
    expect(e('USUARIO_INATIVO', 403).mensagem).toBe('Este acesso está desativado. Procure a administração.')
    expect(e('USUARIO_INATIVO', 403).efeito).toBe('encerraSessao')
    expect(e('NAO_AUTENTICADO', 401).mensagem).toBe('Sua sessão expirou. Entre de novo.')
    expect(e('SEM_PERMISSAO', 403).efeito).toBe('semPermissao')
    expect(e('DESTINO_NAO_PERMITIDO', 403).mensagem).toBe('Você só pode publicar para as turmas em que leciona.')
    expect(e('DESTINO_NAO_PERMITIDO', 403).efeito).toBe('recarrega')
    expect(e('AVISO_NAO_EDITAVEL', 409).efeito).toBe('ofereceDesarquivar')
    expect(e('VALIDATION_ERROR', 422).efeito).toBe('marcaCampos')
  })

  it('sem rede e timeout', () => {
    expect(e('SEM_REDE').mensagem).toBe('Não foi possível conectar. Verifique a rede e tente de novo.')
    expect(e('TIMEOUT').efeito).toBe('repetir')
  })

  it('5xx e code desconhecido: mensagem genérica, mantém o formulário', () => {
    const generica = 'Não foi possível concluir agora. Tente de novo em instantes.'
    expect(e('ERRO_INTERNO', 500).mensagem).toBe(generica)
    expect(e('CODIGO_NOVO', 409).mensagem).toBe(generica)
    expect(e('RESPOSTA_INVALIDA', 502).efeito).toBe('repetir')
  })

  it('nunca usa o detail do servidor como mensagem (RW-08)', () => {
    expect(new ApiError({ code: 'CREDENCIAIS_INVALIDAS', status: 401, detail: 'texto cru' }).mensagem).not.toContain(
      'texto cru',
    )
  })

  it('eventos da agenda (F2): mesmos efeitos dos avisos', () => {
    expect(new ApiError({ code: 'EVENTO_NAO_EDITAVEL', status: 409 }).efeito).toBe('ofereceDesarquivar')
    expect(new ApiError({ code: 'EVENTO_SITUACAO_INVALIDA', status: 409 }).efeito).toBe('recarrega')
    expect(new ApiError({ code: 'EVENTO_NAO_ENCONTRADO', status: 404 }).efeito).toBe('voltaLista')
  })

  it('AVISO_SITUACAO_INVALIDA explica que a situação mudou por fora (a lista é recarregada)', () => {
    expect(new ApiError({ code: 'AVISO_SITUACAO_INVALIDA', status: 409 }).mensagem).toBe(
      'A situação deste aviso mudou enquanto você olhava. A lista foi atualizada.',
    )
  })
})
