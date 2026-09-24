import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import { useSession } from "../../auth/session/sessionContext";
import { useAuthenticatedUser } from "../../auth/user/AuthenticatedUserContext";
import { useFamilyContext } from "../../family/session/familyContext";
import { aprovarSolicitacaoFamilia, buscarSolicitacoesFamilia, rejeitarSolicitacaoFamilia } from "../../family/api/familyApi";
import type { SolicitacaoFamiliaResponse } from "../../family/types/family";
import { buscarListas } from "../../shopping-lists/api/shoppingListsApi";
import { buscarCompra } from "../../shopping/api/shoppingApi";
import type { CompraResponse } from "../../shopping/types/shopping";
import {
  categoriaCompraLabels,
  statusListaCompraLabels,
  type ListaCompraResumoResponse,
} from "../../shopping-lists/types/shoppingList";

const papel = { ADMINISTRADOR: "Administrador(a)", MEMBRO: "Membro" } as const;
export function InicioPage() {

  function obterPeriodoDoDia() {
    let hora = new Date().getHours();
    if (hora < 12) {
      return {
        saudacao: "Bom dia!",
        cardClass:
          "border-yellow-200 border-l-yellow-500 bg-yellow-50",
      };
    }

    if (hora < 18) {
      return {
        saudacao: "Boa tarde!",
        cardClass:
          "border-[#f6d0c9] border-l-[#f79394] bg-[#fff1ee]",
      };
    }

    return {
      saudacao: "Boa noite!",
      cardClass:
        "border-blue-100 border-l-blue-700 bg-[#eef4ff]",
    };
  }

  const periodo = obterPeriodoDoDia();

  const { auth, logout } = useSession();
  const {
    usuario,
    loading: perfilLoading,
    error: perfilError,
    recarregarUsuario,
  } = useAuthenticatedUser();
  const { familiaSelecionada, recarregarFamilias } = useFamilyContext();
  const familiaSelecionadaId = familiaSelecionada?.id;
  const podeGerenciarSolicitacoes = familiaSelecionada?.contextoUsuario?.podeGerenciarIntegrantes === true;
  const [listas, setListas] = useState<ListaCompraResumoResponse[]>([]);
  const [familiaId, setFamiliaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [ultimaCompraFinalizada, setUltimaCompraFinalizada] = useState<CompraResponse | null>(null);
  const [familiaHistoricoId, setFamiliaHistoricoId] = useState<string | null>(null);
  const [erroHistorico, setErroHistorico] = useState(false);
  const [compraEmAndamento, setCompraEmAndamento] = useState<CompraResponse | null>(null);
  const [familiaCompraEmAndamentoId, setFamiliaCompraEmAndamentoId] = useState<string | null>(null);
  const [erroCompraEmAndamento, setErroCompraEmAndamento] = useState(false);
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoFamiliaResponse[]>([]);
  const [solicitacaoEmAnalise, setSolicitacaoEmAnalise] = useState<SolicitacaoFamiliaResponse | null>(null);
  const [decidindoSolicitacao, setDecidindoSolicitacao] = useState(false);
  const [erroSolicitacao, setErroSolicitacao] = useState<string | null>(null);
  const geracaoCarregamentoRef = useRef(0);
  const carregandoRef = useRef(false);
  const familiaCarregandoRef = useRef<string | null>(null);
  const carregar = useCallback(async (mostrarCarregamento = false) => {
    if (!auth || !familiaSelecionadaId) return;
    if (carregandoRef.current && familiaCarregandoRef.current === familiaSelecionadaId) return;
    carregandoRef.current = true;
    const geracao = ++geracaoCarregamentoRef.current;
    const familiaIdAtual = familiaSelecionadaId;
    familiaCarregandoRef.current = familiaIdAtual;
    if (mostrarCarregamento) {
      setLoading(true);
      setError(false);
    }
    setErroHistorico(false);
    setErroCompraEmAndamento(false);
    try {
      const requisicaoSolicitacoes = podeGerenciarSolicitacoes
        ? buscarSolicitacoesFamilia(auth.token, familiaIdAtual)
        : Promise.resolve({ data: [] as SolicitacaoFamiliaResponse[] });
      const response = await buscarListas(
        auth.token,
        familiaIdAtual,
      );
      if (geracao !== geracaoCarregamentoRef.current) return;
      const listasDaFamilia = response.data || [];
      setListas(listasDaFamilia);
      setFamiliaId(familiaIdAtual);
      const carregarCompras = async (status: "FINALIZADA" | "EM_COMPRA") => {
        const listasFiltradas = listasDaFamilia.filter((lista) => lista.status === status);
        if (listasFiltradas.length === 0) return [];
        return Promise.all(listasFiltradas.map((lista) => buscarCompra(auth.token, familiaIdAtual, lista.id)));
      };
      const [resultadoHistorico, resultadoAndamento, resultadoSolicitacoes] = await Promise.allSettled([
        carregarCompras("FINALIZADA"),
        carregarCompras("EM_COMPRA"),
        requisicaoSolicitacoes,
      ]);
      if (geracao !== geracaoCarregamentoRef.current) return;

      if (resultadoHistorico.status === "fulfilled") {
        const ultima = resultadoHistorico.value
          .filter((compra) => compra.status === "FINALIZADA" && compra.finalizadaEm)
          .sort((a, b) => Date.parse(b.finalizadaEm!) - Date.parse(a.finalizadaEm!))[0] || null;
        setUltimaCompraFinalizada(ultima);
        setFamiliaHistoricoId(familiaIdAtual);
      } else if ((resultadoHistorico.reason as ApiRequestError).status === 401) logout();
      else {
        setUltimaCompraFinalizada(null);
        setFamiliaHistoricoId(familiaIdAtual);
        setErroHistorico(true);
      }

      if (resultadoAndamento.status === "fulfilled") {
        const maisRecente = resultadoAndamento.value
          .filter((compra) => compra.status === "EM_ANDAMENTO" && compra.iniciadaEm)
          .sort((a, b) => Date.parse(b.iniciadaEm) - Date.parse(a.iniciadaEm))[0] || null;
        setCompraEmAndamento(maisRecente);
        setFamiliaCompraEmAndamentoId(familiaIdAtual);
      } else if ((resultadoAndamento.reason as ApiRequestError).status === 401) logout();
      else {
        setCompraEmAndamento(null);
        setFamiliaCompraEmAndamentoId(familiaIdAtual);
        setErroCompraEmAndamento(true);
      }
      if (resultadoSolicitacoes.status === "fulfilled") {
        setSolicitacoes(resultadoSolicitacoes.value.data || []);
      } else if ((resultadoSolicitacoes.reason as ApiRequestError).status === 401) {
        logout();
      } else {
        setSolicitacoes([]);
      }
    } catch (err) {
      if (geracao !== geracaoCarregamentoRef.current) return;
      if ((err as ApiRequestError).status === 401) logout();
      else {
        setError(true);
        setFamiliaId(familiaIdAtual);
      }
    } finally {
      if (mostrarCarregamento && geracao === geracaoCarregamentoRef.current) setLoading(false);
      if (geracao === geracaoCarregamentoRef.current) {
        carregandoRef.current = false;
        familiaCarregandoRef.current = null;
      }
    }
  }, [auth, familiaSelecionadaId, logout, podeGerenciarSolicitacoes]);
  useEffect(() => {
    void Promise.resolve().then(() => carregar(true));
  }, [carregar]);
  useEffect(() => {
    if (!auth || !familiaSelecionadaId) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const atualizar = () => { if (!document.hidden && navigator.onLine) void carregar(); };
    const iniciar = () => { if (!timer && !document.hidden && navigator.onLine) timer = setInterval(atualizar, 10_000); };
    const parar = () => { if (timer) { clearInterval(timer); timer = undefined; } };
    const aoMudarVisibilidade = () => { if (document.hidden) parar(); else { atualizar(); iniciar(); } };
    const aoFicarOnline = () => { atualizar(); iniciar(); };
    iniciar();
    window.addEventListener('focus', atualizar);
    window.addEventListener('online', aoFicarOnline);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);
    return () => {
      parar();
      window.removeEventListener('focus', atualizar);
      window.removeEventListener('online', aoFicarOnline);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [auth, familiaSelecionadaId, carregar]);
  if (!familiaSelecionada) return null;
  const listaEmPreparacao =
    familiaId === familiaSelecionada.id
      ? listas
        .filter((lista) => lista.status === "EM_PREPARACAO")
        .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm))
        .at(0)
      : undefined;
  const historicoCarregado = familiaHistoricoId === familiaSelecionada.id;
  const compraEmAndamentoVisivel = familiaCompraEmAndamentoId === familiaSelecionada.id && !erroCompraEmAndamento
    ? compraEmAndamento
    : null;
  async function decidirSolicitacao(acao: 'aprovar' | 'rejeitar') {
    if (!auth || !familiaSelecionada || !solicitacaoEmAnalise || !podeGerenciarSolicitacoes || decidindoSolicitacao) return;
    setDecidindoSolicitacao(true); setErroSolicitacao(null);
    try {
      if (acao === 'aprovar') await aprovarSolicitacaoFamilia(auth.token, familiaSelecionada.id, solicitacaoEmAnalise.id);
      else await rejeitarSolicitacaoFamilia(auth.token, familiaSelecionada.id, solicitacaoEmAnalise.id);
      setSolicitacaoEmAnalise(null);
      await recarregarFamilias(familiaSelecionada.id);
      await carregar();
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) { logout(); return; }
      if (apiError.status === 404 || apiError.status === 409) {
        setSolicitacaoEmAnalise(null);
        await carregar();
      } else setErroSolicitacao(apiError.message || 'Não foi possível concluir a solicitação.');
    } finally { setDecidindoSolicitacao(false); }
  }
  const formatarFinalizacao = (valor: string) => {
    const data = new Date(valor);
    const dataFormatada = data.toLocaleDateString("pt-BR");
    const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    if (Number.isNaN(data.getTime())) return `${dataFormatada} às ${horaFormatada}`;
    try {
      const diaDaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(data);
      const diaFormatado = diaDaSemana ? `${diaDaSemana[0].toUpperCase()}${diaDaSemana.slice(1)}` : "";
      return diaFormatado ? `${dataFormatada} · ${diaFormatado} às ${horaFormatada}` : `${dataFormatada} às ${horaFormatada}`;
    } catch {
      return `${dataFormatada} às ${horaFormatada}`;
    }
  };
  return (
    <section className="mx-auto max-w-3xl space-y-page py-page">
      <header className="space-y-gutter">
        <h1 className="text-headline-lg font-bold">
          {perfilLoading
            ? "Olá"
            : usuario
              ? `Olá, ${usuario.nome.split(" ")[0]}`
              : "Olá"}
          . {periodo.saudacao}
        </h1>
        {perfilError && (
          <button
            type="button"
            onClick={() => void recarregarUsuario()}
            className="text-label-lg font-semibold text-primary"
          >
            Tentar carregar perfil
          </button>
        )}
        <div className={`rounded-card border border-l-4 px-page pt-page pb-gutter shadow-soft ${periodo.cardClass}`}>
          <div className="font-semibold">
            <p>{papel[familiaSelecionada.papel]} da família:</p>
            <p>{familiaSelecionada.nome}</p>
          </div>

          <div className="mt-2 flex flex-col items-start gap-1 leading-tight">
            <Link
              to="/familia"
              className="text-label-lg font-semibold text-primary"
            >
              Minha família
            </Link>
          </div>
          {historicoCarregado && !erroHistorico && (
            <div className="mt-gutter border-t border-foreground/10 pt-gutter">
              {ultimaCompraFinalizada?.finalizadaEm ? (
                <>
                  <p className="font-semibold ">
                    Última compra finalizada: <br></br> <time dateTime={ultimaCompraFinalizada.finalizadaEm}>{formatarFinalizacao(ultimaCompraFinalizada.finalizadaEm)}</time>
                  </p>
                  <Link
                    to={`/listas/${ultimaCompraFinalizada.listaId}/compra/revisao`}
                    className="mt-1 inline-flex items-center py-1 text-label-lg font-semibold text-primary"
                  >
                    Ver compra
                  </Link>
                </>
              ) : <p className="text-body-md text-foreground-muted">Não há compras finalizadas ainda.</p>}
            </div>
          )}
        </div>

      </header>

      {podeGerenciarSolicitacoes && solicitacoes.length > 0 && (
        <section className="space-y-gutter rounded-card border border-amber-300 bg-amber-50 p-page shadow-soft" aria-label="Solicitações de ingresso">
          <div><h2 className="text-headline-md font-semibold">{solicitacoes.length === 1 ? 'Solicitação de ingresso' : `${solicitacoes.length} solicitações de ingresso pendentes`}</h2><p className="mt-1 text-body-md text-foreground-muted">{solicitacoes.length === 1 ? `${solicitacoes[0].solicitante.nome} quer entrar na família.` : 'Há solicitações aguardando sua análise.'}</p></div>
          <button type="button" onClick={() => { setErroSolicitacao(null); setSolicitacaoEmAnalise(solicitacoes[0]); }} className="min-h-touch rounded-control border border-amber-600 px-page font-semibold text-amber-900">{solicitacoes.length === 1 ? 'Analisar solicitação' : 'Analisar solicitações'}</button>
        </section>
      )}

      <hr style={{ border: '0', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />

      {!loading && !error && (compraEmAndamentoVisivel || listaEmPreparacao) && (
        <section className={`grid gap-page ${compraEmAndamentoVisivel && listaEmPreparacao ? "md:grid-cols-2" : ""}`}>
          {compraEmAndamentoVisivel && (
            <section className="space-y-gutter" aria-labelledby="compra-em-andamento">
              <h2 id="compra-em-andamento" className="text-headline-md font-semibold">Compra em andamento</h2>
              <Link to={`/listas/${compraEmAndamentoVisivel.listaId}/compra`} className="block space-y-1 rounded-card border border-primary/20 bg-primary/5 p-page shadow-soft">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">{categoriaCompraLabels[compraEmAndamentoVisivel.categoria]}</span>
                  <span className="rounded-full bg-primary/10 px-gutter py-1 text-label-md font-semibold text-primary">Em andamento</span>
                </div>
                <h3 className="font-semibold">{compraEmAndamentoVisivel.nomeLista}</h3>
                {compraEmAndamentoVisivel.estabelecimento && <p className="text-body-md text-foreground-muted">{compraEmAndamentoVisivel.estabelecimento}</p>}
                <span className="inline-flex min-h-touch items-center font-semibold text-primary">Acompanhar</span>
              </Link>
            </section>
          )}

          <Link
          to="/listas/nova"
          className="flex min-h-touch w-full items-center justify-center rounded-control border-2 border-primary bg-surface px-page font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Preparar nova lista de compras
        </Link>

          {listaEmPreparacao && (
            <section className={`space-y-gutter ${compraEmAndamentoVisivel ? "border-t border-foreground/10 pt-page md:border-t-0 md:border-l md:pt-0 md:pl-page" : ""}`} aria-labelledby="lista-em-preparacao">
              <h2 id="lista-em-preparacao" className="text-headline-md font-semibold">Lista em preparação</h2>
              <Link to={`/listas/${listaEmPreparacao.id}`} className="block space-y-1 rounded-card border border-foreground/10 bg-surface p-page shadow-soft">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">{categoriaCompraLabels[listaEmPreparacao.categoria]}</span>
                  <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md text-foreground-muted">{statusListaCompraLabels[listaEmPreparacao.status]}</span>
                </div>
                <h3 className="font-semibold">{listaEmPreparacao.nome}</h3>
                {listaEmPreparacao.estabelecimento && <p className="text-body-md text-foreground-muted">{listaEmPreparacao.estabelecimento}</p>}
                <span className="inline-flex min-h-touch items-center font-semibold text-primary">Abrir lista</span>
              </Link>
            </section>
          )}
        </section>
      )}

      {solicitacaoEmAnalise && <div role="dialog" aria-modal="true" aria-label="Analisar solicitação" className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-page"><section className="w-full max-w-md space-y-gutter rounded-card bg-surface p-page shadow-lg"><div><h2 className="text-headline-md font-semibold">Solicitação de ingresso</h2><p className="mt-2 font-semibold">{solicitacaoEmAnalise.solicitante.nome}</p><p className="text-body-md text-foreground-muted">{solicitacaoEmAnalise.solicitante.email}</p></div>{erroSolicitacao && <p role="alert" className="text-error">{erroSolicitacao}</p>}<div className="grid gap-gutter sm:grid-cols-3"><button type="button" disabled={decidindoSolicitacao} onClick={() => void decidirSolicitacao('aprovar')} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{decidindoSolicitacao ? 'Processando...' : 'Aprovar'}</button><button type="button" disabled={decidindoSolicitacao} onClick={() => void decidirSolicitacao('rejeitar')} className="min-h-touch rounded-control border border-error px-page font-semibold text-error disabled:opacity-60">Recusar</button><button type="button" disabled={decidindoSolicitacao} onClick={() => setSolicitacaoEmAnalise(null)} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold">Cancelar</button></div></section></div>}

    </section>
  );
}
