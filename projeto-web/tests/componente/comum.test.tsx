import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Avatar } from '../../src/componentes/comum/avatar'
import { Busca } from '../../src/componentes/comum/busca'
import { ChipDestino } from '../../src/componentes/comum/chip-destino'
import { Confirmacao } from '../../src/componentes/comum/confirmacao'
import { Esqueleto } from '../../src/componentes/comum/esqueleto'
import { EstadoErro } from '../../src/componentes/comum/estado-erro'
import { EstadoVazio } from '../../src/componentes/comum/estado-vazio'
import { Modal } from '../../src/componentes/comum/modal'
import { Paginacao } from '../../src/componentes/comum/paginacao'
import { SeloSituacao } from '../../src/componentes/comum/selo-situacao'
import { Tabela } from '../../src/componentes/comum/tabela'

describe('ChipDestino', () => {
  it('rótulo por tipo e leitura acessível', () => {
    render(
      <>
        <ChipDestino destino={{ tipo: 'todos', turma: null, semestre: null }} />
        <ChipDestino destino={{ tipo: 'semestre', turma: null, semestre: 6 }} />
        <ChipDestino destino={{ tipo: 'turma', turma: { id: 't', nome: 'SI-3A' }, semestre: null }} />
        <ChipDestino destino={{ tipo: 'docentes', turma: null, semestre: null }} />
        <ChipDestino destino={{ tipo: 'curso', turma: null, semestre: null }} />
      </>,
    )

    for (const rotulo of ['Todos os usuários', '6º semestre', 'SI-3A', 'Docentes', 'curso']) {
      expect(screen.getByText(rotulo)).toBeInTheDocument()
    }
    expect(screen.getByLabelText('Destino: SI-3A')).toBeInTheDocument()
  })

  it('removível por botão com rótulo próprio, operável por teclado', async () => {
    const remover = vi.fn()
    render(<ChipDestino destino={{ tipo: 'docentes', turma: null, semestre: null }} onRemover={remover} />)

    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Remover destino Docentes' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')

    expect(remover).toHaveBeenCalledOnce()
  })
})

describe('SeloSituacao', () => {
  it('texto visível (a situação não depende só de cor, RW-40)', () => {
    render(<SeloSituacao situacao="agendado" />)

    expect(screen.getByText('Agendado')).toBeInTheDocument()
  })
})

describe('Avatar', () => {
  it('mostra as iniciais e é anunciado pelo nome', () => {
    render(<Avatar nome="Ricardo Lemos" />)

    expect(screen.getByText('RL')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Ricardo Lemos' })).toBeInTheDocument()
  })
})

describe('estados', () => {
  it('EstadoVazio com ação', async () => {
    const acao = vi.fn()
    render(<EstadoVazio titulo="Nenhum aviso" texto="Nada aqui." acao="Novo aviso" onAcao={acao} />)

    await userEvent.click(screen.getByRole('button', { name: 'Novo aviso' }))

    expect(screen.getByRole('heading', { name: 'Nenhum aviso' })).toBeInTheDocument()
    expect(acao).toHaveBeenCalledOnce()
  })

  it('EstadoErro anuncia a mensagem e oferece tentar de novo', async () => {
    const repetir = vi.fn()
    render(<EstadoErro mensagem="Não foi possível conectar." onRepetir={repetir} />)

    expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível conectar.')
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(repetir).toHaveBeenCalledOnce()
  })

  it('Esqueleto anuncia o carregamento a leitores de tela', () => {
    render(<Esqueleto rotulo="Carregando avisos" />)

    expect(screen.getByRole('status')).toHaveAccessibleName('Carregando avisos')
  })
})

describe('Tabela', () => {
  it('associa cabeçalhos às células e expõe a legenda', () => {
    render(
      <Tabela
        legenda="Turmas"
        colunas={[
          { chave: 'codigo', titulo: 'Código', celula: (t: { codigo: string; nome: string }) => t.codigo },
          { chave: 'nome', titulo: 'Nome', celula: (t) => t.nome },
        ]}
        linhas={[{ codigo: 'SI-3A', nome: 'Terceiro A' }]}
        chave={(t) => t.codigo}
      />,
    )

    const tabela = screen.getByRole('table', { name: 'Turmas' })
    expect(within(tabela).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Código', 'Nome'])
    expect(within(tabela).getByRole('cell', { name: 'Terceiro A' })).toBeInTheDocument()
  })
})

describe('Paginacao e Busca', () => {
  it('paginação anuncia a faixa e navega', async () => {
    const mudar = vi.fn()
    render(<Paginacao total={45} limit={20} offset={20} onMudar={mudar} />)

    expect(screen.getByText('21–40 de 45')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }))
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }))
    expect(mudar.mock.calls).toEqual([[0], [40]])
  })

  it('na última página não há próxima', () => {
    render(<Paginacao total={45} limit={20} offset={40} onMudar={() => {}} />)

    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled()
  })

  it('busca com rótulo acessível', async () => {
    const mudar = vi.fn()
    render(<Busca rotulo="Buscar turma" valor="" onMudar={mudar} />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar turma' }), 'a')

    expect(mudar).toHaveBeenCalledWith('a')
  })
})

describe('Modal e Confirmacao (RW-39, RW-41)', () => {
  function ComModal() {
    const [aberto, setAberto] = useState(false)
    return (
      <>
        <button onClick={() => setAberto(true)}>Abrir</button>
        {aberto && (
          <Modal titulo="Adicionar destino" onFechar={() => setAberto(false)}>
            <button>Primeiro</button>
            <button>Último</button>
          </Modal>
        )}
      </>
    )
  }

  it('foco preso, Esc fecha e o foco volta à origem', async () => {
    render(<ComModal />)
    const abrir = screen.getByRole('button', { name: 'Abrir' })
    await userEvent.click(abrir)

    const dialogo = screen.getByRole('dialog', { name: 'Adicionar destino' })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    expect(dialogo.contains(document.activeElement)).toBe(true)
    for (let i = 0; i < 5; i++) {
      await userEvent.tab()
      expect(dialogo.contains(document.activeElement)).toBe(true)
    }
    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(abrir).toHaveFocus()
  })

  it('confirmação descreve a consequência e confirma ou cancela', async () => {
    const confirmar = vi.fn()
    const cancelar = vi.fn()
    render(
      <Confirmacao
        titulo="Excluir aviso?"
        consequencia="O aviso some do aplicativo para todos os destinatários."
        acao="Excluir"
        destrutiva
        onConfirmar={confirmar}
        onCancelar={cancelar}
      />,
    )

    const dialogo = screen.getByRole('alertdialog', { name: 'Excluir aviso?' })
    expect(dialogo).toHaveAccessibleDescription('O aviso some do aplicativo para todos os destinatários.')
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect([confirmar.mock.calls.length, cancelar.mock.calls.length]).toEqual([1, 1])
  })
})
