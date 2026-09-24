import { useCallback, useEffect, useRef, useState } from 'react'

export const screenWakeLockPreferenceKey = 'mercadeira:manter-tela-ligada'

interface WakeLockSentinelLike extends EventTarget {
  release(): Promise<void>
}

interface WakeLockNavigator {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

function wakeLockDisponivel() {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator
}

function preferenciaInicial() {
  try {
    return localStorage.getItem(screenWakeLockPreferenceKey) !== 'false'
  } catch {
    return true
  }
}

export function useScreenWakeLock(compraEmAndamento: boolean) {
  const [preferenciaHabilitada, setPreferenciaHabilitada] = useState(preferenciaInicial)
  const [ativo, setAtivo] = useState(false)
  const suportado = wakeLockDisponivel()
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null)
  const solicitandoRef = useRef(false)
  const montadoRef = useRef(true)
  const compraEmAndamentoRef = useRef(compraEmAndamento)
  const preferenciaRef = useRef(preferenciaHabilitada)

  const liberar = useCallback(async () => {
    const sentinel = sentinelRef.current
    sentinelRef.current = null
    setAtivo(false)
    if (!sentinel) return
    try {
      await sentinel.release()
    } catch {
      // A liberaÃ§Ã£o pode ter sido feita pelo prÃ³prio navegador.
    }
  }, [])

  const adquirir = useCallback(async () => {
    const wakeLock = (navigator as Navigator & { wakeLock?: WakeLockNavigator }).wakeLock
    if (!wakeLock || !compraEmAndamentoRef.current || !preferenciaRef.current
      || document.visibilityState !== 'visible' || sentinelRef.current || solicitandoRef.current) {
      return
    }

    solicitandoRef.current = true
    try {
      const sentinel = await wakeLock.request('screen')
      if (!montadoRef.current || !compraEmAndamentoRef.current || !preferenciaRef.current
        || document.visibilityState !== 'visible') {
        await sentinel.release().catch(() => undefined)
        return
      }
      sentinelRef.current = sentinel
      setAtivo(true)
      sentinel.addEventListener('release', () => {
        if (sentinelRef.current !== sentinel) return
        sentinelRef.current = null
        if (montadoRef.current) setAtivo(false)
      }, { once: true })
    } catch {
      if (montadoRef.current) setAtivo(false)
    } finally {
      solicitandoRef.current = false
    }
  }, [])

  useEffect(() => {
    montadoRef.current = true
    compraEmAndamentoRef.current = compraEmAndamento
    preferenciaRef.current = preferenciaHabilitada
    if (!compraEmAndamento) {
      if (sentinelRef.current) void liberar()
      return
    }

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') void adquirir()
    }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    queueMicrotask(() => void adquirir())
    return () => {
      document.removeEventListener('visibilitychange', aoMudarVisibilidade)
      void liberar()
    }
  }, [adquirir, compraEmAndamento, liberar, preferenciaHabilitada])

  useEffect(() => () => { montadoRef.current = false }, [])

  const definirPreferencia = useCallback((habilitada: boolean) => {
    preferenciaRef.current = habilitada
    setPreferenciaHabilitada(habilitada)
    try {
      localStorage.setItem(screenWakeLockPreferenceKey, String(habilitada))
    } catch {
      // A preferÃªncia continua vÃ¡lida apenas nesta sessÃ£o se o storage falhar.
    }
    if (habilitada) void adquirir()
    else void liberar()
  }, [adquirir, liberar])

  return { suportado, preferenciaHabilitada, ativo, definirPreferencia }
}
