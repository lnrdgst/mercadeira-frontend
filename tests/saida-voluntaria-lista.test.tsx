import { screen, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { Route, Routes } from 'react-router'
import { ListaDetalhePage } from '../src/features/shopping-lists/pages/ListaDetalhePage'
import { renderApp } from './helpers'

type Opcoes = {
  podeSairDaLista?: boolean
  membroAtual?: 'membro-a' | 'membro-b'
  podeGerenciarParticipantes?: boolean
}

function preparar({
  podeSairDaLista = true,
  membroAtual = 'membro-b',
  podeGerenciarParticipantes = false,
}: Opcoes = {}) {
  let saiu = false
  const participantes = [
    { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Ana Souza', papelFamilia: 'ADMINISTRADOR', entrouEm: '2026-09-20T12:00:00Z' },
    { membroFamiliaId: 'membro-b', usuarioId: 'usuario-b', nome: 'Bruno Silva', papelFamilia: 'MEMBRO', entrouEm: '2026-09-20T12:01:00Z' },
    { membroFamiliaId: 'membro-c', usuarioId: 'usuario-c', nome: 'Camila Lima', papelFamilia: 'MEMBRO', entrouEm: '2026-09-20T12:02:00Z' },
  ]
  const http = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    const path = String(input)
    if (path.endsWith('/participantes/membro-b') && options?.method === 'DELETE') {
      saiu = true
      return new Response(null, { status: 204 })
    }
    if (path.endsWith('/participantes')) return Response.json(saiu ? participantes.filter((participante) => participante.membroFamiliaId !== 'membro-b') : participantes)
    if (path.endsWith('/itens')) return Response.json([])
    if (path.endsWith('/listas/lista-a')) return Response.json({
      id: 'lista-a', nome: 'Compras da semana', categoria: 'SUPERMERCADO', estabelecimento: null, status: 'EM_PREPARACAO',
      criadaEm: '2026-09-20T12:00:00Z', atualizadaEm: '2026-09-20T12:00:00Z',
      criador: { membroFamiliaId: 'membro-a', usuarioId: 'usuario-a', nome: 'Ana Souza' },
      contextoUsuario: {
        membroFamiliaId: membroAtual,
        papelFamilia: 'MEMBRO',
        participanteAtivo: membroAtual === 'membro-a' || !saiu,
        podeGerenciarParticipantes,
        podeAlterarItens: !saiu,
        podeEditarDadosBasicos: false,
        podeSairDaLista: membroAtual === 'membro-b' && !saiu && podeSairDaLista,
      },
    })
    throw new Error(`Endpoint inesperado: ${path}`)
  })
  return { ...renderApp(<Routes><Route path="/listas/:listaId" element={<ListaDetalhePage />} /></Routes>, { route: '/listas/lista-a' }), http }
}

test('exibe saída própria como botão compacto, confirma e reconcilia sem F5', async () => {
  const { user, http } = preparar()
  const secao = await screen.findByRole('heading', { name: 'Participantes' }).then((titulo) => titulo.closest('section')!)
  expect(within(secao).getByText('Bruno (você)')).toBeVisible()
  expect(within(secao).queryByRole('button', { name: 'Sair da lista' })).not.toBeInTheDocument()

  const sair = within(secao).getByRole('button', { name: 'Sair da lista como Bruno Silva' })
  expect(sair).toHaveTextContent('×')
  await user.click(sair)
  const dialog = screen.getByRole('dialog', { name: 'Sair desta lista?' })
  expect(dialog).toHaveClass('border-foreground/10', 'bg-foreground/5')
  expect(dialog).toHaveTextContent('um responsável pela lista precisará adicioná-lo novamente')
  expect(http.mock.calls.filter(([, options]) => options?.method === 'DELETE')).toHaveLength(0)
  await user.click(within(dialog).getByRole('button', { name: 'Voltar' }))
  expect(screen.queryByRole('dialog', { name: 'Sair desta lista?' })).not.toBeInTheDocument()

  await user.click(within(secao).getByRole('button', { name: 'Sair da lista como Bruno Silva' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar saída' }))
  expect(await screen.findByRole('status')).toHaveTextContent('Você saiu da lista.')
  expect(http.mock.calls.some(([input, options]) => String(input).endsWith('/participantes/membro-b') && options?.method === 'DELETE')).toBe(true)
  expect(within(secao).queryByText('Bruno (você)')).not.toBeInTheDocument()
  expect(within(secao).queryByRole('button', { name: 'Sair da lista como Bruno Silva' })).not.toBeInTheDocument()
})

test('mantém a ação administrativa distinta e não exibe ação para o criador', async () => {
  const gestor = preparar({ podeSairDaLista: false, podeGerenciarParticipantes: true })
  const secao = await screen.findByRole('heading', { name: 'Participantes' }).then((titulo) => titulo.closest('section')!)
  const removerCamila = within(secao).getByRole('button', { name: 'Remover Camila Lima da lista' })
  expect(removerCamila).toHaveTextContent('×')
  expect(within(secao).queryByRole('button', { name: 'Sair da lista como Bruno Silva' })).not.toBeInTheDocument()
  gestor.unmount()

  const criador = preparar({ membroAtual: 'membro-a' })
  const secaoCriador = await screen.findByRole('heading', { name: 'Participantes' }).then((titulo) => titulo.closest('section')!)
  expect(within(secaoCriador).getByText('Ana · Criador')).toBeVisible()
  expect(within(secaoCriador).queryByRole('button', { name: /Ana Souza/ })).not.toBeInTheDocument()
  criador.unmount()
})
