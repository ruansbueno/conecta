import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { erro, pagina } from '../fixtures'
import { abrirGrade, apiHorarios, BD, CAMINHO, HELENA, RICARDO } from './apoio-horarios'

afterEach(() => vi.unstubAllGlobals())

const salvo = (h: object) => ({ status: 201, corpo: { horario: h, conflitos: [] } })

describe('modal de aula (T13, plan-f2 D-F2-9)', () => {
  it('Nova aula: campos vazios, docente entre os de perfil docente; salvar cria e recarrega a grade', async () => {
    const chamadas = apiHorarios({ [`POST ${CAMINHO}`]: (_q, corpo) => salvo({ ...BD, ...(corpo as object) }) })
    await abrirGrade()
    await userEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    const modal = screen.getByRole('dialog', { name: 'Nova aula' })
    const docente = within(modal).getByLabelText('Docente')
    expect(within(docente).getAllByRole('option').map((o) => o.textContent)).toEqual(['Sem docente', 'Helena Prado', 'Ricardo Lemos'])
    expect(chamadas.find((c) => c.chave === 'GET /gestao/usuarios')!.query.get('perfil')).toBe('docente')

    await userEvent.selectOptions(within(modal).getByLabelText('Dia'), '3')
    await userEvent.type(within(modal).getByLabelText('Início'), '19:10')
    await userEvent.type(within(modal).getByLabelText('Fim'), '20:50')
    await userEvent.type(within(modal).getByLabelText('Disciplina'), ' Banco de Dados II ')
    await userEvent.type(within(modal).getByLabelText(/local/i), 'Lab 4')
    await userEvent.selectOptions(docente, RICARDO.id)
    const antes = chamadas.filter((c) => c.chave === `GET ${CAMINHO}`).length
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas.find((c) => c.chave === `POST ${CAMINHO}`)!.corpo).toEqual({
      dia_semana: 3,
      inicio: '19:10',
      fim: '20:50',
      disciplina: 'Banco de Dados II',
      local: 'Lab 4',
      docente_id: RICARDO.id,
    })
    expect(chamadas.filter((c) => c.chave === `GET ${CAMINHO}`).length).toBe(antes + 1)
    expect(await screen.findByRole('status')).toHaveTextContent('Aula salva.')
  })

  it('célula vazia abre a nova aula com o dia e o início da linha', async () => {
    apiHorarios()
    const tabela = await abrirGrade()
    await userEvent.click(within(tabela).getByRole('button', { name: 'Adicionar aula na quarta às 19:10' }))
    const modal = screen.getByRole('dialog', { name: 'Nova aula' })
    expect(within(modal).getByLabelText('Dia')).toHaveValue('3')
    expect(within(modal).getByLabelText('Início')).toHaveValue('19:10')
    expect(within(modal).getByLabelText('Fim')).toHaveValue('')
  })

  it('validação local antes do envio, com o foco no primeiro campo com erro, na ordem da modal', async () => {
    const chamadas = apiHorarios()
    await abrirGrade()
    await userEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Início'), '19:10')
    await userEvent.type(within(modal).getByLabelText('Fim'), '19:00')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))
    expect(within(modal).getByLabelText('Fim')).toHaveFocus()
    expect(within(modal).getByLabelText('Disciplina')).toHaveAccessibleDescription('Informe a disciplina.')
    expect(within(modal).getByLabelText('Fim')).toHaveAccessibleDescription('O fim precisa ser depois do início.')
    expect(chamadas.some((c) => c.chave === `POST ${CAMINHO}`)).toBe(false)
  })

  it('cartão abre a edição; o PATCH leva só o que mudou', async () => {
    const chamadas = apiHorarios({
      [`PATCH ${CAMINHO}/${BD.id}`]: (_q, corpo) => ({ status: 200, corpo: { horario: { ...BD, ...(corpo as object) }, conflitos: [] } }),
    })
    const tabela = await abrirGrade()
    await userEvent.click(within(tabela).getByRole('button', { name: /banco de dados ii/i }))
    const modal = screen.getByRole('dialog', { name: 'Editar aula' })
    expect(within(modal).getByLabelText('Docente')).toHaveValue(HELENA.id)
    const local = within(modal).getByLabelText(/local/i)
    await userEvent.clear(local)
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(chamadas.find((c) => c.chave.startsWith('PATCH'))!.corpo).toEqual({ local: null })
  })

  it('sem nenhuma mudança, não chama a API e avisa', async () => {
    const chamadas = apiHorarios()
    const tabela = await abrirGrade()
    await userEvent.click(within(tabela).getByRole('button', { name: /banco de dados ii/i }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Salvar aula' }))
    expect(within(screen.getByRole('dialog')).getByRole('status')).toHaveTextContent('Nenhuma alteração para salvar.')
    expect(chamadas.some((c) => c.chave.startsWith('PATCH'))).toBe(false)
  })

  it('422 marca o campo indicado pela API, e nada digitado se perde', async () => {
    apiHorarios({
      [`POST ${CAMINHO}`]: {
        status: 422,
        corpo: erro('VALIDATION_ERROR', 'x', [{ campo: 'body.local', mensagem: 'Local não pode ser só espaços.' }]),
      },
    })
    await abrirGrade()
    await userEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Início'), '19:10')
    await userEvent.type(within(modal).getByLabelText('Fim'), '20:00')
    await userEvent.type(within(modal).getByLabelText('Disciplina'), 'Redes')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))
    expect(await within(modal).findByText('Local não pode ser só espaços.')).toBeInTheDocument()
    expect(within(modal).getByLabelText(/local/i)).toHaveAttribute('aria-invalid', 'true')
    expect(within(modal).getByLabelText('Disciplina')).toHaveValue('Redes')
  })

  it('409 PERFIL_INCOMPATIVEL marca o docente e recarrega a lista de docentes', async () => {
    let docentes = 0
    apiHorarios({
      [`POST ${CAMINHO}`]: { status: 409, corpo: erro('PERFIL_INCOMPATIVEL') },
      'GET /gestao/usuarios': () => {
        docentes++
        return { status: 200, corpo: pagina([]) }
      },
    })
    await abrirGrade()
    await userEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Início'), '19:10')
    await userEvent.type(within(modal).getByLabelText('Fim'), '20:00')
    await userEvent.type(within(modal).getByLabelText('Disciplina'), 'Redes')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))
    expect(await within(modal).findByText('Esta pessoa não tem mais o perfil docente. Escolha outra.')).toBeInTheDocument()
    expect(within(modal).getByLabelText('Docente')).toHaveAttribute('aria-invalid', 'true')
    expect(docentes).toBe(2)
  })

  it('sem rede: alerta na modal, que continua aberta com o que foi digitado', async () => {
    apiHorarios({ [`POST ${CAMINHO}`]: { status: 0, rede: true } })
    await abrirGrade()
    await userEvent.click(screen.getByRole('button', { name: 'Nova aula' }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Início'), '19:10')
    await userEvent.type(within(modal).getByLabelText('Fim'), '20:00')
    await userEvent.type(within(modal).getByLabelText('Disciplina'), 'Redes')
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))
    expect(await within(modal).findByRole('alert')).toBeInTheDocument()
    expect(within(modal).getByLabelText('Disciplina')).toHaveValue('Redes')
  })

  it('remover pede confirmação, apaga e recarrega a grade', async () => {
    const chamadas = apiHorarios({ [`DELETE ${CAMINHO}/${BD.id}`]: { status: 204 } })
    const tabela = await abrirGrade()
    await userEvent.click(within(tabela).getByRole('button', { name: /banco de dados ii/i }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remover aula' }))
    const confirmacao = screen.getByRole('alertdialog', { name: 'Remover esta aula?' })
    expect(confirmacao).toHaveAccessibleDescription(/não fica no histórico/i)
    await userEvent.click(within(confirmacao).getByRole('button', { name: 'Remover' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(chamadas.some((c) => c.chave === `DELETE ${CAMINHO}/${BD.id}`)).toBe(true)
    expect(await screen.findByRole('status')).toHaveTextContent('Aula removida.')
  })

  it('aula que já não existe: fecha a modal, mostra o erro e recarrega a grade', async () => {
    const chamadas = apiHorarios({ [`PATCH ${CAMINHO}/${BD.id}`]: { status: 404, corpo: erro('HORARIO_NAO_ENCONTRADO') } })
    const tabela = await abrirGrade()
    await userEvent.click(within(tabela).getByRole('button', { name: /banco de dados ii/i }))
    const modal = screen.getByRole('dialog')
    await userEvent.type(within(modal).getByLabelText('Disciplina'), ' 2')
    const antes = chamadas.filter((c) => c.chave === `GET ${CAMINHO}`).length
    await userEvent.click(within(modal).getByRole('button', { name: 'Salvar aula' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta aula não está mais na grade.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await waitFor(() => expect(chamadas.filter((c) => c.chave === `GET ${CAMINHO}`).length).toBe(antes + 1))
  })
})
