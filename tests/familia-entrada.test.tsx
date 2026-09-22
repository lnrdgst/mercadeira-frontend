import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FamiliaEntradaPage } from '../src/features/family/pages/FamiliaEntradaPage'
import { renderApp } from './helpers'

async function abrirCadastro() {
  const user = renderApp(<FamiliaEntradaPage />).user
  await user.click(await screen.findByRole('button', { name: 'Cadastrar uma família' }))
  return user
}

async function abrirEntrada() {
  const user = renderApp(<FamiliaEntradaPage />).user
  await user.click(await screen.findByRole('button', { name: 'Entrar em uma família' }))
  return user
}

test('exige ao menos dois caracteres úteis para cadastrar uma família', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
  const user = await abrirCadastro()
  const nome = screen.getByLabelText('Nome da família')
  const cadastrar = screen.getByRole('button', { name: 'Cadastrar família' })

  expect(cadastrar).toBeDisabled()
  await user.type(nome, ' ')
  expect(cadastrar).toBeDisabled()
  await user.type(nome, 'S')
  expect(cadastrar).toBeDisabled()
  await user.type(nome, 'i')
  expect(cadastrar).toBeEnabled()
})

test('orienta a digitar somente o nome, sem repetir Família', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
  const user = await abrirCadastro()
  const nome = screen.getByLabelText('Nome da família')
  const cadastrar = screen.getByRole('button', { name: 'Cadastrar família' })

  expect(screen.getByText(/Digite apenas o nome, sem a palavra/)).toBeInTheDocument()
  await user.type(nome, 'Família Silva')
  expect(cadastrar).toBeDisabled()
})

test('substitui erro técnico de nome por mensagem orientada ao usuário', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, options) => {
    if (options?.method === 'POST') {
      return Response.json({
        timestamp: '2026-09-22T17:00:00Z',
        status: 400,
        erro: 'REQUISICAO_INVALIDA',
        mensagem: 'Payload inválido.',
        path: '/api/familias',
      }, { status: 400 })
    }
    return Response.json([])
  })
  const user = await abrirCadastro()
  await user.type(screen.getByLabelText('Nome da família'), 'Silva')
  await user.click(screen.getByRole('button', { name: 'Cadastrar família' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Ops! Parece que você não digitou um nome válido. Por favor, tente novamente.',
  )
})

test('exige código de ingresso útil antes de permitir a solicitação', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json([]))
  const user = await abrirEntrada()
  const codigo = screen.getByLabelText('Código de ingresso')
  const solicitar = screen.getByRole('button', { name: 'Solicitar entrada' })

  expect(solicitar).toBeDisabled()
  await user.type(codigo, ' ')
  expect(solicitar).toBeDisabled()
  await user.type(codigo, 'ABC123')
  expect(solicitar).toBeEnabled()
})

test('substitui erro técnico de código por mensagem orientada ao usuário', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, options) => {
    if (options?.method === 'POST') {
      return Response.json({
        timestamp: '2026-09-22T17:00:00Z',
        status: 400,
        erro: 'REQUISICAO_INVALIDA',
        mensagem: 'Requisição inválida.',
        path: '/api/familias/solicitacoes',
      }, { status: 400 })
    }
    return Response.json([])
  })
  const user = await abrirEntrada()
  await user.type(screen.getByLabelText('Código de ingresso'), 'INVALIDO')
  await user.click(screen.getByRole('button', { name: 'Solicitar entrada' }))

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Ops! Parece que o código digitado não é válido. Por favor tente novamente.',
  )
})
