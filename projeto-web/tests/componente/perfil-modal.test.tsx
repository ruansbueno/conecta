import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../src/api/erros'
import { AlterarPerfilModal } from '../../src/componentes/usuarios/alterar-perfil-modal'

const ricardo = { id: 'u1', username: 'ricardo.lemos', nome: 'Ricardo Lemos', perfil: 'docente', ativo: true, ultimoLoginEm: null }

function abrir(props: Partial<Parameters<typeof AlterarPerfilModal>[0]> = {}) {
  const onSalvarPerfil = vi.fn().mockResolvedValue(undefined)
  const onMudarSituacao = vi.fn().mockResolvedValue(undefined)
  const onFechar = vi.fn()
  render(
    <AlterarPerfilModal
      usuario={ricardo}
      turmas={4}
      eProprio={false}
      onSalvarPerfil={onSalvarPerfil}
      onMudarSituacao={onMudarSituacao}
      onFechar={onFechar}
      {...props}
    />,
  )
  return { onSalvarPerfil, onMudarSituacao, onFechar, dialogo: screen.getByRole('dialog', { name: 'Alterar perfil de acesso' }) }
}

describe('alterar perfil de acesso (T11, RW-32, RW-33)', () => {
  it('cada perfil diz o que pode fazer; o atual vem marcado e o efeito imediato é explicado', () => {
    const { dialogo } = abrir()
    const grupo = within(dialogo).getByRole('radiogroup', { name: 'Perfil de acesso' })
    expect(within(grupo).getAllByRole('radio')).toHaveLength(4)
    expect(within(grupo).getByRole('radio', { name: 'Administrador' })).toHaveAccessibleDescription(/Gerencia usuários, perfis/)
    expect(within(grupo).getByRole('radio', { name: 'Coordenação' })).toHaveAccessibleDescription(/turmas, vínculos, solicitações e avisos/)
    expect(within(grupo).getByRole('radio', { name: 'Docente' })).toHaveAccessibleDescription(/apenas das turmas em que leciona/)
    expect(within(grupo).getByRole('radio', { name: 'Aluno' })).toHaveAccessibleDescription(/pede inscrição em turmas/)
    expect(within(grupo).getByRole('radio', { name: 'Docente' })).toBeChecked()
    expect(dialogo).toHaveTextContent('A mudança vale já na próxima ação da pessoa, sem precisar sair e entrar de novo.')
    expect(dialogo).toHaveTextContent('ricardo.lemos · vínculo em 4 turmas')
    expect(within(dialogo).getByRole('button', { name: 'Salvar perfil' })).toBeDisabled()
  })

  it('salva o perfil escolhido', async () => {
    const { dialogo, onSalvarPerfil } = abrir()
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Coordenação' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar perfil' }))
    expect(onSalvarPerfil).toHaveBeenCalledWith('coordenacao')
  })

  it('PERFIL_INCOMPATIVEL explica que os vínculos precisam sair antes', async () => {
    const { dialogo } = abrir({ onSalvarPerfil: vi.fn().mockRejectedValue(new ApiError({ code: 'PERFIL_INCOMPATIVEL', status: 409 })) })
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Aluno' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar perfil' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent(
      'Esta pessoa tem vínculos com turmas que não combinam com o novo perfil. Remova os vínculos na página da turma antes de mudar o perfil.',
    )
    expect(within(dialogo).getByRole('radio', { name: 'Aluno' })).toBeChecked()
  })

  it('422 do último administrador', async () => {
    const admin = { ...ricardo, perfil: 'administrador' }
    const { dialogo } = abrir({
      usuario: admin,
      onSalvarPerfil: vi
        .fn()
        .mockRejectedValue(new ApiError({ code: 'VALIDATION_ERROR', status: 422, errors: [{ campo: 'perfil', mensagem: 'x' }] })),
    })
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Coordenação' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar perfil' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('É preciso manter ao menos um administrador ativo.')
  })

  it('desativar pede confirmação com a consequência e então desativa', async () => {
    const { dialogo, onMudarSituacao } = abrir()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar usuário' }))

    expect(dialogo).toHaveTextContent(/perde o acesso na hora/)
    expect(onMudarSituacao).not.toHaveBeenCalled()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Confirmar desativação' }))
    expect(onMudarSituacao).toHaveBeenCalledWith(false)
  })

  it('o foco fica dentro do modal ao entrar e sair da confirmação de desativar (RW-39)', async () => {
    const { dialogo } = abrir()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Desativar usuário' }))
    expect(within(dialogo).getByRole('button', { name: 'Confirmar desativação' })).toHaveFocus()

    await userEvent.click(within(dialogo).getByRole('button', { name: 'Voltar' }))
    expect(within(dialogo).getByRole('button', { name: 'Desativar usuário' })).toHaveFocus()
  })

  it('inativo: reativar vai direto', async () => {
    const { dialogo, onMudarSituacao } = abrir({ usuario: { ...ricardo, ativo: false } })
    expect(within(dialogo).queryByRole('button', { name: 'Desativar usuário' })).not.toBeInTheDocument()
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Reativar usuário' }))
    expect(onMudarSituacao).toHaveBeenCalledWith(true)
  })

  it('a própria conta não tem a opção de desativar, e explica por quê', () => {
    const { dialogo } = abrir({ eProprio: true })
    expect(within(dialogo).queryByRole('button', { name: 'Desativar usuário' })).not.toBeInTheDocument()
    expect(dialogo).toHaveTextContent('Você não pode desativar a sua própria conta.')
  })

  it('a própria conta, saindo da administração: avisa o que muda, conforme o novo perfil', async () => {
    const { dialogo } = abrir({ eProprio: true, usuario: { ...ricardo, perfil: 'administrador' } })
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Coordenação' }))
    expect(dialogo).toHaveTextContent('Você vai deixar a administração: depois de salvar, não poderá mais alterar perfis.')
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Docente' }))
    expect(dialogo).toHaveTextContent('Você vai deixar a administração: depois de salvar, perde o acesso a esta tela.')
  })

  it('durante o envio, não dá para cancelar nem fechar', async () => {
    const { dialogo, onFechar } = abrir({ onSalvarPerfil: vi.fn(() => new Promise<void>(() => undefined)) })
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Coordenação' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar perfil' }))
    expect(within(dialogo).getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(onFechar).not.toHaveBeenCalled()
  })

  it('422 de outro campo cai na mensagem geral, não na do último administrador', async () => {
    const { dialogo } = abrir({
      onSalvarPerfil: vi
        .fn()
        .mockRejectedValue(new ApiError({ code: 'VALIDATION_ERROR', status: 422, errors: [{ campo: 'outro', mensagem: 'x' }] })),
    })
    await userEvent.click(within(dialogo).getByRole('radio', { name: 'Coordenação' }))
    await userEvent.click(within(dialogo).getByRole('button', { name: 'Salvar perfil' }))
    expect(await within(dialogo).findByRole('alert')).toHaveTextContent('Confira os campos destacados.')
  })
})
