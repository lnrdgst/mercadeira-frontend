import { useEffect, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { useCameraStream, type CapturaCamera } from '../hooks/useCameraStream'
import { useOcrLocal } from '../hooks/useOcrLocal'
import { combinarCandidatosMonetarios } from '../utils/combinarCandidatosMonetarios'
import { extrairCandidatosMonetarios } from '../utils/extrairCandidatosMonetarios'
import { CameraPreview } from './CameraPreview'
import { PrecosEncontrados } from './PrecosEncontrados'

type Props = { open: boolean; onClose: () => void; onConfirmar: (valor: number) => void }
type Etapa = 'camera' | 'lendo' | 'semResultado' | 'erroOcr' | 'selecionar'

export function LeituraPrecoDialog({ open, onClose, onConfirmar }: Props) {
  const { stream, loading, error, iniciar, parar, capturar: capturarFrame } = useCameraStream()
  const { estado: estadoOcr, reconhecer, encerrar } = useOcrLocal()
  const [etapa, setEtapa] = useState<Etapa>('camera')
  const [candidatos, setCandidatos] = useState<number[]>([])
  const [selecionado, setSelecionado] = useState<number | null>(null)

  useEffect(() => {
    if (open && etapa === 'camera' && !stream && !loading && !error) void iniciar()
    if (!open) { parar(); void encerrar() }
  }, [encerrar, error, etapa, iniciar, loading, open, parar, stream])

  function fechar() {
    parar()
    void encerrar()
    setEtapa('camera')
    setCandidatos([])
    setSelecionado(null)
    onClose()
  }

  function informarPreco(valor: number) {
    onConfirmar(valor)
    fechar()
  }

  async function capturarPreco(video: HTMLVideoElement) {
    const captura = capturarFrame(video)
    if (!captura) return
    parar()
    setEtapa('lendo')
    setSelecionado(null)
    try {
      const resultado = await reconhecer(captura.imagem, captura.imagemProcessada, captura.criarImagensReforcadas)
      if (resultado === null) return
      const listas = resultado.passagens.map((passagem) => {
        const encontrados = extrairCandidatosMonetarios(passagem.texto)
        registrarDiagnostico(passagem.estrategia, passagem.imagem, passagem.texto, encontrados, passagem.confidence, passagem.tempoMs, captura)
        return encontrados
      })
      const encontrados = combinarCandidatosMonetarios(listas)
      if (import.meta.env.DEV) console.info('[OCR preço - resultado combinado]', { candidatos: encontrados })
      setCandidatos(encontrados)
      if (encontrados.length === 1) {
        informarPreco(encontrados[0])
      } else {
        setEtapa(encontrados.length === 0 ? 'semResultado' : 'selecionar')
      }
    } catch (erro) {
      if (import.meta.env.DEV) console.error('[OCR preço] falha de reconhecimento', erro)
      setCandidatos([])
      setEtapa('erroOcr')
    }
  }

  function registrarDiagnostico(estrategia: string, imagem: string, rawText: string, encontrados: number[], confidence: number | null, tempoMs: number, captura: CapturaCamera) {
    if (!import.meta.env.DEV) return
    console.info(`[OCR preço - ${estrategia}]`, { imagem, rawText, textoNormalizado: rawText, candidatos: encontrados, confidence, tempoMs, dimensoes: { largura: captura.largura, altura: captura.altura, origemX: captura.origemX, origemY: captura.origemY, larguraOrigem: captura.larguraOrigem, alturaOrigem: captura.alturaOrigem } })
  }

  function tentarNovamente() {
    setCandidatos([])
    setSelecionado(null)
    setEtapa('camera')
    void iniciar()
  }

  return <Modal open={open} onClose={fechar} ariaLabelledBy="leitura-preco-titulo" panelClassName="max-w-md">
    <div className="space-y-page overflow-y-auto p-page">
      <div className="space-y-1"><h5 id="leitura-preco-titulo" className="text-headline-md font-semibold">Ler preço</h5>{etapa === 'camera' && <p className="text-body-md text-foreground-muted">Enquadre o preço da etiqueta dentro da marcação.</p>}</div>
      {etapa === 'camera' && <CameraPreview stream={stream} loading={loading} error={error} onCapturar={capturarPreco} onTentarNovamente={() => void iniciar()} onVoltarManual={fechar} />}
      {etapa === 'lendo' && <div className="space-y-gutter rounded-card bg-primary/5 p-page" aria-live="polite"><p className="font-semibold">{estadoOcr === 'preparando' ? 'Preparando leitor de preço…' : 'Lendo preço…'}</p><p className="text-body-md text-foreground-muted">Identificando valores na etiqueta.</p></div>}
      {etapa === 'semResultado' && <div className="space-y-gutter rounded-card bg-warning/10 p-gutter"><p>Não encontrei um preço com segurança.</p><div className="flex flex-col gap-2"><button type="button" onClick={tentarNovamente} className="min-h-touch rounded-control border border-warning px-gutter font-semibold text-warning">Tentar novamente</button><button type="button" onClick={fechar} className="min-h-touch rounded-control border border-foreground/20 px-gutter font-semibold">Informar manualmente</button></div></div>}
      {etapa === 'erroOcr' && <div className="space-y-gutter rounded-card bg-warning/10 p-gutter"><p>Não foi possível ler o preço desta vez.</p><div className="flex flex-col gap-2"><button type="button" onClick={tentarNovamente} className="min-h-touch rounded-control border border-warning px-gutter font-semibold text-warning">Tentar novamente</button><button type="button" onClick={fechar} className="min-h-touch rounded-control border border-foreground/20 px-gutter font-semibold">Informar manualmente</button></div></div>}
      {etapa === 'selecionar' && <div className="space-y-page"><PrecosEncontrados candidatos={candidatos} selecionado={selecionado} onSelecionar={setSelecionado} /><div className="flex flex-col gap-2"><button type="button" disabled={selecionado === null} onClick={() => selecionado !== null && informarPreco(selecionado)} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Usar preço</button><button type="button" onClick={fechar} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Informar manualmente</button></div></div>}
    </div>
  </Modal>
}
