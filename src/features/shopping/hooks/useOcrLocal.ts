import { useCallback, useEffect, useRef, useState } from 'react'
import type { PSM, Worker } from 'tesseract.js'

type EstadoOcr = 'idle' | 'preparando' | 'lendo'
export type PassagemOcr = { estrategia: 'single-line' | 'multi-line'; imagem: 'original' | 'processada'; texto: string; confidence: number | null; tempoMs: number }
export type ResultadoOcr = { passagens: PassagemOcr[] }

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

  const reconhecer = useCallback(async (imagem: string, imagemProcessada: string): Promise<ResultadoOcr | null> => {
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
      setEstado('lendo')
      const executar = async (estrategia: PassagemOcr['estrategia'], variante: PassagemOcr['imagem'], entrada: string, modo: PSM) => {
        const inicio = performance.now()
        try {
          await worker.setParameters({ tessedit_pageseg_mode: modo, tessedit_char_whitelist: '0123456789O.,R$' })
          const { data: { text, confidence } } = await worker.recognize(entrada)
          return { estrategia, imagem: variante, texto: text, confidence: Number.isFinite(confidence) ? confidence : null, tempoMs: Math.round(performance.now() - inicio) } satisfies PassagemOcr
        } catch (erro) {
          if (import.meta.env.DEV) console.error(`[OCR preço - ${estrategia}] falha`, erro)
          return null
        }
      }
      const passagemA = await executar('single-line', 'original', imagem, PSM.SINGLE_LINE)
      const passagemB = await executar('multi-line', 'processada', imagemProcessada, PSM.SPARSE_TEXT)
      const passagens = [passagemA, passagemB].filter((passagem): passagem is PassagemOcr => passagem !== null)
      if (passagens.length === 0) throw new Error('Todas as passagens de OCR falharam.')
      return canceladoRef.current ? null : { passagens }
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
