import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { atualizarDadosItemCompra } from '../src/features/shopping/api/shoppingApi'
import { DadosCompraItem } from '../src/features/shopping/components/DadosCompraItem'
import { converterNumeroBrasileiro } from '../src/features/shopping/components/dadosCompraItemValor'
import type { ItemCompraResponse } from '../src/features/shopping/types/shopping'
import { renderApp } from './helpers'

const itemBase: ItemCompraResponse = {
  id: 'item-a', descricao: 'Arroz', quantidade: null, unidadeMedida: null, marca: null, observacoes: null, ordemExibicao: 1,
  status: 'NO_CARRINHO', adicionadoDuranteCompra: false, adicionadoPor: null, adicionadoEm: null, colocadoNoCarrinhoPor: null, colocadoNoCarrinhoEm: null, remocao: null, restauracao: null,
  acoes: { podeColocarNoCarrinho: false, podeRestaurarNoCarrinho: false, podeSolicitarRemocao: true, podeRemoverDiretamente: true, podeDecidirRemocao: false },
}

test('converte preço brasileiro em número para a API sem duplicar R$', () => {
  expect(converterNumeroBrasileiro('27,00', 4)).toBe(27)
  expect(converterNumeroBrasileiro('0,89', 4)).toBe(0.89)
  expect(converterNumeroBrasileiro('27.00', 4)).toBe(27)
  expect(converterNumeroBrasileiro('0', 4)).toBeNull()
})

test('ao informar preço, inicia localmente a quantidade em 1 e apresenta o total devolvido pelo backend', async () => {
  const onSalvar = vi.fn(async () => {})
  const { user, rerender } = renderApp(<DadosCompraItem item={itemBase} disabled={false} podeEditar onSalvar={onSalvar} />)

  await user.click(screen.getByRole('button', { name: 'Informar' }))
  const preco = screen.getByRole('button', { name: 'Preço unitário' })
  expect(screen.queryByRole('textbox', { name: 'Preço unitário' })).not.toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Quantidade comprada' })).toHaveValue('1')
  await user.click(preco)
  expect(screen.getByRole('dialog')).toHaveTextContent('Preço unitário')
  for (const tecla of ['2', '7', ',', '0', '0']) await user.click(screen.getByRole('button', { name: tecla === ',' ? 'Vírgula decimal' : `Número ${tecla}` }))
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(preco).toHaveTextContent(/R\$\s*27,00/)
  expect(onSalvar).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox', { name: 'Quantidade comprada' })).toHaveValue('1')
  await user.click(screen.getByRole('button', { name: 'Salvar dados' }))

  expect(onSalvar).toHaveBeenCalledWith({ precoUnitario: 27, quantidadeComprada: 1 })
  rerender(<DadosCompraItem item={{ ...itemBase, precoUnitario: 27, quantidadeComprada: 2, valorTotal: 54 }} disabled={false} podeEditar onSalvar={onSalvar} />)
  const resumo = screen.getByLabelText('Dados da compra: Arroz')
  expect(resumo).toHaveTextContent(/Preço unitário:\s*R\$\s*27,00/)
  expect(resumo).toHaveTextContent('Quantidade: 2')
  expect(resumo).toHaveTextContent(/Total:\s*R\$\s*54,00/)
})

test('não sobrescreve quantidade previamente informada ao digitar preço', async () => {
  const onSalvar = vi.fn(async () => {})
  const { user } = renderApp(<DadosCompraItem item={itemBase} disabled={false} podeEditar onSalvar={onSalvar} />)

  await user.click(screen.getByRole('button', { name: 'Informar' }))
  const quantidade = screen.getByRole('textbox', { name: 'Quantidade comprada' })
  await user.clear(quantidade)
  await user.type(quantidade, '3')
  await user.click(screen.getByRole('button', { name: 'Preço unitário' }))
  await user.click(screen.getByRole('button', { name: 'Número 1' }))
  await user.click(screen.getByRole('button', { name: 'Número 0' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))

  expect(screen.getByRole('textbox', { name: 'Quantidade comprada' })).toHaveValue('3')
})

test('confirma preço localmente no teclado monetário e permite alterar quantidade', async () => {
  const onSalvar = vi.fn(async () => {})
  const { user } = renderApp(<DadosCompraItem item={{ ...itemBase, precoUnitario: 0.89, quantidadeComprada: 10, valorTotal: 8.9 }} disabled={false} podeEditar onSalvar={onSalvar} />)

  await user.click(screen.getByRole('button', { name: 'Alterar' }))
  await user.click(screen.getByRole('button', { name: 'Diminuir quantidade' }))
  await user.click(screen.getByRole('button', { name: 'Preço unitário' }))
  for (const _ of ['0', ',', '8', '9']) await user.click(screen.getByRole('button', { name: 'Apagar último dígito' }))
  await user.click(screen.getByRole('button', { name: 'Número 0' }))
  await user.click(screen.getByRole('button', { name: 'Vírgula decimal' }))
  await user.click(screen.getByRole('button', { name: 'Número 9' }))
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  expect(onSalvar).not.toHaveBeenCalled()
  await user.click(screen.getByRole('button', { name: 'Salvar dados' }))
  expect(onSalvar).toHaveBeenCalledWith({ precoUnitario: 0.9, quantidadeComprada: 9 })
})

test('fecha o editor pelo ícone sem persistir dados locais', async () => {
  const onSalvar = vi.fn(async () => {})
  const { user } = renderApp(<DadosCompraItem item={itemBase} disabled={false} podeEditar onSalvar={onSalvar} />)

  await user.click(screen.getByRole('button', { name: 'Informar' }))
  expect(screen.getByRole('button', { name: 'Preço unitário' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Cancelar edição' }))
  expect(onSalvar).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Preço unitário' })).not.toBeInTheDocument()
})

test('cancelar o teclado monetário preserva o último preço confirmado', async () => {
  const { user } = renderApp(<DadosCompraItem item={{ ...itemBase, precoUnitario: 10, quantidadeComprada: 1, valorTotal: 10 }} disabled={false} podeEditar onSalvar={vi.fn(async () => {})} />)

  await user.click(screen.getByRole('button', { name: 'Alterar' }))
  const preco = screen.getByRole('button', { name: 'Preço unitário' })
  await user.click(preco)
  await user.click(screen.getByRole('button', { name: 'Apagar último dígito' }))
  await user.click(screen.getByRole('button', { name: 'Número 5' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))

  expect(preco).toHaveTextContent(/R\$\s*10/)
})

test('preserva a quantidade já registrada ao reabrir o editor', async () => {
  const { user } = renderApp(<DadosCompraItem item={{ ...itemBase, quantidadeComprada: 3 }} disabled={false} podeEditar onSalvar={vi.fn(async () => {})} />)

  await user.click(screen.getByRole('button', { name: 'Alterar' }))

  expect(screen.getByRole('textbox', { name: 'Quantidade comprada' })).toHaveValue('3')
})

test('envia o PUT de dados da compra com payload numérico', async () => {
  const fetch = vi.mocked(globalThis.fetch)
  fetch.mockResolvedValueOnce(Response.json({ ...itemBase, precoUnitario: 27, quantidadeComprada: 2, valorTotal: 54 }, { status: 200 }))

  await atualizarDadosItemCompra('token', 'familia', 'lista', 'item', { precoUnitario: 27, quantidadeComprada: 2 })

  expect(fetch).toHaveBeenCalledWith(expect.stringMatching(/familias\/familia\/listas\/lista\/compra\/itens\/item\/dados-compra$/), expect.objectContaining({
    method: 'PUT', body: JSON.stringify({ precoUnitario: 27, quantidadeComprada: 2 }),
  }))
})
