import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, test } from 'vitest'
import { Modal } from '../src/shared/components/Modal'

function Example() {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)}>Abrir</button>
    <Modal open={open} onClose={() => setOpen(false)} ariaLabel="Exemplo">
      <p>Conteúdo do modal</p>
    </Modal>
  </>
}

test('monta backdrop e painel no portal do body e remove ambos ao fechar', () => {
  render(<Example />)
  fireEvent.click(screen.getByRole('button', { name: 'Abrir' }))

  const dialog = screen.getByRole('dialog', { name: 'Exemplo' })
  const portal = dialog.closest('[data-modal-portal]')
  expect(portal).toBeInTheDocument()
  expect(portal?.parentElement).toBe(document.body)
  expect(screen.getByText('Conteúdo do modal')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Fechar modal' })).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: 'Fechar modal' }))
  expect(screen.queryByRole('dialog', { name: 'Exemplo' })).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Fechar modal' })).not.toBeInTheDocument()
})
