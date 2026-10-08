import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../../shared/components/Modal'
import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'
import { useCameraStream } from '../hooks/useCameraStream'
import { extrairCandidatosMonetarios } from '../utils/extrairCandidatosMonetarios'
import { CameraPreview } from './CameraPreview'
import { PrecosEncontrados } from './PrecosEncontrados'
import { cenariosLeituraPrecoDemo, type CenarioLeituraPrecoDemo } from './leituraPrecoDemo'

type Props = { open: boolean; onClose: () => void; onConfirmar: (valor: number) => void }
type Etapa = 'camera' | 'captura' | 'demonstracao'

export function LeituraPrecoDialog({ open, onClose, onConfirmar }: Props) {
  const camera = useCameraStream()
  const { stream, loading, error, iniciar, parar, capturar: capturarFrame } = camera
  const [etapa, setEtapa] = useState<Etapa>('camera')
  const [captura, setCaptura] = useState<string | null>(null)
  const [cenario, setCenario] = useState<CenarioLeituraPrecoDemo>('um')
  const [selecionado, setSelecionado] = useState<number | null>(null)
  const candidatos = useMemo(() => extrairCandidatosMonetarios(cenariosLeituraPrecoDemo[cenario].textoOcr), [cenario])

  useEffect(() => {
    if (open && etapa === 'camera' && !stream && !loading && !error) void iniciar()
    if (!open) parar()
  }, [error, etapa, iniciar, loading, open, parar, stream])

  function fechar() {
    parar()
    setEtapa('camera')
    setCaptura(null)
    setSelecionado(null)
    onClose()
  }
  function capturar(video: HTMLVideoElement) {
    const imagem = capturarFrame(video)
    if (imagem) { setCaptura(imagem); setEtapa('captura') }
  }
  function tentarNovamenteCamera() {
    setCaptura(null)
    setEtapa('camera')
    if (!stream) void iniciar()
  }
  function usarCaptura() { parar(); setEtapa('demonstracao') }
  function mudarCenario(proximo: CenarioLeituraPrecoDemo) { setCenario(proximo); setSelecionado(null) }
  function confirmar() {
    if (selecionado === null) return
    onConfirmar(selecionado)
    fechar()
  }

  return <Modal open={open} onClose={fechar} ariaLabelledBy="leitura-preco-titulo" panelClassName="max-w-md">
    <div className="space-y-page overflow-y-auto p-page">
      <div className="space-y-1"><h5 id="leitura-preco-titulo" className="text-headline-md font-semibold">Ler preço</h5>{etapa === 'camera' && <p className="text-body-md text-foreground-muted">Fotografe a etiqueta para revisar o preço depois.</p>}</div>
      {etapa === 'camera' && <CameraPreview stream={stream} loading={loading} error={error} onCapturar={capturar} onTentarNovamente={() => void iniciar()} onVoltarManual={fechar} />}
      {etapa === 'captura' && <div className="space-y-gutter">{captura && <img src={captura} alt="Captura da etiqueta de preço" className="max-h-72 w-full rounded-card object-contain" />}<p className="text-body-md text-foreground-muted">Revise a imagem antes de continuar.</p><button type="button" onClick={usarCaptura} className="min-h-touch w-full rounded-control bg-primary px-page font-semibold text-surface">Usar captura</button><button type="button" onClick={tentarNovamenteCamera} className="min-h-touch w-full rounded-control border border-foreground/20 px-page font-semibold">Tentar novamente</button><button type="button" onClick={fechar} className="min-h-touch w-full rounded-control border border-foreground/20 px-page font-semibold">Cancelar</button></div>}
      {etapa === 'demonstracao' && <div className="space-y-page"><div className="rounded-card bg-warning/10 p-gutter text-body-md text-foreground-muted">Captura confirmada. Demonstração temporária: o OCR será conectado aqui em uma próxima etapa.</div><label className="block space-y-1"><span className="font-semibold">Cenário de demonstração temporário</span><select aria-label="Cenário de demonstração" value={cenario} onChange={(event) => mudarCenario(event.target.value as CenarioLeituraPrecoDemo)} className="min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter">{(Object.keys(cenariosLeituraPrecoDemo) as CenarioLeituraPrecoDemo[]).map((chave) => <option key={chave} value={chave}>{cenariosLeituraPrecoDemo[chave].titulo}</option>)}</select></label>{candidatos.length === 0 ? <div className="space-y-gutter rounded-card bg-warning/10 p-gutter"><p>Não encontrei um preço com segurança.</p><button type="button" onClick={() => setSelecionado(null)} className="min-h-touch rounded-control border border-warning px-gutter font-semibold text-warning">Tentar novamente</button></div> : <PrecosEncontrados candidatos={candidatos} selecionado={selecionado} onSelecionar={setSelecionado} />}<div className="flex flex-col gap-2">{candidatos.length > 0 && <button type="button" disabled={selecionado === null} onClick={confirmar} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{selecionado === null ? 'Selecione um preço' : `Usar ${formatarValorMonetario(selecionado)}`}</button>}<button type="button" onClick={fechar} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Voltar para entrada manual</button></div></div>}
    </div>
  </Modal>
}
