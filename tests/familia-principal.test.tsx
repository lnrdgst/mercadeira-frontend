import { screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { FamiliaPage } from '../src/features/family/pages/FamiliaPage'
import { familyContextFixture, familyFixture, renderApp } from './helpers'

test('permite que um membro defina a família atual como principal', async () => {
  const familia = familyFixture({ principal: false, papel: 'MEMBRO' })
  const recarregarFamilias = vi.fn(async () => ({ ...familia, principal: true }))
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, options) => {
    if (String(input).endsWith(`/familias/${familia.id}/membros`)) return Response.json([])
    if (String(input).endsWith(`/familias/${familia.id}/principal`) && options?.method === 'PUT') {
      return new Response(null, { status: 204 })
    }
    throw new Error(`Endpoint inesperado: ${String(input)}`)
  })

  const { user } = renderApp(<FamiliaPage />, {
    family: familyContextFixture({ familiaSelecionada: familia, familias: [familia], recarregarFamilias }),
  })

  await user.click(screen.getByRole('button', { name: 'Tornar família principal' }))
  expect(screen.getByRole('dialog', { name: 'Tornar família principal' })).toHaveTextContent(
    'Deseja definir "Família A" como sua família principal?',
  )
  expect(fetchMock).not.toHaveBeenCalledWith(
    expect.stringMatching(/\/familias\/familia-a\/principal$/),
    expect.anything(),
  )
  await user.click(screen.getByRole('button', { name: 'Confirmar' }))
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    expect.stringMatching(/\/familias\/familia-a\/principal$/),
    expect.objectContaining({ method: 'PUT' }),
  ))
  expect(recarregarFamilias).toHaveBeenCalledWith(familia.id)
  expect(screen.getByRole('status')).toHaveTextContent('Família definida como principal.')
})

test('mostra o selo âmbar quando a família atual já é principal', () => {
  const familia = familyFixture({ principal: true })
  renderApp(<FamiliaPage />, { family: familyContextFixture({ familiaSelecionada: familia, familias: [familia] }) })
  expect(screen.getByText('Família principal')).toBeVisible()
  expect(screen.queryByRole('button', { name: 'Tornar família principal' })).not.toBeInTheDocument()
})

test('cancelar a confirmação não chama o endpoint', async () => {
  const familia = familyFixture({ principal: false })
  const { user } = renderApp(<FamiliaPage />, {
    family: familyContextFixture({ familiaSelecionada: familia, familias: [familia] }),
  })

  await user.click(screen.getByRole('button', { name: 'Tornar família principal' }))
  await user.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.queryByRole('dialog', { name: 'Tornar família principal' })).not.toBeInTheDocument()
})
