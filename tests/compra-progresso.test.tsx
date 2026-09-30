import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test } from 'vitest'
import { CompraProgresso } from '../src/features/shopping/components/CompraProgresso'
import type { ItemCompraResponse } from '../src/features/shopping/types/shopping'

afterEach(cleanup)

function item(id: number, status: ItemCompraResponse['status'], quantidade = 1) {
  return { id: String(id), status, quantidade } as ItemCompraResponse
}

function renderProgresso(itens: ItemCompraResponse[]) {
  return render(<CompraProgresso itens={itens} />)
}

test('exibe zero resolvidos e nao oferece revisao antes de 100%', () => {
  renderProgresso(Array.from({ length: 10 }, (_, index) => item(index, 'PENDENTE')))
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('0 de 10 itens resolvidos, 0 por cento')
  expect(screen.getByText('0 de 10')).toBeInTheDocument()
  expect(screen.getByText('• 0%')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Revisar' })).not.toBeInTheDocument()
})

test('conta apenas NO_CARRINHO e REMOVIDO como resolvidos', () => {
  renderProgresso([
    item(1, 'NO_CARRINHO'), item(2, 'NO_CARRINHO'), item(3, 'REMOVIDO'),
    item(4, 'PENDENTE'), item(5, 'REMOCAO_SOLICITADA'),
  ])
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('3 de 5 itens resolvidos, 60 por cento')
  expect(screen.getByText('3 de 5')).toBeInTheDocument()
  expect(screen.getByText('• 60%')).toBeInTheDocument()
})

test('quantidade interna nao altera o total de linhas no progresso', () => {
  renderProgresso([item(1, 'NO_CARRINHO', 10), item(2, 'PENDENTE', 4)])
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('1 de 2 itens resolvidos, 50 por cento')
})

test('mostra Revisar em 100 por cento e a revisao e renderizada no portal', async () => {
  const user = userEvent.setup()
  renderProgresso([item(1, 'NO_CARRINHO'), item(2, 'REMOVIDO')])
  expect(screen.getByText('2 de 2')).toBeInTheDocument()
  expect(screen.getByText('• 100%')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Revisar' }))
  const dialog = screen.getByRole('dialog', { name: 'Compra pronta para revisão' })
  expect(dialog.closest('[data-modal-portal]')?.parentElement).toBe(document.body)
  expect(dialog).toHaveTextContent('1 item no carrinho')
  expect(dialog).toHaveTextContent('1 item removido')
  expect(dialog).toHaveTextContent('Nenhum item pendente')
  expect(dialog).toHaveTextContent('Você já pode ir ao caixa.')
})

test('atualiza o progresso quando a colecao recebida muda', () => {
  const { rerender } = renderProgresso([item(1, 'PENDENTE'), item(2, 'PENDENTE')])
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('0 de 2 itens resolvidos, 0 por cento')
  rerender(<CompraProgresso itens={[item(1, 'NO_CARRINHO'), item(2, 'REMOVIDO')]} />)
  expect(screen.getByRole('progressbar')).toHaveAccessibleName('2 de 2 itens resolvidos, 100 por cento')
})
