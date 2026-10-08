import { useCallback, useEffect, useRef, useState } from 'react'
import type { PSM, Worker } from 'tesseract.js'
import { combinarCandidatosMonetarios } from '../utils/combinarCandidatosMonetarios'
import { extrairCandidatosMonetarios } from '../utils/extrairCandidatosMonetarios'

type EstadoOcr = 'idle' | 'preparando' | 'lendo'
export type PassagemOcr = { estrategia: 'A original/single-line' | 'B processada/sparse' | 'C adaptive' | 'D inverted'; imagem: 'original' | 'processada' | 'adaptativa' | 'invertida'; texto: string; confidence: number | null; tempoMs: number; psm: PSM }
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

  const reconhecer = useCallback(async (imagem: string, imagemProcessada: string, criarReforcadas: () => { imagemAdaptativa: string; imagemInvertida: string }): Promise<ResultadoOcr | null> => {
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
          return { estrategia, imagem: variante, texto: text, confidence: Number.isFinite(confidence) ? confidence : null, tempoMs: Math.round(performance.now() - inicio), psm: modo } satisfies PassagemOcr
        } catch (erro) {
          if (import.meta.env.DEV) console.error(`[OCR preço - ${estrategia}] falha`, erro)
          return null
        }
      }
      const apenasPassagens = (passagem: PassagemOcr | null): passagem is PassagemOcr => passagem !== null
      const passagemA = await executar('A original/single-line', 'original', imagem, PSM.SINGLE_LINE)
      const passagemB = await executar('B processada/sparse', 'processada', imagemProcessada, PSM.SPARSE_TEXT)
      let passagens: PassagemOcr[] = [passagemA, passagemB].filter(apenasPassagens)
      const candidatosRapidos = combinarCandidatosMonetarios(passagens.map((passagem) => extrairCandidatosMonetarios(passagem.texto)))
      if (candidatosRapidos.length === 0) {
        const { imagemAdaptativa, imagemInvertida } = criarReforcadas()
        const passagemC = await executar('C adaptive', 'adaptativa', imagemAdaptativa, PSM.RAW_LINE)
        const passagemD = await executar('D inverted', 'invertida', imagemInvertida, PSM.SINGLE_WORD)
        passagens = [...passagens, passagemC, passagemD].filter(apenasPassagens)
      }
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
