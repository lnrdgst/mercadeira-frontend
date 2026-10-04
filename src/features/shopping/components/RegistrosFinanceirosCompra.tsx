import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { IScannerControls } from '@zxing/browser'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { Modal } from '../../../shared/components/Modal'
import { formatarValorMonetario } from '../../../shared/formatarValorMonetario'
import { adicionarRegistroFinanceiroCompra, adicionarRegistroNfce, analisarQrNfce, removerRegistroFinanceiroCompra } from '../api/shoppingApi'
import type { CompraResponse, NfceQrAnaliseResponse } from '../types/shopping'

type Props = {
  compra: CompraResponse
  token: string
  familiaId: string
  listaId: string
  onAtualizar: (compra: CompraResponse) => void
  onNaoAutorizado: () => void
}

function converterValor(valor: string): number | null {
  const informado = valor.trim()
  if (!informado) return null
  const normalizado = informado.includes(',') ? informado.replaceAll('.', '').replace(',', '.') : informado
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null
  const numero = Number(normalizado)
  return Number.isFinite(numero) && numero > 0 ? numero : null
}

export function RegistrosFinanceirosCompra({ compra, token, familiaId, listaId, onAtualizar, onNaoAutorizado }: Props) {
  const [aberto, setAberto] = useState(false)
  const [valor, setValor] = useState('')
  const [estabelecimentoNome, setEstabelecimentoNome] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [qrAberto, setQrAberto] = useState(false)
  const [conteudoQr, setConteudoQr] = useState('')
  const [analiseNfce, setAnaliseNfce] = useState<NfceQrAnaliseResponse | null>(null)
  const [erroCamera, setErroCamera] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlesScanner = useRef<IScannerControls | null>(null)
  const leituraEmAndamento = useRef(false)
  const podeGerenciar = compra.contextoUsuario.podeGerenciarRegistrosFinanceiros === true
  const registros = compra.registrosFinanceiros ?? []
  const valorTotal = compra.totalRegistrado ?? registros.reduce((total, registro) => total + registro.valor, 0)
  const total = useMemo(() => formatarValorMonetario(valorTotal), [valorTotal])

  function abrir() {
    setValor('')
    setEstabelecimentoNome('')
    setAnaliseNfce(null)
    setErro(null)
    setAberto(true)
  }

  function encerrarScanner() {
    controlesScanner.current?.stop()
    controlesScanner.current = null
    leituraEmAndamento.current = false
  }

  function fecharScanner() {
    encerrarScanner()
    setQrAberto(false)
  }

  async function adicionar() {
    const valorConvertido = converterValor(valor)
    if (valorConvertido === null) {
      setErro('Informe um valor maior que zero, com no máximo duas casas decimais.')
      return
    }
    setEnviando(true)
    setErro(null)
    try {
      const atualizada = analiseNfce
        ? await adicionarRegistroNfce(token, familiaId, listaId, {
          valor: valorConvertido,
          estabelecimentoNome: estabelecimentoNome.trim() || null,
          chaveNfce: analiseNfce.chaveNfce,
          urlConsulta: analiseNfce.urlConsulta,
          cnpjEmitente: analiseNfce.cnpjEmitente,
        })
        : await adicionarRegistroFinanceiroCompra(token, familiaId, listaId, {
          valor: valorConvertido,
          estabelecimentoNome: estabelecimentoNome.trim() || null,
        })
      onAtualizar(atualizada)
      setAberto(false)
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) onNaoAutorizado()
      else setErro(falha.message || 'N\u00e3o foi poss\u00edvel adicionar o valor.')
    } finally {
      setEnviando(false)
    }
  }

  async function remover(registroId: string) {
    if (enviando) return
    if (!window.confirm('Remover este valor da compra?')) return
    setEnviando(true)
    setErro(null)
    try {
      onAtualizar(await removerRegistroFinanceiroCompra(token, familiaId, listaId, registroId))
    } catch (error) {
      const falha = error as ApiRequestError
      if (falha.status === 401) onNaoAutorizado()
      else setErro(falha.message || 'N\u00e3o foi poss\u00edvel remover o valor.')
    } finally {
      setEnviando(false)
    }
  }
  async function analisarQr(conteudo = conteudoQr) {
    setEnviando(true); setErro(null)
    try {
      const analise = await analisarQrNfce(token, familiaId, listaId, conteudo)
      if (!analise.nfceReconhecida) { setErro('Este QR Code não parece ser de uma NFC-e compatível.'); return }
      setAnaliseNfce(analise)
      setValor(analise.valor?.toFixed(2).replace('.', ',') ?? '')
      setEstabelecimentoNome(analise.estabelecimentoNome ?? '')
      fecharScanner(); setAberto(true)
    } catch (error) { setErro((error as ApiRequestError).message || 'Não foi possível analisar o QR Code.') } finally { setEnviando(false) }
  }

  const analisarQrNoScanner = useEffectEvent((conteudo: string) => {
    void analisarQr(conteudo)
  })

  useEffect(() => {
    if (!qrAberto) return
    let cancelado = false
    leituraEmAndamento.current = false

    async function iniciarScanner() {
      if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
        setErroCamera('A câmera não está disponível neste navegador. Cole o conteúdo do QR Code ou informe o valor manualmente.')
        return
      }
      try {
        const { BrowserQRCodeReader } = await import('@zxing/browser')
        if (cancelado || !videoRef.current) return
        const leitor = new BrowserQRCodeReader()
        let controles: IScannerControls | null = null
        controles = await leitor.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: 'environment' } } },
          videoRef.current,
          (resultado) => {
            if (!resultado || leituraEmAndamento.current) return
            leituraEmAndamento.current = true
            controles?.stop()
            controlesScanner.current = null
            analisarQrNoScanner(resultado.getText())
          },
        )
        if (cancelado) controles.stop()
        else controlesScanner.current = controles
      } catch {
        if (!cancelado) setErroCamera('Não foi possível acessar a câmera. Verifique a permissão e use HTTPS; você ainda pode informar o valor manualmente.')
      }
    }

    void iniciarScanner()
    return () => {
      cancelado = true
      encerrarScanner()
    }
  }, [qrAberto])

  return <section aria-labelledby="registros-financeiros-titulo" className="space-y-gutter rounded-card border border-foreground/10 bg-surface p-page shadow-soft">
    <div className="flex flex-wrap items-center justify-between gap-gutter">
      <div>
        <h2 id="registros-financeiros-titulo" className="text-headline-sm font-semibold">Valores da compra</h2>
        <p className="text-body-md text-foreground-muted">Total registrado: <strong className="text-foreground">{total}</strong></p>
      </div>
      {podeGerenciar && <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => { setConteudoQr(''); setErro(null); setErroCamera(null); setQrAberto(true) }} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary">{registros.length ? 'Escanear outro QR Code' : 'Escanear QR Code'}</button>
        <button type="button" onClick={abrir} className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary">{registros.length ? 'Adicionar outro valor' : 'Informar valor manualmente'}</button>
      </div>}
    </div>
    {erro && !aberto && !qrAberto && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
    {registros.length === 0
      ? <p className="text-body-md text-foreground-muted">Nenhum valor foi registrado nesta compra.</p>
      : <ul className="divide-y divide-foreground/10">
        {registros.map((registro) => <li key={registro.id} className="flex items-center justify-between gap-gutter py-gutter">
          <div>
            <p className="font-semibold">{formatarValorMonetario(registro.valor)}</p>
            {registro.estabelecimentoNome && <p className="text-body-sm text-foreground-muted">{registro.estabelecimentoNome}</p>}
            {registro.tipo === 'NFCE' && <p className="text-body-sm text-foreground-muted">NFC-e</p>}
          </div>
          {podeGerenciar && <button type="button" disabled={enviando} onClick={() => void remover(registro.id)} className="min-h-touch rounded-control px-gutter font-semibold text-error disabled:opacity-60">Remover</button>}
        </li>)}
      </ul>}
    <Modal open={aberto} onClose={() => { if (!enviando) setAberto(false) }} ariaLabelledBy="adicionar-valor-titulo" closeDisabled={enviando} panelClassName="max-w-md">
      <div className="space-y-page overflow-y-auto p-page">
        <div>
          <h2 id="adicionar-valor-titulo" className="text-headline-md font-semibold">{analiseNfce ? 'NFC-e identificada' : 'Adicionar valor'}</h2>
          <p className="text-body-md text-foreground-muted">{analiseNfce ? (analiseNfce.valor == null ? 'NFC-e identificada, mas não foi possível obter o valor automaticamente.' : 'Revise os dados identificados antes de registrar.') : 'Registre um valor pago nesta compra.'}</p>
        </div>
        {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
        <label className="block space-y-1">
          <span className="font-semibold">Valor</span>
          <input autoFocus type="text" inputMode="decimal" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="Ex.: 82,40" className="min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter" />
        </label>
        <label className="block space-y-1">
          <span className="font-semibold">Estabelecimento <span className="font-normal text-foreground-muted">(opcional)</span></span>
          <input type="text" maxLength={120} value={estabelecimentoNome} onChange={(event) => setEstabelecimentoNome(event.target.value)} className="min-h-touch w-full rounded-control border border-foreground/20 bg-surface px-gutter" />
        </label>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={enviando} onClick={() => void adicionar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Registrando...' : analiseNfce ? 'Registrar NFC-e' : 'Adicionar valor'}</button>
          <button type="button" disabled={enviando} onClick={() => setAberto(false)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
        </div>
      </div>
    </Modal>
    <Modal open={qrAberto} onClose={() => { if (!enviando) fecharScanner() }} ariaLabelledBy="qr-titulo" closeDisabled={enviando} panelClassName="max-w-md">
      <div className="space-y-page overflow-y-auto p-page">
        <div>
          <h2 id="qr-titulo" className="text-headline-md font-semibold">Escanear QR Code</h2>
          <p className="text-body-md text-foreground-muted">Aponte a câmera para a NFC-e. Se preferir, cole o conteúdo lido abaixo.</p>
        </div>
        <video ref={videoRef} autoPlay muted playsInline className="aspect-square w-full rounded-card bg-foreground/10 object-cover" aria-label="Pré-visualização da câmera" />
        {erroCamera && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erroCamera}</p>}
        {erro && <p role="alert" className="rounded-card bg-error/10 p-gutter text-error">{erro}</p>}
        <label className="block space-y-1">
          <span className="font-semibold">Conteúdo do QR Code</span>
          <textarea value={conteudoQr} onChange={(event) => setConteudoQr(event.target.value)} placeholder="Cole aqui se a câmera não reconhecer" className="min-h-24 w-full rounded-control border border-foreground/20 p-gutter" />
        </label>
        <div className="flex flex-col gap-2">
          <button type="button" disabled={!conteudoQr.trim() || enviando} onClick={() => void analisarQr()} className="min-h-touch w-full rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? 'Analisando...' : 'Analisar NFC-e'}</button>
          <button type="button" disabled={enviando} onClick={() => { fecharScanner(); abrir() }} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Informar valor manualmente</button>
          <button type="button" disabled={enviando} onClick={fecharScanner} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Cancelar</button>
        </div>
      </div>
    </Modal>
  </section>
}
