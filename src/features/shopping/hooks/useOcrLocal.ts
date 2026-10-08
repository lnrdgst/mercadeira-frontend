import { useCallback, useEffect, useRef, useState } from 'react'
import type { Worker } from 'tesseract.js'

type EstadoOcr = 'idle' | 'preparando' | 'lendo'
export type ResultadoOcr = { texto: string; confidence: number | null }

/** OCR executado inteiramente no navegador, com worker, núcleo e idioma servidos pelo próprio app. */
export function useOcrLocal() {
  const workerRef = useRef<Worker | null>(null)
  const canceladoRef = useRef(false)
  const [estado, setEstado] = useState<EstadoOcr>('idle')

  const encerrar = useCallback(async () => {
    canceladoRef.current = true
    const worker = workerRef.current
    workerRef.current = null
    if (worker) await worker.terminate()
    setEstado('idle')
  }, [])

  const reconhecer = useCallback(async (imagem: string): Promise<ResultadoOcr | null> => {
    canceladoRef.current = false
    setEstado('preparando')
    try {
      const { createWorker, PSM } = await import('tesseract.js')
      if (canceladoRef.current) return null
      const worker = await createWorker('por', 1, {
        workerPath: '/ocr/worker.min.js',
        corePath: '/ocr/core',
        langPath: '/ocr/lang',
        cacheMethod: 'none',
      })
      if (import.meta.env.DEV) console.info('[OCR preço] worker local criado', { workerPath: '/ocr/worker.min.js', corePath: '/ocr/core', langPath: '/ocr/lang' })
      workerRef.current = worker
      if (canceladoRef.current) return null
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: '0123456789O.,R$' })
      setEstado('lendo')
      const { data: { text, confidence } } = await worker.recognize(imagem)
      return canceladoRef.current ? null : { texto: text, confidence: Number.isFinite(confidence) ? confidence : null }
    } finally {
      const worker = workerRef.current
      workerRef.current = null
      if (worker) await worker.terminate()
      if (!canceladoRef.current) setEstado('idle')
    }
  }, [])

  useEffect(() => () => { void encerrar() }, [encerrar])

  return { estado, reconhecendo: estado !== 'idle', reconhecer, encerrar }
}
