import { screen, waitFor, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FamiliaSelecionarPage } from '../src/features/family/pages/FamiliaSelecionarPage'
import { familyContextFixture, familyFixture, renderApp } from './helpers'

function preparar() {
  const familiaA = familyFixture({ id: 'familia-a', nome: 'Família A', papel: 'ADMINISTRADOR' })
  const familiaB = familyFixture({ id: 'familia-b', nome: 'Família B', papel: 'MEMBRO' })
  const recarregarFamilias = vi.fn(async () => familiaA)
  const selecionarFamilia = vi.fn()
  const view = renderApp(<FamiliaSelecionarPage />, {
    family: familyContextFixture({
      familias: [familiaA, familiaB],
      familiaSelecionada: familiaA,
      recarregarFamilias,
      selecionarFamilia,
    }),
  })
  return { ...view, familiaA, familiaB, recarregarFamilias, selecionarFamilia }
}

test('mantém as famílias atuais e abre os dois fluxos adicionais', async () => {
  const { familiaA, familiaB, user } = preparar()
  expect(screen.getByRole('button', { name: new RegExp(familiaA.nome) })).toBeVisible()
  expect(screen.getByRole('button', { name: new RegExp(familiaB.nome) })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Criar nova família' }))
  expect(screen.getByRole('dialog', { name: 'Criar nova família' })).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  await user.click(screen.getByRole('button', { name: 'Ingressar com código' }))
  expect(screen.getByRole('dialog', { name: 'Ingressar com código' })).toBeVisible()
})

test('cria família, reconcilia a lista e não muda o contexto selecionado', async () => {
  const { user, recarregarFamilias, selecionarFamilia } = preparar()
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (String(input).endsWith('/familias') && options?.method === 'POST') {
      return Response.json({ ...familyFixture({ id: 'familia-c', nome: 'Família C', papel: 'ADMINISTRADOR' }) })
    }
    throw new Error(`Endpoint inesperado: ${String(input)}`)
  })
  await user.click(screen.getByRole('button', { name: 'Criar nova família' }))
  const dialog = screen.getByRole('dialog', { name: 'Criar nova família' })
  await user.type(within(dialog).getByLabelText('Nome da família'), 'Silva')
  await user.click(within(dialog).getByRole('button', { name: 'Criar família' }))
  await waitFor(() => expect(http).toHaveBeenCalledWith(expect.stringMatching(/\/familias$/), expect.objectContaining({ method: 'POST' })))
  expect(recarregarFamilias).toHaveBeenCalledWith()
  expect(selecionarFamilia).not.toHaveBeenCalled()
  expect(await screen.findByRole('status')).toHaveTextContent('Família "Família C" criada com sucesso.')
})

test('envia solicitação de ingresso sem criar vínculo local', async () => {
  const { user, recarregarFamilias, selecionarFamilia } = preparar()
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (String(input).endsWith('/familias/solicitacoes') && options?.method === 'POST') return Response.json({ id: 'solicitacao-a', status: 'PENDENTE' }, { status: 201 })
    throw new Error(`Endpoint inesperado: ${String(input)}`)
  })
  await user.click(screen.getByRole('button', { name: 'Ingressar com código' }))
  const dialog = screen.getByRole('dialog', { name: 'Ingressar com código' })
  await user.type(within(dialog).getByLabelText('Código de ingresso'), 'ABC123')
  await user.click(within(dialog).getByRole('button', { name: 'Solicitar entrada' }))
  await waitFor(() => expect(http).toHaveBeenCalledWith(expect.stringMatching(/\/familias\/solicitacoes$/), expect.objectContaining({ method: 'POST' })))
  expect(recarregarFamilias).not.toHaveBeenCalled()
  expect(selecionarFamilia).not.toHaveBeenCalled()
  expect(await screen.findByRole('status')).toHaveTextContent('Solicitação enviada. Aguarde a aprovação de um administrador.')
})
