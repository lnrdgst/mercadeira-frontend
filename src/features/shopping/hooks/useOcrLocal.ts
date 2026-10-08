import { useCallback, useEffect, useRef, useState } from 'react'
import type { Worker } from 'tesseract.js'

type EstadoOcr = 'idle' | 'preparando' | 'lendo'

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

  const reconhecer = useCallback(async (imagem: string) => {
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
      workerRef.current = worker
      if (canceladoRef.current) return null
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      setEstado('lendo')
      const { data: { text } } = await worker.recognize(imagem)
      return canceladoRef.current ? null : text
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
