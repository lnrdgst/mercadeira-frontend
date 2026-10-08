import { useCallback, useEffect, useRef, useState } from 'react'

export type CameraError = 'unsupported' | 'permission' | 'unavailable' | 'busy' | 'unknown'
export type CapturaCamera = { imagem: string; largura: number; altura: number; origemX: number; origemY: number; larguraOrigem: number; alturaOrigem: number }

const preferredConstraints: MediaStreamConstraints = {
  audio: false,
  video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
}
const fallbackConstraints: MediaStreamConstraints = { audio: false, video: true }

function mapCameraError(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'permission'
  if (name === 'NotFoundError') return 'unavailable'
  if (name === 'NotReadableError' || name === 'AbortError') return 'busy'
  return 'unknown'
}

function canUseCamera() {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export function useCameraStream() {
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<CameraError | null>(null)

  const parar = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const iniciar = useCallback(async () => {
    if (!canUseCamera()) { setError('unsupported'); return false }
    parar()
    setLoading(true)
    setError(null)
    try {
      let proximaStream: MediaStream
      try {
        proximaStream = await navigator.mediaDevices.getUserMedia(preferredConstraints)
      } catch (firstError) {
        if (mapCameraError(firstError) !== 'unknown') throw firstError
        proximaStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
      }
      streamRef.current = proximaStream
      setStream(proximaStream)
      return true
    } catch (requestError) {
      setError(mapCameraError(requestError))
      return false
    } finally { setLoading(false) }
  }, [parar])

  const capturar = useCallback((video: HTMLVideoElement) => {
    if (!video.videoWidth || !video.videoHeight) return null
    const larguraOrigem = video.videoWidth
    const alturaOrigem = video.videoHeight
    // A moldura ocupa 86% x 56% de um preview 4:3 com object-cover.
    // Calculamos a mesma área no frame de origem, inclusive a parte ocultada pelo cover.
    const aspectoPreview = 4 / 3
    const aspectoOrigem = larguraOrigem / alturaOrigem
    const larguraVisivel = aspectoOrigem > aspectoPreview ? alturaOrigem * aspectoPreview : larguraOrigem
    const alturaVisivel = aspectoOrigem > aspectoPreview ? alturaOrigem : larguraOrigem / aspectoPreview
    const inicioVisivelX = (larguraOrigem - larguraVisivel) / 2
    const inicioVisivelY = (alturaOrigem - alturaVisivel) / 2
    const larguraCorte = Math.round(larguraVisivel * 0.86)
    const alturaCorte = Math.round(alturaVisivel * 0.56)
    const origemX = Math.round(inicioVisivelX + (larguraVisivel - larguraCorte) / 2)
    const origemY = Math.round(inicioVisivelY + (alturaVisivel - alturaCorte) / 2)
    const fator = Math.min(1, 1440 / Math.max(larguraCorte, alturaCorte))
    const larguraDestino = Math.max(1, Math.round(larguraCorte * fator))
    const alturaDestino = Math.max(1, Math.round(alturaCorte * fator))
    const canvas = document.createElement('canvas')
    canvas.width = larguraDestino
    canvas.height = alturaDestino
    const context = canvas.getContext('2d')
    if (!context) return null
    context.drawImage(video, origemX, origemY, larguraCorte, alturaCorte, 0, 0, larguraDestino, alturaDestino)
    return { imagem: canvas.toDataURL('image/png'), largura: larguraDestino, altura: alturaDestino, origemX, origemY, larguraOrigem, alturaOrigem } satisfies CapturaCamera
  }, [])

  useEffect(() => parar, [parar])
  useEffect(() => {
    const aoMudarVisibilidade = () => { if (document.visibilityState === 'hidden') parar() }
    document.addEventListener('visibilitychange', aoMudarVisibilidade)
    return () => document.removeEventListener('visibilitychange', aoMudarVisibilidade)
  }, [parar])

  return { stream, loading, error, iniciar, parar, capturar }
}
