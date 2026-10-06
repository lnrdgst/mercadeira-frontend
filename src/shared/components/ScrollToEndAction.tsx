import { useEffect, useState, type RefObject } from 'react'

export function ScrollToEndAction({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [visivel, setVisivel] = useState(false)
  useEffect(() => { const alvo = targetRef.current; if (!alvo || !('IntersectionObserver' in window)) return; const observer = new IntersectionObserver(([entry]) => setVisivel(!entry.isIntersecting)); observer.observe(alvo); return () => observer.disconnect() }, [targetRef])
  if (!visivel) return null
  return <button type="button" onClick={() => targetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="fixed bottom-[calc(var(--spacing-touch)+var(--spacing-gutter)+env(safe-area-inset-bottom))] right-page z-20 min-h-touch rounded-control border border-foreground/20 bg-surface/95 px-gutter font-semibold shadow-soft backdrop-blur focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">↓ Ir para o final</button>
}
