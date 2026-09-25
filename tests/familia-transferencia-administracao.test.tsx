import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { FamiliaPage } from '../src/features/family/pages/FamiliaPage'
import { familyContextFixture, familyFixture, renderApp } from './helpers'

const showModalOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const closeOriginal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  if (showModalOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', showModalOriginal)
  if (closeOriginal) Object.defineProperty(HTMLDialogElement.prototype, 'close', closeOriginal)
  vi.unstubAllGlobals()
})

function membros(podeTransferir = true, podeRemover = true) {
  return [
    { membroFamiliaId: 'ana', usuarioId: 'usuario-a', nome: 'Ana', email: 'ana@example.test', papel: 'ADMINISTRADOR', usuarioAtual: true, acoes: { podeTransferirAdministracao: false, podeRemoverIntegrante: false } },
    { membroFamiliaId: 'bia', usuarioId: 'usuario-b', nome: 'Bia', email: 'bia@example.test', papel: 'MEMBRO', usuarioAtual: false, acoes: { podeTransferirAdministracao: podeTransferir, podeRemoverIntegrante: podeRemover } },
  ]
}

test('administrador confirma transferência somente com o código exibido', async () => {
  let chamadasTransferencia = 0
  let urlTransferencia = ''
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('transferir-administracao')) { chamadasTransferencia += 1; urlTransferencia = path; return new Response(null, { status: 204 }) }
    if (path.includes('/membros')) return Response.json(membros())
    if (path.endsWith('/familias')) return Response.json([familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })])
    if (path.includes('/solicitacoes')) return Response.json([])
    return Response.json([])
  })
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })
  const { user } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await user.click(await screen.findByRole('button', { name: 'Transferir administração' }))
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Transferir administração?' })).toBeVisible())
  const dialog = screen.getByRole('dialog', { name: 'Transferir administração?' })
  expect(within(dialog).getByText('1000')).toBeInTheDocument()
  const confirmar = within(dialog).getByRole('button', { name: 'Confirmar transferência' })
  expect(confirmar).toBeDisabled()
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '9999')
  expect(confirmar).toBeDisabled()
  await user.clear(within(dialog).getByLabelText('Código de confirmação'))
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(confirmar)
  await waitFor(() => expect(chamadasTransferencia).toBe(1))
  expect(urlTransferencia).toContain('/membros/bia/transferir-administracao')
})

test('confirmação permanece aberta após o ciclo assíncrono normal da página', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('/membros')) return Response.json(membros())
    if (path.includes('/solicitacoes')) return Response.json([])
    return Response.json([])
  })
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })
  const { user } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await user.click(await screen.findByRole('button', { name: 'Transferir administração' }))
  await waitFor(() => expect(screen.getByRole('dialog', { name: 'Transferir administração?' })).toBeVisible())
  await act(async () => { window.dispatchEvent(new Event('focus')); await Promise.resolve() })
  expect(screen.getByText('1000')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Confirmar transferência' })).toBeDisabled()
})

test('mobile usa teclado interno sem input nativo e limita o código a quatro dígitos', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  let chamadasTransferencia = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('transferir-administracao')) { chamadasTransferencia += 1; return new Response(null, { status: 204 }) }
    if (path.includes('/membros')) return Response.json(membros())
    if (path.includes('/solicitacoes')) return Response.json([])
    if (path.endsWith('/familias')) return Response.json([familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })])
    return Response.json([])
  })
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })
  const { user } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await user.click(await screen.findByRole('button', { name: 'Transferir administração' }))
  const dialog = screen.getByRole('dialog', { name: 'Transferir administração?' })
  expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: '1' }))
  await user.click(within(dialog).getByRole('button', { name: '0' }))
  await user.click(within(dialog).getByRole('button', { name: '0' }))
  await user.click(within(dialog).getByRole('button', { name: '0' }))
  await user.click(within(dialog).getByRole('button', { name: '9' }))
  expect(within(dialog).getByLabelText('4 de 4 dígitos informados')).toHaveTextContent('1000')
  expect(within(dialog).getByRole('button', { name: 'Confirmar transferência' })).toBeEnabled()
  await user.click(within(dialog).getByRole('button', { name: 'Apagar último dígito' }))
  expect(within(dialog).getByLabelText('3 de 4 dígitos informados')).toBeInTheDocument()
  await user.click(within(dialog).getByRole('button', { name: '0' }))
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar transferência' }))
  await waitFor(() => expect(chamadasTransferencia).toBe(1))
})

test('membro comum e o próprio administrador não recebem ação de transferência', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const path = String(input)
    if (path.includes('/membros')) return Response.json(membros(false))
    return Response.json([])
  })
  renderApp(<FamiliaPage />)
  await screen.findByText('Ana')
  expect(screen.queryByRole('button', { name: 'Transferir administração' })).not.toBeInTheDocument()
})

test('integrante com capability de saída confirma a própria saída pelo endpoint explícito', async () => {
  let chamadasSaida = 0
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input)
    if (path.endsWith('/membros/me') && init?.method === 'DELETE') { chamadasSaida += 1; return new Response(null, { status: 204 }) }
    if (path.includes('/membros')) return Response.json(membros())
    if (path.endsWith('/familias')) return Response.json([])
    if (path.includes('/solicitacoes')) return Response.json([])
    return Response.json([])
  })
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true, podeSairDaFamilia: true } })
  const { user, family } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await user.click(await screen.findByRole('button', { name: 'Sair da família' }))
  const dialog = screen.getByRole('dialog', { name: 'Sair desta família?' })
  expect(chamadasSaida).toBe(0)
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar saída' }))
  await waitFor(() => expect(chamadasSaida).toBe(1))
  expect(family.recarregarFamilias).toHaveBeenCalled()
})

test('bloqueio por compra só é explicado após manifestar intenção de sair', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => String(input).includes('/membros') ? Response.json(membros()) : Response.json([]))
  const familia = familyFixture({ papel: 'MEMBRO', contextoUsuario: { podeGerenciarIntegrantes: false, podeSairDaFamilia: false, motivoSaidaFamiliaIndisponivel: 'COMPRA_EM_ANDAMENTO' } })
  const { user } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await screen.findByText('Ana')
  expect(screen.queryByText(/você participa de uma compra em andamento e não pode sair/i)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Sair da família' }))
  expect(screen.getByRole('dialog', { name: 'Não é possível sair da família' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Ver compras relacionadas' })).toBeVisible()
})

test('administrador único recebe orientação somente após clicar em sair', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => String(input).includes('/membros') ? Response.json(membros()) : Response.json([]))
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true, podeSairDaFamilia: false, motivoSaidaFamiliaIndisponivel: 'ADMINISTRADOR_UNICO' } })
  const { user } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await screen.findByText('Ana')
  expect(screen.queryByText(/você é o único administrador/i)).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Sair da família' }))
  expect(screen.getByRole('dialog', { name: 'Transfira a administração primeiro' })).toBeVisible()
})

test('voltar e Escape fecham a confirmação sem chamar a API', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => String(input).includes('/membros') ? Response.json(membros()) : Response.json([]))
  const { user } = renderApp(<FamiliaPage />)
  await user.click(await screen.findByRole('button', { name: 'Transferir administração' }))
  await user.click(screen.getByRole('button', { name: 'Voltar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Transferir administração' }))
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: false, cancelable: true }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(fetchMock.mock.calls.some(([input]) => String(input).includes('transferir-administracao'))).toBe(false)
})

test('administrador remove integrante somente com o código exibido', async () => {
  let chamadasRemocao = 0
  let urlRemocao = ''
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const path = String(input)
    if (path.endsWith('/membros/bia') && init?.method === 'DELETE') { chamadasRemocao += 1; urlRemocao = path; return new Response(null, { status: 204 }) }
    if (path.includes('/membros')) return Response.json(membros())
    if (path.endsWith('/familias')) return Response.json([familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })])
    if (path.includes('/solicitacoes')) return Response.json([])
    return Response.json([])
  })
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true } })
  const { user } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await user.click(await screen.findByRole('button', { name: 'Remover integrante' }))
  const dialog = await screen.findByRole('dialog', { name: 'Remover integrante?' })
  expect(within(dialog).getByRole('button', { name: 'Confirmar remoção' })).toBeDisabled()
  await user.type(within(dialog).getByLabelText('Código de confirmação'), '1000')
  await user.click(within(dialog).getByRole('button', { name: 'Confirmar remoção' }))
  await waitFor(() => expect(chamadasRemocao).toBe(1))
  expect(urlRemocao).toContain('/membros/bia')
})

test('ação de remoção só aparece quando a capability do integrante estiver habilitada', async () => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => String(input).includes('/membros') ? Response.json(membros(true, false)) : Response.json([]))
  renderApp(<FamiliaPage />)
  await screen.findByText('Ana')
  expect(screen.queryByRole('button', { name: 'Remover integrante' })).not.toBeInTheDocument()
})

test('remoção bloqueada por compra abre explicação somente após o clique', async () => {
  const integrantes = [
    { membroFamiliaId: 'ana', usuarioId: 'usuario-a', nome: 'Ana', email: 'ana@example.test', papel: 'ADMINISTRADOR', usuarioAtual: true, acoes: { podeTransferirAdministracao: false, podeRemoverIntegrante: false } },
    { membroFamiliaId: 'bia', usuarioId: 'usuario-b', nome: 'Bia', email: 'bia@example.test', papel: 'MEMBRO', usuarioAtual: false, acoes: { podeTransferirAdministracao: true, podeRemoverIntegrante: false, motivoRemocaoIndisponivel: 'COMPRA_EM_ANDAMENTO' } },
  ]
  const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => String(input).includes('/membros') ? Response.json(integrantes) : Response.json([]))
  const familia = familyFixture({ papel: 'ADMINISTRADOR', contextoUsuario: { podeGerenciarIntegrantes: true, podeSairDaFamilia: false, motivoSaidaFamiliaIndisponivel: 'ADMINISTRADOR_UNICO' } })
  const { user } = renderApp(<FamiliaPage />, { family: familyContextFixture({ familias: [familia], familiaSelecionada: familia }) })

  await screen.findByText('Bia')
  expect(screen.getByRole('button', { name: 'Remover integrante' })).toBeVisible()
  expect(screen.queryByText(/este integrante participa de uma compra em andamento/i)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ver compras relacionadas' })).not.toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Remover integrante' }))
  expect(screen.getByRole('dialog', { name: 'Não é possível remover este integrante' })).toBeVisible()
  expect(screen.getByRole('button', { name: 'Ver compras relacionadas' })).toBeVisible()
  expect(fetchMock.mock.calls.some(([input, init]) => String(input).endsWith('/membros/bia') && init?.method === 'DELETE')).toBe(false)
})
