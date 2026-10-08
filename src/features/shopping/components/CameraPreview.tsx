import { useEffect, useRef } from 'react'
import type { CameraError } from '../hooks/useCameraStream'

type Props = { stream: MediaStream | null; loading: boolean; error: CameraError | null; onCapturar: (video: HTMLVideoElement) => void; onTentarNovamente: () => void; onVoltarManual: () => void }

const mensagensErro: Record<CameraError, string> = {
  unsupported: 'Este navegador não oferece acesso à câmera.', permission: 'Não foi possível acessar a câmera. Você pode continuar informando o preço manualmente.', unavailable: 'Nenhuma câmera disponível foi encontrada neste dispositivo.', busy: 'A câmera está sendo usada por outro aplicativo. Feche-o e tente novamente.', unknown: 'Não foi possível iniciar a câmera agora.',
}

export function CameraPreview({ stream, loading, error, onCapturar, onTentarNovamente, onVoltarManual }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    if (stream) void video.play().catch(() => undefined)
    return () => { video.srcObject = null }
  }, [stream])
  if (error) return <div className="space-y-gutter rounded-card bg-warning/10 p-gutter"><p>{mensagensErro[error]}</p><div className="flex flex-col gap-2">{error !== 'unsupported' && <button type="button" onClick={onTentarNovamente} className="min-h-touch rounded-control border border-warning px-gutter font-semibold text-warning">Tentar novamente</button>}<button type="button" onClick={onVoltarManual} className="min-h-touch rounded-control border border-foreground/20 px-gutter font-semibold">Voltar para entrada manual</button></div></div>
  return <div className="space-y-gutter"><div className="relative aspect-[4/3] overflow-hidden rounded-card bg-foreground"><video ref={videoRef} autoPlay muted playsInline aria-label="Prévia da câmera" className="h-full w-full object-cover" /><div aria-hidden="true" className="pointer-events-none absolute left-[7%] top-[22%] h-[56%] w-[86%] rounded-control border-2 border-surface shadow-[0_0_0_999px_rgba(0,0,0,0.28)]" /><p className="absolute bottom-gutter left-0 right-0 text-center text-body-sm font-semibold text-surface">Centralize o preço dentro da marcação</p></div>{loading && <p className="text-body-md text-foreground-muted">Abrindo câmera…</p>}<button type="button" disabled={!stream || loading} onClick={() => videoRef.current && onCapturar(videoRef.current)} className="min-h-touch w-full rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">Capturar preço</button></div>
}
