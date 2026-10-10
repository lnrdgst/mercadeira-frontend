import { screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FamiliaPage } from '../src/features/family/pages/FamiliaPage'
import { familyContextFixture, familyFixture, renderApp } from './helpers'

function preparar(papel: 'ADMINISTRADOR' | 'MEMBRO' = 'ADMINISTRADOR') {
  const familia = familyFixture({ papel, nome: 'Família atual', principal: true })
  const atualizarFamilia = vi.fn()
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    if (String(input).endsWith(`/familias/${familia.id}/membros`)) return Response.json([])
    throw new Error(`Endpoint inesperado: ${String(input)}`)
  })
  const view = renderApp(<FamiliaPage />, {
    family: familyContextFixture({ familiaSelecionada: familia, familias: [familia], atualizarFamilia }),
  })
  return { ...view, familia, atualizarFamilia, fetchMock }
}

test('mostra o lápis somente para administrador e pré-preenche o nome atual', async () => {
  const { user } = preparar()
  await user.click(screen.getByRole('button', { name: 'Alterar nome da família' }))
  const dialogo = screen.getByRole('dialog', { name: 'Alterar nome da família' })
  expect(screen.getByLabelText('Novo nome da família')).toHaveValue('atual')
  expect(dialogo).toHaveTextContent('Família')
  expect(dialogo).toHaveTextContent('Digite abaixo o novo nome da família.')
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  expect(dialogo).toBeVisible()
})

test('membro não vê a ação de alterar nome', () => {
  preparar('MEMBRO')
  expect(screen.queryByRole('button', { name: 'Alterar nome da família' })).not.toBeInTheDocument()
})

test('cancelar não chama a API de renomear', async () => {
  const { user, fetchMock } = preparar()
  await user.click(screen.getByRole('button', { name: 'Alterar nome da família' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog', { name: 'Alterar nome da família' })).not.toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([input, options]) => (
    String(input).endsWith('/familias/familia-a') && options?.method === 'PATCH'
  ))).toBe(false)
})

test('salva o nome normalizado retornado pelo backend e atualiza o contexto', async () => {
  const { user, familia, atualizarFamilia } = preparar()
  const resposta = { ...familia, nome: 'Nome atualizado' }
  vi.mocked(globalThis.fetch).mockImplementation(async (input, options) => {
    if (String(input).endsWith(`/familias/${familia.id}/membros`)) return Response.json([])
    if (String(input).endsWith(`/familias/${familia.id}`) && options?.method === 'PATCH') return Response.json(resposta)
    throw new Error(`Endpoint inesperado: ${String(input)}`)
  })

  await user.click(screen.getByRole('button', { name: 'Alterar nome da família' }))
  await user.clear(screen.getByLabelText('Novo nome da família'))
  await user.type(screen.getByLabelText('Novo nome da família'), '  nome atualizado  ')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))

  await waitFor(() => expect(atualizarFamilia).toHaveBeenCalledWith(resposta))
  const chamadaPatch = vi.mocked(globalThis.fetch).mock.calls.find(([input, options]) => (
    String(input).endsWith(`/familias/${familia.id}`) && options?.method === 'PATCH'
  ))
  expect(chamadaPatch?.[1]?.body).toBe(JSON.stringify({ nome: 'nome atualizado' }))
  expect(screen.queryByRole('dialog', { name: 'Alterar nome da família' })).not.toBeInTheDocument()
})

test('mantém a modal aberta ao receber erro', async () => {
  const { user, familia } = preparar()
  vi.mocked(globalThis.fetch).mockImplementation(async (input, options) => {
    if (String(input).endsWith(`/familias/${familia.id}/membros`)) return Response.json([])
    if (String(input).endsWith(`/familias/${familia.id}`) && options?.method === 'PATCH') {
      return Response.json({ timestamp: '2026-10-10T12:00:00Z', status: 400, erro: 'Requisição inválida', mensagem: 'Nome indisponível.', path: '/api/familias/familia-a' }, { status: 400 })
    }
    throw new Error(`Endpoint inesperado: ${String(input)}`)
  })

  await user.click(screen.getByRole('button', { name: 'Alterar nome da família' }))
  await user.clear(screen.getByLabelText('Novo nome da família'))
  await user.type(screen.getByLabelText('Novo nome da família'), 'Nome em uso')
  await user.click(screen.getByRole('button', { name: 'Salvar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('Nome indisponível.')
  expect(screen.getByRole('dialog', { name: 'Alterar nome da família' })).toBeVisible()
})

test('mantém salvar desabilitado para nome vazio ou somente espaços', async () => {
  const { user } = preparar()
  await user.click(screen.getByRole('button', { name: 'Alterar nome da família' }))
  const campo = screen.getByLabelText('Novo nome da família')
  await user.clear(campo)
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
  await user.type(campo, '   ')
  expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
})

test.each([
  { nome: 'M', habilitado: false },
  { nome: 'MM', habilitado: true },
  { nome: 'Família', habilitado: false },
  { nome: 'Familia', habilitado: false },
  { nome: 'Família Teste', habilitado: false },
  { nome: 'familia teste', habilitado: false },
  { nome: 'Casa', habilitado: true },
])('valida o complemento "$nome" antes de habilitar salvar', async ({ nome, habilitado }) => {
  const { user } = preparar()
  await user.click(screen.getByRole('button', { name: 'Alterar nome da família' }))
  const campo = screen.getByLabelText('Novo nome da família')
  await user.clear(campo)
  await user.type(campo, nome)

  if (habilitado) expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  else expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
})
