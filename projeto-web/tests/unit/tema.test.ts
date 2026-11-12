import { afterEach, describe, expect, it, vi } from 'vitest'

import { aplicarTema, CHAVE_TEMA, guardarEscolha, lerEscolha, temaEfetivo } from '../../src/lib/tema'
import { limparTema, sistemaEm } from '../apoio-tema'

// Spec 002 (FR-003, FR-004, D-MN-4, D-MN-5): a escolha guardada vence o sistema; sem escolha, vale o
// sistema; armazenamento indisponível ou valor estranho não quebram nada.
const scriptInicial = Object.values(
  import.meta.glob('../../public/tema-inicial.js', { query: '?raw', import: 'default', eager: true }),
)[0] as string

afterEach(limparTema)

describe('escolha guardada', () => {
  it('sem escolha: null', () => {
    expect(lerEscolha()).toBeNull()
  })

  it('lê claro e escuro da chave conecta:tema', () => {
    localStorage.setItem(CHAVE_TEMA, 'escuro')
    expect(CHAVE_TEMA).toBe('conecta:tema')
    expect(lerEscolha()).toBe('escuro')
    localStorage.setItem(CHAVE_TEMA, 'claro')
    expect(lerEscolha()).toBe('claro')
  })

  it('valor desconhecido conta como sem escolha', () => {
    localStorage.setItem(CHAVE_TEMA, 'roxo')
    expect(lerEscolha()).toBeNull()
  })

  it('localStorage que lança conta como sem escolha', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    expect(lerEscolha()).toBeNull()
  })

  it('guardar grava só o tema, e não lança se o armazenamento recusar', () => {
    guardarEscolha('escuro')
    expect(localStorage.getItem(CHAVE_TEMA)).toBe('escuro')
    expect(localStorage.length).toBe(1)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('cheio', 'QuotaExceededError')
    })
    expect(() => guardarEscolha('claro')).not.toThrow()
  })
})

describe('tema efetivo', () => {
  it('sem escolha, segue o sistema', () => {
    sistemaEm(true)
    expect(temaEfetivo()).toBe('escuro')
    sistemaEm(false)
    expect(temaEfetivo()).toBe('claro')
  })

  it('a escolha vence o sistema', () => {
    sistemaEm(true)
    localStorage.setItem(CHAVE_TEMA, 'claro')
    expect(temaEfetivo()).toBe('claro')
  })

  it('sem matchMedia, claro', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(temaEfetivo()).toBe('claro')
  })
})

describe('aplicar', () => {
  it('marca o <html> com data-tema e color-scheme', () => {
    aplicarTema('escuro')
    expect(document.documentElement.dataset.tema).toBe('escuro')
    expect(document.documentElement.style.colorScheme).toBe('dark')
    aplicarTema('claro')
    expect(document.documentElement.dataset.tema).toBe('claro')
    expect(document.documentElement.style.colorScheme).toBe('light')
  })
})

describe('public/tema-inicial.js (antes da primeira pintura)', () => {
  const rodar = () => new Function(scriptInicial)()

  it.each([
    ['sem escolha, sistema escuro', null, true, 'escuro'],
    ['sem escolha, sistema claro', null, false, 'claro'],
    ['escolha claro, sistema escuro', 'claro', true, 'claro'],
    ['escolha escuro, sistema claro', 'escuro', false, 'escuro'],
    ['valor desconhecido, sistema escuro', 'roxo', true, 'escuro'],
  ])('%s → %s', (_caso, escolha, escuro, esperado) => {
    sistemaEm(escuro)
    if (escolha) localStorage.setItem(CHAVE_TEMA, escolha)

    rodar()

    expect(document.documentElement.dataset.tema).toBe(esperado)
    expect(document.documentElement.dataset.tema).toBe(temaEfetivo())
    expect(document.documentElement.style.colorScheme).toBe(esperado === 'escuro' ? 'dark' : 'light')
  })

  it('localStorage que lança e sem matchMedia: claro, sem erro', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })
    vi.stubGlobal('matchMedia', undefined)
    expect(rodar).not.toThrow()
    expect(document.documentElement.dataset.tema).toBe('claro')
  })
})
