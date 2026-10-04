import { expect, test, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { TecladoMonetario } from '../src/features/shopping/components/TecladoMonetario'
import { converterValorMonetario } from '../src/features/shopping/components/valorMonetario'
import { renderApp } from './helpers'

test('digita valor explícito com vírgula e limita duas casas decimais', async () => {
  let valor = ''
  const atualizar = vi.fn((novo: string) => { valor = novo; view.rerender(<TecladoMonetario valor={valor} onAlterar={atualizar} onConfirmar={vi.fn()} />) })
  const view = renderApp(<TecladoMonetario valor={valor} onAlterar={atualizar} onConfirmar={vi.fn()} />)

  for (const tecla of ['3', '7', ',', '5', '3', '9']) await view.user.click(screen.getByRole('button', { name: tecla === ',' ? 'Vírgula decimal' : `Número ${tecla}` }))

  expect(screen.getByLabelText('Valor informado')).toHaveTextContent('R$ 37,53')
  expect(converterValorMonetario(valor)).toBe(37.53)
})

test('trata vírgula inicial, segunda vírgula, backspace e zero', async () => {
  let valor = ''
  const atualizar = vi.fn((novo: string) => { valor = novo; view.rerender(<TecladoMonetario valor={valor} onAlterar={atualizar} onConfirmar={vi.fn()} />) })
  const view = renderApp(<TecladoMonetario valor={valor} onAlterar={atualizar} onConfirmar={vi.fn()} />)

  await view.user.click(screen.getByRole('button', { name: 'Vírgula decimal' }))
  await view.user.click(screen.getByRole('button', { name: 'Vírgula decimal' }))
  await view.user.click(screen.getByRole('button', { name: 'Número 1' }))
  expect(screen.getByLabelText('Valor informado')).toHaveTextContent('R$ 0,1')
  await view.user.click(screen.getByRole('button', { name: 'Apagar último dígito' }))
  await view.user.click(screen.getByRole('button', { name: 'Apagar último dígito' }))
  expect(screen.getByLabelText('Valor informado')).toHaveTextContent('R$ 0')
  expect(converterValorMonetario('0')).toBeNull()
  expect(converterValorMonetario('0,01')).toBe(0.01)
})

test('aceita ponto, backspace e enter no teclado físico', async () => {
  let valor = ''
  const confirmar = vi.fn()
  const atualizar = vi.fn((novo: string) => { valor = novo; view.rerender(<TecladoMonetario valor={valor} onAlterar={atualizar} onConfirmar={confirmar} />) })
  const view = renderApp(<TecladoMonetario valor={valor} onAlterar={atualizar} onConfirmar={confirmar} />)
  for (const tecla of ['3', '7', '.', '5']) {
    await view.user.click(screen.getByLabelText('Teclado monetário'))
    await view.user.keyboard(tecla)
  }
  expect(screen.getByLabelText('Valor informado')).toHaveTextContent('R$ 37,5')
  for (const tecla of ['{Backspace}', '3', '{Enter}']) {
    await view.user.click(screen.getByLabelText('Teclado monetário'))
    await view.user.keyboard(tecla)
  }
  expect(confirmar).toHaveBeenCalledOnce()
})
