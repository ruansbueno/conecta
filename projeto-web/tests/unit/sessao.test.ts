import { afterEach, describe, expect, it, vi } from 'vitest'

import { apagarTodosRascunhos, lerRascunho, salvarRascunho } from '../../src/lib/rascunho'
import { criarEncerrador } from '../../src/sessao/encerrar'

const RASCUNHO = { titulo: 'Título', conteudo: 'Texto longo', destinos: [] }

function preparar() {
  const encerrarNaApi = vi.fn().mockResolvedValue(undefined)
  const aoEncerrar = vi.fn()
  const encerrar = criarEncerrador({ encerrarNaApi, aoEncerrar })
  return { encerrarNaApi, aoEncerrar, encerrar }
}

describe('encerramento da sessão', () => {
  afterEach(() => apagarTodosRascunhos())

  it('duas falhas simultâneas encerram uma única vez', async () => {
    const { encerrarNaApi, aoEncerrar, encerrar } = preparar()

    await Promise.all([encerrar('expirada'), encerrar('expirada')])

    expect(encerrarNaApi).toHaveBeenCalledTimes(1)
    expect(aoEncerrar).toHaveBeenCalledTimes(1)
  })

  it('depois de um encerramento concluído, o próximo também acontece', async () => {
    const { aoEncerrar, encerrar } = preparar()

    await encerrar('saida')
    await encerrar('saida')

    expect(aoEncerrar).toHaveBeenCalledTimes(2)
  })

  it('sessão expirada guarda a mensagem e preserva o rascunho', async () => {
    const { aoEncerrar, encerrar } = preparar()
    salvarRascunho('rascunho:aviso:novo', RASCUNHO)

    await encerrar('expirada')

    expect(aoEncerrar).toHaveBeenCalledWith({
      motivo: 'expirada',
      mensagem: 'Sua sessão expirou. Entre de novo.',
    })
    expect(lerRascunho('rascunho:aviso:novo')?.titulo).toBe('Título')
  })

  it.each(['saida', 'inativo', 'aluno'] as const)('%s apaga os rascunhos', async (motivo) => {
    const { encerrar } = preparar()
    salvarRascunho('rascunho:aviso:novo', RASCUNHO)
    salvarRascunho('rascunho:aviso:abc', RASCUNHO)

    await encerrar(motivo)

    expect(lerRascunho('rascunho:aviso:novo')).toBeNull()
    expect(lerRascunho('rascunho:aviso:abc')).toBeNull()
  })

  it('falha ao avisar a API não impede o encerramento local', async () => {
    const aoEncerrar = vi.fn()
    const encerrar = criarEncerrador({
      encerrarNaApi: vi.fn().mockRejectedValue(new Error('rede')),
      aoEncerrar,
    })

    await encerrar('saida')

    expect(aoEncerrar).toHaveBeenCalledWith({ motivo: 'saida', mensagem: undefined })
  })
})

describe('rascunho', () => {
  afterEach(() => apagarTodosRascunhos())

  it('guarda só título, conteúdo, destinos e a data; nunca dado de sessão', () => {
    salvarRascunho('rascunho:aviso:novo', RASCUNHO)

    const lido = lerRascunho('rascunho:aviso:novo')!
    expect(Object.keys(lido).sort()).toEqual(['conteudo', 'destinos', 'salvoEm', 'titulo'])
    expect(lido.salvoEm).toBeInstanceOf(Date)
  })

  it('entrada corrompida é tratada como ausente', () => {
    localStorage.setItem('rascunho:aviso:novo', '{quebrado')

    expect(lerRascunho('rascunho:aviso:novo')).toBeNull()
  })

  it('apagar todos não toca em outras chaves do navegador', () => {
    localStorage.setItem('outra:coisa', 'fica')
    salvarRascunho('rascunho:aviso:novo', RASCUNHO)

    apagarTodosRascunhos()

    expect(localStorage.getItem('outra:coisa')).toBe('fica')
    localStorage.removeItem('outra:coisa')
  })
})
