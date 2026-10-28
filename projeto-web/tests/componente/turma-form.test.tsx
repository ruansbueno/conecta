import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import { FormTurma } from '../../src/componentes/turmas/form-turma'

function abrir(onSalvar = vi.fn().mockResolvedValue(undefined), inicial?: Parameters<typeof FormTurma>[0]['inicial']) {
  const onFechar = vi.fn()
  render(<FormTurma inicial={inicial} onSalvar={onSalvar} onFechar={onFechar} />)
  return { onSalvar, onFechar }
}

async function preencher() {
  await userEvent.type(screen.getByLabelText('Código'), 'SI-3A')
  await userEvent.type(screen.getByLabelText('Nome'), 'Sistemas para Internet 3A')
  await userEvent.selectOptions(screen.getByLabelText('Semestre do curso'), '3º')
  await userEvent.type(screen.getByLabelText('Período letivo'), '2026/2')
}

const salvar = (nome = 'Criar turma') => userEvent.click(screen.getByRole('button', { name: nome }))

describe('formulário de turma (T07, RW-24)', () => {
  it('cria com os dados do formulário', async () => {
    const { onSalvar } = abrir()
    expect(screen.getByRole('dialog', { name: 'Nova turma' })).toBeInTheDocument()
    await preencher()
    await userEvent.click(screen.getByRole('checkbox', { name: /Inscrições abertas/ }))

    await salvar()

    expect(onSalvar).toHaveBeenCalledWith({
      codigo: 'SI-3A',
      nome: 'Sistemas para Internet 3A',
      semestreCurso: 3,
      periodoLetivo: '2026/2',
      inscricoesAbertas: true,
    })
  })

  it('valida antes de enviar: campos marcados e foco no primeiro erro', async () => {
    const { onSalvar } = abrir()
    await userEvent.type(screen.getByLabelText('Período letivo'), '2026/3')

    await salvar()

    expect(onSalvar).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Código')).toHaveAccessibleDescription('Informe o código da turma.')
    expect(screen.getByLabelText('Período letivo')).toHaveAccessibleDescription(/formato AAAA\/N/)
    expect(screen.getByLabelText('Código')).toHaveFocus()
  })

  it('código duplicado marca o campo código e mantém o digitado', async () => {
    abrir(vi.fn().mockRejectedValue(new ApiError({ code: 'CODIGO_TURMA_DUPLICADO', status: 409 })))
    await preencher()

    await salvar()

    expect(await screen.findByText('Já existe uma turma com este código.')).toBeInTheDocument()
    expect(screen.getByLabelText('Código')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Nome')).toHaveValue('Sistemas para Internet 3A')
  })

  it('422 da API marca o campo pelo nome do contrato', async () => {
    abrir(
      vi.fn().mockRejectedValue(
        new ApiError({ code: 'VALIDATION_ERROR', status: 422, errors: [{ campo: 'periodo_letivo', mensagem: 'período inválido' }] }),
      ),
    )
    await preencher()

    await salvar()

    expect(await screen.findByText('período inválido')).toBeInTheDocument()
    expect(screen.getByLabelText('Período letivo')).toHaveAttribute('aria-invalid', 'true')
  })

  it('falha de rede avisa e não fecha', async () => {
    const { onFechar } = abrir(vi.fn().mockRejectedValue(new ApiError({ code: 'SEM_REDE' })))
    await preencher()

    await salvar()

    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível conectar/)
    expect(onFechar).not.toHaveBeenCalled()
  })

  it('edição abre preenchida e salva', async () => {
    const { onSalvar } = abrir(undefined, {
      codigo: 'SI-3A',
      nome: 'Sistemas 3A',
      semestreCurso: 3,
      periodoLetivo: '2026/2',
      inscricoesAbertas: false,
    })
    expect(screen.getByRole('dialog', { name: 'Editar turma' })).toBeInTheDocument()
    expect(screen.getByLabelText('Semestre do curso')).toHaveValue('3')
    await userEvent.clear(screen.getByLabelText('Nome'))
    await userEvent.type(screen.getByLabelText('Nome'), 'Sistemas para Internet 3A')

    await salvar('Salvar alterações')

    expect(onSalvar).toHaveBeenCalledWith(expect.objectContaining({ nome: 'Sistemas para Internet 3A' }))
  })
})
