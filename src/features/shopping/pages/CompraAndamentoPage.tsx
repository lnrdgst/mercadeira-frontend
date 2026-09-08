import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import type { ApiRequestError } from '../../../shared/api/apiClient'
import { useSession } from '../../auth/session/sessionContext'
import { useFamilyContext } from '../../family/session/familyContext'
import { categoriaCompraLabels } from '../../shopping-lists/types/shoppingList'
import { adicionarItemCompra, buscarCompra, colocarItemNoCarrinho } from '../api/shoppingApi'
import { AdicionarItemCompraDialog } from '../components/AdicionarItemCompraDialog'
import { ItemCompraCard } from '../components/ItemCompraCard'
import type { AdicionarItemCompraRequest, CompraAtivaResponse, ItemCompraResponse } from '../types/shopping'

export function CompraAndamentoPage() {
  const { listaId } = useParams()
  const { auth, logout } = useSession()
  const { familiaSelecionada } = useFamilyContext()
  const familiaId = familiaSelecionada?.id
  const token = auth?.token
  const [tentativa, setTentativa] = useState(0)
  const [resultado, setResultado] = useState<{ chave: string; compra?: CompraAtivaResponse; erro?: string } | null>(null)
  const chave = `${familiaId}:${listaId}:${tentativa}`

  useEffect(() => {
    if (!token || !familiaId || !listaId) return
    let ativo = true
    void buscarCompra(token, familiaId, listaId).then((compra) => {
      if (ativo) setResultado({ chave, compra })
    }).catch((error: ApiRequestError) => {
      if (!ativo) return
      if (error.status === 401) { logout(); return }
      setResultado({ chave, erro: error.status === 404
        ? 'Esta compra ainda não está disponível.'
        : error.message || 'Não foi possível carregar a compra.' })
    })
    return () => { ativo = false }
  }, [token, familiaId, listaId, chave, logout])

  const carregando = resultado?.chave !== chave
  const compra = !carregando ? resultado?.compra : undefined
  const erro = !carregando ? resultado?.erro : undefined

  function atualizarItem(item: ItemCompraResponse, adicionar = false) {
    setResultado((atual) => {
      if (atual?.chave !== chave || !atual.compra || atual.compra.id !== compra?.id) return atual
      const itens = atual.compra.itens
      const existe = itens.some((existente) => existente.id === item.id)
      return { ...atual, compra: { ...atual.compra, itens: adicionar && !existe
        ? [...itens, item]
        : itens.map((existente) => existente.id === item.id ? item : existente) } }
    })
  }

  async function colocarNoCarrinho(itemId: string) {
    if (!token || !familiaId || !listaId || !compra?.contextoUsuario.participanteCompra) throw new Error('Não foi possível confirmar sua participação na compra.')
    atualizarItem(await colocarItemNoCarrinho(token, familiaId, listaId, itemId))
  }

  async function adicionarItem(data: AdicionarItemCompraRequest) {
    if (!token || !familiaId || !listaId || !compra?.contextoUsuario.participanteCompra) throw new Error('Não foi possível confirmar sua participação na compra.')
    atualizarItem(await adicionarItemCompra(token, familiaId, listaId, data), true)
  }

  return <section className="mx-auto max-w-3xl space-y-page">
    <Link to="/listas" className="inline-flex min-h-touch items-center font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">Voltar para listas</Link>
    {carregando && <p role="status" className="rounded-card bg-surface p-page text-foreground-muted shadow-soft">Carregando compra...</p>}
    {erro && <div role="alert" className="space-y-gutter rounded-card bg-error/10 p-page text-error">
      <h1 className="text-headline-md font-semibold">Compra em andamento</h1><p>{erro}</p>
      <button type="button" onClick={() => setTentativa((valor) => valor + 1)} className="min-h-touch rounded-control border border-current px-page font-semibold">Tentar novamente</button>
    </div>}
    {compra && <>
      <header className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary">Em andamento</span>
          <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md text-foreground-muted">{categoriaCompraLabels[compra.categoria]}</span>
        </div>
        <h1 className="break-words text-headline-lg font-bold">{compra.nomeLista}</h1>
        {compra.estabelecimento && <p className="break-words text-body-lg font-semibold text-primary">{compra.estabelecimento}</p>}
        <p className="text-body-md text-foreground-muted">Iniciada em <time dateTime={compra.iniciadaEm}>{new Date(compra.iniciadaEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</time></p>
      </header>
      <p className="rounded-card bg-primary/5 p-gutter text-body-md text-foreground-muted">{compra.contextoUsuario.participanteCompra ? 'Você participa desta compra.' : 'Você pode acompanhar esta compra, mas não participa dela.'}</p>
      <section className="space-y-gutter" aria-labelledby="compra-itens">
        {compra.contextoUsuario.participanteCompra && <AdicionarItemCompraDialog key={chave} onAdicionar={adicionarItem} />}
        <div className="flex items-center justify-between gap-gutter"><h2 id="compra-itens" className="text-headline-md font-semibold">Itens da compra</h2><span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md">{compra.itens.length} {compra.itens.length === 1 ? 'item' : 'itens'}</span></div>
        {compra.itens.length === 0 && <p className="text-foreground-muted">Esta compra não possui itens.</p>}
        <ul className="space-y-gutter">
          {[...compra.itens].sort((a, b) => a.ordemExibicao - b.ordemExibicao).map((item) => <ItemCompraCard key={`${chave}:${item.id}`} item={item} participante={compra.contextoUsuario.participanteCompra} onColocar={colocarNoCarrinho} />)}
        </ul>
      </section>
      <section className="space-y-gutter" aria-labelledby="compra-participantes">
        <h2 id="compra-participantes" className="text-headline-md font-semibold">Participantes</h2>
        {compra.participantes.length === 0 && <p className="text-foreground-muted">Esta compra não possui participantes.</p>}
        <ul className="grid gap-gutter sm:grid-cols-2">
          {compra.participantes.map((participante) => <li key={participante.id} className="min-w-0 break-words rounded-card bg-surface p-page shadow-soft"><p className="font-semibold">{participante.nome}</p><p className="text-label-lg text-foreground-muted">{participante.papel === 'ADMINISTRADOR' ? 'Administrador' : 'Membro'}</p></li>)}
        </ul>
      </section>
    </>}
  </section>
}
