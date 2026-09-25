import type { FiltrosListas } from '../api/shoppingListsApi'

const prefixo = 'mercadeira:listas:filtros:'
const usuarioAtualKey = 'mercadeira:listas:filtros:usuario-atual'
const campos = ['criadaDe', 'criadaAte', 'criadaPorUsuarioId', 'participanteMembroFamiliaId'] as const

function chave(usuarioId: string, familiaId: string) { return `${prefixo}${usuarioId}:${familiaId}` }

export function lerFiltrosListas(usuarioId: string, familiaId: string): FiltrosListas {
  try {
    const bruto = localStorage.getItem(chave(usuarioId, familiaId))
    if (!bruto) return {}
    const valor = JSON.parse(bruto) as Record<string, unknown>
    return Object.fromEntries(campos.filter((campo) => typeof valor[campo] === 'string').map((campo) => [campo, valor[campo]])) as FiltrosListas
  } catch { return {} }
}

export function salvarFiltrosListas(usuarioId: string, familiaId: string, filtros: FiltrosListas) {
  const valor = Object.fromEntries(campos.filter((campo) => filtros[campo]).map((campo) => [campo, filtros[campo]]))
  if (Object.keys(valor).length === 0) { removerFiltrosListas(usuarioId, familiaId); return }
  localStorage.setItem(chave(usuarioId, familiaId), JSON.stringify(valor))
  sessionStorage.setItem(usuarioAtualKey, usuarioId)
}

export function removerFiltrosListas(usuarioId: string, familiaId: string) { localStorage.removeItem(chave(usuarioId, familiaId)) }

export function removerFiltrosDoUsuarioAtual() {
  const usuarioId = sessionStorage.getItem(usuarioAtualKey)
  if (!usuarioId) return
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i)
    if (key?.startsWith(`${prefixo}${usuarioId}:`)) localStorage.removeItem(key)
  }
  sessionStorage.removeItem(usuarioAtualKey)
}
