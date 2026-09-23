import { screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { renderApp } from './helpers'

const participantes = [
  { membroFamiliaId: 'membro-b', usuarioId: 'usuario-b', nome: 'Bruno Silva', papelFamilia: 'MEMBRO', entrouEm: '2026-09-20T12:00:00Z' },
  { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Ana Souza', papelFamilia: 'ADMINISTRADOR', entrouEm: '2026-09-19T12:00:00Z' },
]

function preparar(participanteAtivo = true) {
  const atuais = [...participantes]
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (path.endsWith('/membros')) return Response.json([
      { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Ana Souza', email: 'ana@example.test', papel: 'ADMINISTRADOR' },
      { membroFamiliaId: 'membro-b', usuarioId: 'usuario-b', nome: 'Bruno Silva', email: 'bruno@example.test', papel: 'MEMBRO' },
      { membroFamiliaId: 'membro-c', usuarioId: 'usuario-c', nome: 'Camila Silva', email: 'camila@example.test', papel: 'MEMBRO' },
    ])
    if (path.endsWith('/participantes') && options?.method === 'POST') {
      const { membroFamiliaId } = JSON.parse(String(options.body))
      if (!atuais.some((participante) => participante.membroFamiliaId === membroFamiliaId)) atuais.push({ membroFamiliaId, usuarioId: 'usuario-c', nome: 'Camila Silva', papelFamilia: 'MEMBRO', entrouEm: '2026-09-21T12:00:00Z' })
      return new Response(null, { status: 204 })
    }
    if (/\/participantes\/membro-b$/.test(path) && options?.method === 'DELETE') {
      atuais.splice(atuais.findIndex((participante) => participante.membroFamiliaId === 'membro-b'), 1)
      return new Response(null, { status: 204 })
    }
    if (path.endsWith('/participantes')) return Response.json(atuais)
    if (path.endsWith('/itens')) return Response.json([])
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Compras da semana', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_PREPARACAO',
      criadaEm: '2026-09-20T12:00:00Z', atualizadaEm: '2026-09-20T12:00:00Z',
      criador: { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Ana Souza' },
      contextoUsuario: { membroFamiliaId: 'membro-c', papelFamilia: 'MEMBRO', participanteAtivo, podeGerenciarParticipantes: true, podeAlterarItens: false, podeEditarDadosBasicos: false, podeSairDaLista: false },
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  return { ...renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' }), fetchMock }
}

function secaoParticipantes() {
  return screen.getByRole('heading', { name: 'Participantes' }).closest('section')!
}

test('mantém criador primeiro, remove participantes pela ação compacta e nunca oferece remoção ao criador', async () => {
  const { user, fetchMock } = preparar()
  const secao = await screen.findByRole('heading', { name: 'Participantes' }).then(() => secaoParticipantes())
  const lista = within(secao).getByRole('list')
  expect(within(lista).getAllByRole('listitem')[0]).toHaveTextContent('Ana · Criador')
  expect(within(lista).getByTitle('Ana Souza')).toHaveTextContent('Ana · Criador')
  expect(within(lista).queryByRole('button', { name: 'Remover Ana Souza da lista' })).not.toBeInTheDocument()
  await user.click(within(lista).getByRole('button', { name: 'Remover Bruno Silva da lista' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Participante removido.')
  expect(fetchMock.mock.calls.some(([input, options]) => String(input).endsWith('/participantes/membro-b') && options?.method === 'DELETE')).toBe(true)
})

test('adiciona participante por diálogo e preserva a ação de participar conforme capability', async () => {
  const { user, fetchMock } = preparar(false)
  await screen.findByRole('heading', { name: 'Participantes' })
  await screen.findByRole('button', { name: 'Adicionar' })
  const secao = secaoParticipantes()
  expect(within(secao).getByRole('button', { name: 'Participar desta lista' })).toBeVisible()
  await user.click(within(secao).getByRole('button', { name: 'Adicionar' }))
  const dialog = screen.getByRole('dialog', { name: 'Adicionar participante' })
  await user.selectOptions(within(dialog).getByLabelText('Participante'), 'membro-c')
  await user.click(within(dialog).getByRole('button', { name: 'Adicionar' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Participante adicionado.')
  expect(screen.queryByRole('dialog', { name: 'Adicionar participante' })).not.toBeInTheDocument()
  const chamada = fetchMock.mock.calls.find(([input, options]) => String(input).endsWith('/participantes') && options?.method === 'POST')
  expect(JSON.parse(String(chamada?.[1]?.body))).toEqual({ membroFamiliaId: 'membro-c' })
})
