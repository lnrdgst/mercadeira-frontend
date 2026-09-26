import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import { useSession } from "../../auth/session/sessionContext";
import { useFamilyContext } from "../../family/session/familyContext";
import { IniciarCompraButton } from "../../shopping/components/IniciarCompraButton";
import { EditarDadosLista } from "../components/EditarDadosLista";
import { ItemForm } from "../components/ItemForm";
import { ConfirmarRemocaoItemDialog } from "../components/ConfirmarRemocaoItemDialog";
import {
  adicionarParticipanteLista,
  atualizarItemLista,
  buscarItensLista,
  buscarLista,
  buscarMembrosFamilia,
  buscarParticipantesLista,
  criarItemLista,
  excluirLista,
  reordenarItensLista,
  removerItemLista,
  removerParticipanteLista,
} from "../api/shoppingListsApi";
import type {
  ItemListaCompraResponse,
  ListaCompraDetalheResponse,
  MembroFamiliaResponse,
  ParticipanteListaResponse,
  SalvarItemListaRequest,
} from "../types/shoppingList";
import {
  categoriaCompraLabels,
  statusListaCompraLabels,
  unidadeMedidaLabels,
} from "../types/shoppingList";
import { ConfirmacaoSensivelDialog } from "../../family/components/ConfirmacaoSensivelDialog";

function nomeCompacto(
  nome: string,
  repetidos: Map<string, number>,
  indice: number,
) {
  const partes = nome.trim().split(/\s+/);
  const primeiro = partes[0] || nome;
  if ((repetidos.get(primeiro) || 0) < 2) return primeiro;
  const ultimo = partes.at(-1);
  return ultimo && ultimo !== primeiro
    ? `${primeiro} ${ultimo[0]}.`
    : `${primeiro} ${indice + 1}`;
}

export function ListaDetalhePage() {
  const { listaId } = useParams();
  const navigate = useNavigate();
  const { auth, logout } = useSession();
  const { familiaSelecionada } = useFamilyContext();
  const [detalhe, setDetalhe] = useState<ListaCompraDetalheResponse | null>(
    null,
  );
  const [participantes, setParticipantes] = useState<
    ParticipanteListaResponse[]
  >([]);
  const [membros, setMembros] = useState<MembroFamiliaResponse[]>([]);
  const [itens, setItens] = useState<ItemListaCompraResponse[]>([]);
  const [detalheKey, setDetalheKey] = useState<string | null>(null);
  const [participantesKey, setParticipantesKey] = useState<string | null>(
    null,
  );
  const [itensKey, setItensKey] = useState<string | null>(null);
  const [membrosFamiliaId, setMembrosFamiliaId] = useState<string | null>(
    null,
  );
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [carregandoParticipantes, setCarregandoParticipantes] =
    useState(false);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const [erroParticipantes, setErroParticipantes] = useState<string | null>(
    null,
  );
  const [erroItens, setErroItens] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [membroParaAdicionar, setMembroParaAdicionar] = useState("");
  const [adicionandoParticipante, setAdicionandoParticipante] =
    useState(false);
  const [confirmandoSaida, setConfirmandoSaida] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [excluindoLista, setExcluindoLista] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const [operacaoParticipante, setOperacaoParticipante] = useState<
    string | null
  >(null);
  const [itemEditando, setItemEditando] = useState<
    ItemListaCompraResponse | null | "novo"
  >(null);
  const [itemParaRemover, setItemParaRemover] =
    useState<ItemListaCompraResponse | null>(null);
  const [operacaoItem, setOperacaoItem] = useState<string | null>(null);
  const [reordenando, setReordenando] = useState(false);
  const itemDialogRef = useRef<HTMLDialogElement>(null);
  const itensTituloRef = useRef<HTMLHeadingElement>(null);
  const dialogOpenerRef = useRef<HTMLElement | null>(null);
  const dialogScrollYRef = useRef(0);
  const leituraPeriodicaRef = useRef<AbortController | null>(null);
  const geracaoRef = useRef(0);
  const mutacaoRef = useRef(false);
  const chave =
    familiaSelecionada && listaId
      ? `${familiaSelecionada.id}:${listaId}`
      : null;

  const carregarDetalhe = useCallback(async () => {
    if (!auth || !familiaSelecionada || !listaId || !chave) return;
    setCarregandoDetalhe(true);
    setErroDetalhe(null);
    try {
      const response = await buscarLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
      );
      setDetalhe(response.data);
      setDetalheKey(chave);
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else {
        setDetalhe(null);
        setDetalheKey(chave);
        setErroDetalhe(
          apiError.message || "Não foi possível carregar a lista.",
        );
      }
    } finally {
      setCarregandoDetalhe(false);
    }
  }, [auth, chave, familiaSelecionada, listaId, logout]);
  const carregarParticipantes = useCallback(async () => {
    if (!auth || !familiaSelecionada || !listaId || !chave) return;
    setCarregandoParticipantes(true);
    setErroParticipantes(null);
    try {
      const response = await buscarParticipantesLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
      );
      setParticipantes(response.data || []);
      setParticipantesKey(chave);
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else {
        setParticipantes([]);
        setParticipantesKey(chave);
        setErroParticipantes(
          apiError.message ||
          "Não foi possível carregar os participantes.",
        );
      }
    } finally {
      setCarregandoParticipantes(false);
    }
  }, [auth, chave, familiaSelecionada, listaId, logout]);
  const carregarItens = useCallback(async () => {
    if (!auth || !familiaSelecionada || !listaId || !chave) return;
    setCarregandoItens(true);
    setErroItens(null);
    try {
      const response = await buscarItensLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
      );
      setItens(response.data || []);
      setItensKey(chave);
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else {
        setItens([]);
        setItensKey(chave);
        setErroItens(
          apiError.message || "Não foi possível carregar os itens.",
        );
      }
    } finally {
      setCarregandoItens(false);
    }
  }, [auth, chave, familiaSelecionada, listaId, logout]);
  const carregarMembros = useCallback(async () => {
    if (
      !auth ||
      !familiaSelecionada ||
      !detalhe?.contextoUsuario.podeGerenciarParticipantes
    )
      return;
    try {
      const response = await buscarMembrosFamilia(
        auth.token,
        familiaSelecionada.id,
      );
      setMembros(response.data || []);
      setMembrosFamiliaId(familiaSelecionada.id);
    } catch (error) {
      if ((error as ApiRequestError).status === 401) logout();
    }
  }, [
    auth,
    detalhe?.contextoUsuario.podeGerenciarParticipantes,
    familiaSelecionada,
    logout,
  ]);
  useEffect(() => {
    void Promise.resolve().then(carregarDetalhe);
  }, [carregarDetalhe]);
  useEffect(() => {
    void Promise.resolve().then(carregarParticipantes);
  }, [carregarParticipantes]);
  useEffect(() => {
    void Promise.resolve().then(carregarItens);
  }, [carregarItens]);
  useEffect(() => {
    void Promise.resolve().then(carregarMembros);
  }, [carregarMembros]);
  useEffect(() => {
    if (
      !auth ||
      !familiaSelecionada ||
      !listaId ||
      detalhe?.status !== "EM_PREPARACAO"
    )
      return;
    let encerrado = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    let ultimaConsulta = 0;
    const reconciliar = async () => {
      if (
        encerrado ||
        document.visibilityState !== "visible" ||
        !navigator.onLine ||
        mutacaoRef.current ||
        leituraPeriodicaRef.current ||
        Date.now() - ultimaConsulta < 1_000
      )
        return;
      const controller = new AbortController();
      const versao = geracaoRef.current;
      leituraPeriodicaRef.current = controller;
      ultimaConsulta = Date.now();
      try {
        const [
          listaAtualizada,
          participantesAtualizados,
          itensAtualizados,
        ] = await Promise.all([
          buscarLista(
            auth.token,
            familiaSelecionada.id,
            listaId,
            controller.signal,
          ),
          buscarParticipantesLista(
            auth.token,
            familiaSelecionada.id,
            listaId,
            controller.signal,
          ),
          buscarItensLista(
            auth.token,
            familiaSelecionada.id,
            listaId,
            controller.signal,
          ),
        ]);
        if (
          encerrado ||
          controller.signal.aborted ||
          versao !== geracaoRef.current
        )
          return;
        setDetalhe(listaAtualizada.data);
        setDetalheKey(chave);
        setParticipantes(participantesAtualizados.data || []);
        setParticipantesKey(chave);
        setItens(itensAtualizados.data || []);
        setItensKey(chave);
      } catch (error) {
        if (
          !encerrado &&
          !controller.signal.aborted &&
          versao === geracaoRef.current &&
          (error as ApiRequestError).status === 401
        ) {
          encerrado = true;
          clearInterval(timer);
          logout();
        }
      } finally {
        if (leituraPeriodicaRef.current === controller)
          leituraPeriodicaRef.current = null;
      }
    };
    const agendar = () => {
      clearInterval(timer);
      if (
        !encerrado &&
        document.visibilityState === "visible" &&
        navigator.onLine
      )
        timer = setInterval(() => void reconciliar(), 5_000);
    };
    const disponibilidade = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        clearInterval(timer);
        leituraPeriodicaRef.current?.abort();
        leituraPeriodicaRef.current = null;
        ultimaConsulta = 0;
      } else {
        void reconciliar();
        agendar();
      }
    };
    const foco = () => void reconciliar();
    agendar();
    document.addEventListener("visibilitychange", disponibilidade);
    window.addEventListener("focus", foco);
    window.addEventListener("offline", disponibilidade);
    window.addEventListener("online", disponibilidade);
    return () => {
      encerrado = true;
      clearInterval(timer);
      leituraPeriodicaRef.current?.abort();
      leituraPeriodicaRef.current = null;
      document.removeEventListener("visibilitychange", disponibilidade);
      window.removeEventListener("focus", foco);
      window.removeEventListener("offline", disponibilidade);
      window.removeEventListener("online", disponibilidade);
    };
  }, [auth, familiaSelecionada, listaId, chave, detalhe?.status, logout]);
  useEffect(() => {
    const dialog = itemDialogRef.current;
    if (!dialog) return;
    if (itemEditando && !dialog.open) {
      dialogOpenerRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      dialogScrollYRef.current = window.scrollY;
      dialog.showModal();
    }
    if (!itemEditando && dialog.open) dialog.close();
  }, [itemEditando]);
  if (!familiaSelecionada || !listaId || !chave) return null;
  const lista = detalheKey === chave ? detalhe : null;
  const listaParticipantes = participantesKey === chave ? participantes : [];
  const listaItens = itensKey === chave ? itens : [];
  const itensProntos = itensKey === chave && !carregandoItens && !erroItens;
  const emPreparacao = lista?.status === "EM_PREPARACAO";
  const podeGerenciar =
    emPreparacao &&
    lista?.contextoUsuario.podeGerenciarParticipantes === true;
  const podeAlterar =
    emPreparacao && lista?.contextoUsuario.podeAlterarItens === true;
  const podeSairDaLista =
    emPreparacao && lista?.contextoUsuario.podeSairDaLista === true;
  const podeExcluirLista = lista?.contextoUsuario.podeExcluirLista === true;
  const candidatos =
    membrosFamiliaId === familiaSelecionada.id
      ? membros.filter(
        (membro) =>
          !listaParticipantes.some(
            (participante) =>
              participante.membroFamiliaId ===
              membro.membroFamiliaId,
          ),
      )
      : [];
  const participantesOrdenados = [...listaParticipantes].sort(
    (a, b) =>
      Number(b.membroFamiliaId === lista?.criador.membroFamiliaId) -
      Number(a.membroFamiliaId === lista?.criador.membroFamiliaId),
  );
  const primeirosNomes = participantesOrdenados.reduce(
    (nomes, participante) => {
      const primeiro =
        participante.nome.trim().split(/\s+/)[0] || participante.nome;
      nomes.set(primeiro, (nomes.get(primeiro) || 0) + 1);
      return nomes;
    },
    new Map<string, number>(),
  );

  function fecharDialog() {
    setItemEditando(null);
    requestAnimationFrame(() => {
      window.scrollTo({
        top: dialogScrollYRef.current,
        behavior: "auto",
      });
      dialogOpenerRef.current?.focus({ preventScroll: true });
    });
  }

  function atualizarEstadoMutacao(emAndamento: boolean) {
    if (emAndamento) {
      geracaoRef.current += 1;
      leituraPeriodicaRef.current?.abort();
    }
    mutacaoRef.current = emAndamento;
  }

  async function atualizarParticipante(
    membroFamiliaId: string,
    remover = false,
  ) {
    if (
      !auth ||
      !lista ||
      !familiaSelecionada ||
      !listaId ||
      !podeGerenciar
    )
      return;
    geracaoRef.current += 1;
    leituraPeriodicaRef.current?.abort();
    mutacaoRef.current = true;
    setOperacaoParticipante(membroFamiliaId);
    setFeedback(null);
    try {
      if (remover)
        await removerParticipanteLista(
          auth.token,
          familiaSelecionada.id,
          listaId,
          membroFamiliaId,
        );
      else
        await adicionarParticipanteLista(
          auth.token,
          familiaSelecionada.id,
          listaId,
          membroFamiliaId,
        );
      setFeedback(
        remover ? "Participante removido." : "Participante adicionado.",
      );
      await Promise.all([carregarDetalhe(), carregarParticipantes()]);
      if (!remover) {
        setMembroParaAdicionar("");
        setAdicionandoParticipante(false);
      }
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else
        setFeedback(
          apiError.message ||
          "Não foi possível atualizar os participantes.",
        );
    } finally {
      mutacaoRef.current = false;
      setOperacaoParticipante(null);
    }
  }
  async function sairDaLista() {
    if (
      !auth ||
      !lista ||
      !familiaSelecionada ||
      !listaId ||
      !podeSairDaLista
    )
      return;
    const membroFamiliaId = lista.contextoUsuario.membroFamiliaId;
    geracaoRef.current += 1;
    leituraPeriodicaRef.current?.abort();
    mutacaoRef.current = true;
    setOperacaoParticipante(membroFamiliaId);
    setFeedback(null);
    try {
      await removerParticipanteLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
        membroFamiliaId,
      );
      setConfirmandoSaida(false);
      setFeedback("Você saiu da lista.");
      await Promise.all([carregarDetalhe(), carregarParticipantes()]);
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else
        setFeedback(
          apiError.message || "Não foi possível sair da lista.",
        );
    } finally {
      mutacaoRef.current = false;
      setOperacaoParticipante(null);
    }
  }
  async function excluirListaAtual() {
    if (
      !auth ||
      !lista ||
      !familiaSelecionada ||
      !listaId ||
      !podeExcluirLista
    )
      return;
    atualizarEstadoMutacao(true);
    setExcluindoLista(true);
    setErroExclusao(null);
    try {
      await excluirLista(auth.token, familiaSelecionada.id, listaId);
      setConfirmandoExclusao(false);
      navigate("/listas", { replace: true });
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else
        setErroExclusao(
          apiError.message || "Não foi possível excluir a lista.",
        );
    } finally {
      mutacaoRef.current = false;
      setExcluindoLista(false);
    }
  }
  async function salvarItem(data: SalvarItemListaRequest) {
    if (!auth || !lista || !familiaSelecionada || !listaId || !podeAlterar)
      return;
    geracaoRef.current += 1;
    leituraPeriodicaRef.current?.abort();
    mutacaoRef.current = true;
    setOperacaoItem(
      itemEditando === "novo" ? "novo" : itemEditando?.id || null,
    );
    setFeedback(null);
    try {
      if (itemEditando && itemEditando !== "novo") {
        const response = await atualizarItemLista(
          auth.token,
          familiaSelecionada.id,
          listaId,
          itemEditando.id,
          data,
        );
        if (response.data)
          setItens(
            listaItens.map((item) =>
              item.id === response.data?.id
                ? response.data
                : item,
            ),
          );
        setFeedback("Item salvo.");
        fecharDialog();
        return;
      }

      const response = await criarItemLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
        data,
      );
      if (!response.data)
        throw new Error("Não foi possível criar o item.");
      const novaOrdem = [response.data, ...listaItens];
      setItens(novaOrdem);
      await reordenarItensLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
        novaOrdem.map((item) => item.id),
      );
      setFeedback("Item adicionado.");
      fecharDialog();
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else {
        if (itemEditando === "novo") await carregarItens();
        setFeedback(
          apiError.message || "Não foi possível salvar o item.",
        );
      }
    } finally {
      mutacaoRef.current = false;
      setOperacaoItem(null);
    }
  }
  async function removerItem() {
    if (
      !auth ||
      !itemParaRemover ||
      !familiaSelecionada ||
      !listaId ||
      !podeAlterar
    )
      return;
    geracaoRef.current += 1;
    leituraPeriodicaRef.current?.abort();
    mutacaoRef.current = true;
    setOperacaoItem(itemParaRemover.id);
    setFeedback(null);
    try {
      await removerItemLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
        itemParaRemover.id,
      );
      setFeedback("Item removido.");
      await carregarItens();
      setItemParaRemover(null);
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else throw error;
    } finally {
      mutacaoRef.current = false;
      setOperacaoItem(null);
    }
  }
  async function moverItem(indice: number, direcao: -1 | 1) {
    if (
      !auth ||
      !familiaSelecionada ||
      !listaId ||
      reordenando ||
      !podeAlterar
    )
      return;
    const botaoFocado =
      document.activeElement instanceof HTMLButtonElement
        ? document.activeElement
        : null;
    const destino = indice + direcao;
    if (destino < 0 || destino >= listaItens.length) return;
    const ordem = [...listaItens];
    [ordem[indice], ordem[destino]] = [ordem[destino], ordem[indice]];
    geracaoRef.current += 1;
    leituraPeriodicaRef.current?.abort();
    mutacaoRef.current = true;
    setItens(ordem);
    setReordenando(true);
    try {
      await reordenarItensLista(
        auth.token,
        familiaSelecionada.id,
        listaId,
        ordem.map((item) => item.id),
      );
    } catch (error) {
      const apiError = error as ApiRequestError;
      setItens(listaItens);
      if (apiError.status === 401) logout();
      else
        setFeedback(
          apiError.message || "Não foi possível reordenar os itens.",
        );
    } finally {
      mutacaoRef.current = false;
      setReordenando(false);
      botaoFocado?.focus({ preventScroll: true });
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-page py-page">
      <Link
        to="/listas"
        className="inline-flex min-h-touch items-center gap-2 font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m15 18-6-6 6-6" />
        </svg>
        Voltar para listas
      </Link>

      {feedback && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-card bg-primary/10 p-gutter text-primary"
        >
          {feedback}
        </p>
      )}

      {(carregandoDetalhe || detalheKey !== chave) && (
        <p className="text-body-md text-foreground-muted">
          Carregando lista...
        </p>
      )}

      {!carregandoDetalhe && erroDetalhe && (
        <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
          <p>{erroDetalhe}</p>
          <button
            type="button"
            onClick={() => void carregarDetalhe()}
            className="min-h-touch rounded-control border border-current px-page font-semibold"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {lista && (
        <>
          <header className="space-y-page rounded-card bg-surface p-page shadow-soft">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-foreground/20 bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">
                {statusListaCompraLabels[lista.status]}
              </span>
              <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md text-foreground-muted">
                {categoriaCompraLabels[lista.categoria]}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-gutter">
              <EditarDadosLista
                key={chave}
                familiaId={familiaSelecionada.id}
                lista={lista}
                onAtualizada={(atualizada) => {
                  setDetalhe(atualizada);
                  setDetalheKey(chave);
                }}
                onMutacao={atualizarEstadoMutacao}
              />
              {podeExcluirLista && (
                <button
                  type="button"
                  onClick={() => {
                    setErroExclusao(null);
                    setConfirmandoExclusao(true);
                  }}
                  className="flex h-11 w-11 items-center justify-center rounded-control border border-error text-error transition-colors hover:bg-error/10"
                  aria-label="Excluir lista"
                >
                  {/* Ícone de lixeira nativo em SVG */}
                  <svg
                    xmlns="http://w3.org"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                </button>

              )}
            </div>

            <div className="flex flex-wrap items-start justify-between gap-gutter">
              <div className="min-w-0 space-y-1">
                <h1 className="break-words text-headline-lg font-bold">
                  {lista.nome}
                </h1>
                {lista.estabelecimento && (
                  <p className="text-body-md text-foreground-muted">
                    {lista.estabelecimento}
                  </p>
                )}
                <p className="text-label-lg text-foreground-muted">
                  Criada por {lista.criador.nome}
                </p>
              </div>

            </div>

            <section
              aria-labelledby="lista-participantes-titulo"
              className="rounded-card border border-primary/20 bg-primary/5 p-gutter"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-headline-md font-semibold">
                  Participantes
                </h2>

                {podeGerenciar && candidatos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setAdicionandoParticipante(true)}
                    className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control border border-primary px-gutter font-semibold text-primary transition-colors hover:bg-primary/5"
                    aria-label="Adicionar participante"
                  >
                    <span>Adicionar</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" x2="19" y1="8" y2="14" />
                      <line x1="16" x2="22" y1="11" y2="11" />
                    </svg>

                  </button>
                )}
              </div>

              {carregandoParticipantes ||
                participantesKey !== chave ? (
                <p className="text-body-md text-foreground-muted">
                  Carregando participantes...
                </p>
              ) : erroParticipantes ? (
                <div className="space-y-gutter rounded-card bg-error/10 p-gutter text-error">
                  <p>{erroParticipantes}</p>
                  <button
                    type="button"
                    onClick={() =>
                      void carregarParticipantes()
                    }
                    className="min-h-touch rounded-control border border-current px-page font-semibold"
                  >
                    Tentar novamente
                  </button>
                </div>
              ) : (
                <ul className="mt-2 space-y-1">
                  {participantesOrdenados.map(
                    (participante, indice) => {
                      const criador =
                        participante.membroFamiliaId ===
                        lista.criador.membroFamiliaId;
                      const proprio =
                        participante.membroFamiliaId ===
                        lista.contextoUsuario
                          .membroFamiliaId;
                      const nome = nomeCompacto(
                        participante.nome,
                        primeirosNomes,
                        indice,
                      );
                      return (
                        <li
                          key={
                            participante.membroFamiliaId
                          }
                          className="flex min-h-touch items-center justify-between gap-gutter rounded-control bg-foreground/5 px-gutter"
                        >
                          <span
                            className="min-w-0 truncate font-semibold"
                            title={
                              participante.nome
                            }
                          >
                            {nome}
                            {criador
                              ? " \u00b7 Criador"
                              : proprio
                                ? " (você)"
                                : ""}
                          </span>
                          {proprio &&
                            !criador &&
                            podeSairDaLista ? (
                            <button
                              type="button"
                              disabled={
                                operacaoParticipante !==
                                null
                              }
                              onClick={() =>
                                setConfirmandoSaida(
                                  true,
                                )
                              }
                              aria-label={`Sair da lista como ${participante.nome}`}
                              title="Sair da lista"
                              className="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-control text-error hover:bg-error/10 disabled:opacity-60"
                            >
                              {"×"}
                            </button>
                          ) : (
                            podeGerenciar &&
                            !criador && (
                              <button
                                type="button"
                                disabled={
                                  operacaoParticipante ===
                                  participante.membroFamiliaId
                                }
                                onClick={() =>
                                  void atualizarParticipante(
                                    participante.membroFamiliaId,
                                    true,
                                  )
                                }
                                aria-label={`Remover ${participante.nome} da lista`}
                                title={`Remover ${participante.nome} da lista`}
                                className="flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-control text-error hover:bg-error/10 disabled:opacity-60"
                              >
                                {"\u00d7"}
                              </button>
                            )
                          )}
                        </li>
                      );
                    },
                  )}
                </ul>
              )}

              {confirmandoSaida && (
                <div
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="sair-lista-titulo"
                  className="mt-gutter space-y-gutter rounded-card border border-foreground/10 bg-foreground/5 p-gutter"
                >
                  <h3
                    id="sair-lista-titulo"
                    className="text-body-lg font-semibold"
                  >
                    Sair desta lista?
                  </h3>
                  <p className="text-body-md text-foreground-muted">
                    Você deixará de participar desta lista.
                    Para voltar depois, um responsável pela
                    lista precisará adicioná-lo novamente.
                  </p>
                  <div className="flex flex-wrap gap-gutter">
                    <button
                      type="button"
                      disabled={
                        operacaoParticipante !== null
                      }
                      onClick={() => void sairDaLista()}
                      className="min-h-touch rounded-control border border-amber-600 bg-amber-50 px-page font-semibold text-amber-700 disabled:opacity-60"
                    >
                      Confirmar saída
                    </button>
                    <button
                      type="button"
                      disabled={
                        operacaoParticipante !== null
                      }
                      onClick={() =>
                        setConfirmandoSaida(false)
                      }
                      className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}

              {!lista.contextoUsuario.participanteAtivo &&
                podeGerenciar && (
                  <button
                    type="button"
                    onClick={() =>
                      void atualizarParticipante(
                        lista.contextoUsuario
                          .membroFamiliaId,
                      )
                    }
                    disabled={operacaoParticipante !== null}
                    className="mt-3 min-h-touch w-full rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60"
                  >
                    Participar desta lista
                  </button>
                )}
            </section>
          </header>

          {confirmandoExclusao && (
            <ConfirmacaoSensivelDialog
              titulo="Excluir esta lista?"
              descricao="Esta ação excluirá definitivamente a lista em preparação, seus itens e participantes. Ela não poderá ser desfeita."
              rotuloConfirmar="Excluir lista"
              rotuloProcessando="Excluindo lista..."
              corSemantica="error"
              enviando={excluindoLista}
              erro={erroExclusao}
              onConfirmar={() => void excluirListaAtual()}
              onCancelar={() => {
                if (!excluindoLista) {
                  setConfirmandoExclusao(false);
                  setErroExclusao(null);
                }
              }}
            />
          )}

          {adicionandoParticipante && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="adicionar-participante-titulo"
              className="fixed inset-0 z-50 flex items-end bg-foreground/40 p-gutter sm:items-center sm:justify-center"
              onMouseDown={(event) => {
                if (
                  event.target === event.currentTarget &&
                  operacaoParticipante === null
                )
                  setAdicionandoParticipante(false);
              }}
            >
              <div className="w-full max-w-md space-y-gutter rounded-card bg-surface p-page shadow-soft">
                <h2
                  id="adicionar-participante-titulo"
                  className="text-headline-md font-semibold"
                >
                  Adicionar participante
                </h2>
                <label className="block space-y-1">
                  <span>Participante</span>
                  <select
                    autoFocus
                    value={membroParaAdicionar}
                    onChange={(event) =>
                      setMembroParaAdicionar(
                        event.target.value,
                      )
                    }
                    className="min-h-touch w-full rounded-control border border-foreground/20 bg-background px-gutter"
                  >
                    <option value="">
                      Selecione uma pessoa
                    </option>
                    {candidatos.map((membro) => (
                      <option
                        key={membro.membroFamiliaId}
                        value={membro.membroFamiliaId}
                      >
                        {membro.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex flex-wrap gap-gutter">
                  <button
                    type="button"
                    disabled={
                      !membroParaAdicionar ||
                      operacaoParticipante !== null
                    }
                    onClick={() =>
                      void atualizarParticipante(
                        membroParaAdicionar,
                      )
                    }
                    className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
                  >
                    Adicionar
                  </button>
                  <button
                    type="button"
                    disabled={operacaoParticipante !== null}
                    onClick={() => {
                      setMembroParaAdicionar("");
                      setAdicionandoParticipante(false);
                    }}
                    className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {lista.status === "EM_COMPRA" && (
            <div className="space-y-gutter rounded-card border border-primary/20 bg-primary/5 p-page">
              <p>
                A lista saiu do modo de preparação. Acompanhe os
                participantes e itens registrados na compra.
              </p>
              <Link
                to={`/listas/${listaId}/compra`}
                className="inline-flex min-h-touch items-center rounded-control bg-primary px-page font-semibold text-surface"
              >
                Ver compra em andamento
              </Link>
            </div>
          )}

          <section className="space-y-gutter">
            <div className="w-full [&>button]:w-full">
              <div className="text-center">
                <h2
                  ref={itensTituloRef}
                  tabIndex={-1}
                  className="text-headline-md font-semibold"
                >
                  Itens
                </h2>

                <p className="text-body-md text-foreground-muted">
                  {emPreparacao
                    ? "Itens em preparação para esta compra."
                    : "Itens da lista. A preparação está encerrada."}
                </p>
              </div>

              {podeAlterar && itemEditando === null && (
                <button
                  type="button"
                  onClick={() => setItemEditando("novo")}
                  className="mt-gutter flex min-h-touch w-full items-center justify-center gap-2 rounded-control border-2 border-primary bg-surface px-page font-semibold text-primary transition-colors hover:bg-primary/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Adicionar item na lista
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    className="size-5 fill-none stroke-current"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>
              )}
            </div>

            <dialog
              ref={itemDialogRef}
              onClose={fecharDialog}
              className="m-auto flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden rounded-card bg-surface p-0 text-foreground shadow-soft backdrop:bg-foreground/40"
            >
              {podeAlterar && itemEditando && (
                <ItemForm
                  listaId={lista.id}
                  categoria={lista.categoria}
                  item={
                    itemEditando === "novo"
                      ? undefined
                      : itemEditando
                  }
                  submitting={operacaoItem !== null}
                  stickyActions
                  onCancel={fecharDialog}
                  onSubmit={salvarItem}
                />
              )}
            </dialog>

            {podeAlterar && itemParaRemover && (
              <ConfirmarRemocaoItemDialog
                key={`${chave}:${itemParaRemover.id}`}
                descricao={itemParaRemover.descricao}
                focoAposRemocao={itensTituloRef}
                onConfirmar={removerItem}
                onCancelar={() => setItemParaRemover(null)}
              />
            )}

            {carregandoItens || itensKey !== chave ? (
              <p className="text-body-md text-foreground-muted">
                Carregando itens...
              </p>
            ) : erroItens ? (
              <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
                <p>{erroItens}</p>

                <button
                  type="button"
                  onClick={() => void carregarItens()}
                  className="min-h-touch rounded-control border border-current px-page font-semibold"
                >
                  Tentar novamente
                </button>
              </div>
            ) : listaItens.length === 0 ? (
              <div className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">
                {podeAlterar
                  ? "Nenhum item adicionado ainda."
                  : "Esta lista ainda não possui itens."}
              </div>
            ) : (
              <ul className="space-y-2">
                {listaItens.map((item, indice) => (
                  <li
                    key={item.id}
                    className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-card bg-surface px-page py-gutter shadow-soft"
                  >
                    {/* Mover item */}
                    {podeAlterar && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          disabled={indice === 0 || operacaoItem !== null}
                          onClick={() => void moverItem(indice, -1)}
                          aria-label={`Mover ${item.descricao} para cima`}
                          title={`Mover ${item.descricao} para cima`}
                          className="flex size-10 items-center justify-center rounded-control text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-5 fill-none stroke-current"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m18 15-6-6-6 6" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          disabled={
                            indice === listaItens.length - 1 ||
                            operacaoItem !== null
                          }
                          onClick={() => void moverItem(indice, 1)}
                          aria-label={`Mover ${item.descricao} para baixo`}
                          title={`Mover ${item.descricao} para baixo`}
                          className="flex size-10 items-center justify-center rounded-control text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-30"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-5 fill-none stroke-current"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m6 9 6 6 6-6" />
                          </svg>
                        </button>
                      </div>
                    )}

                    {/* Dados do item */}
                    <div className="min-w-0 text-center">
                      <h3 className="truncate text-body-lg font-semibold">
                        {item.descricao}
                      </h3>

                      {(item.quantidade !== null || item.marca) && (
                        <p className="text-body-md text-foreground-muted">
                          {item.quantidade !== null &&
                            `${item.quantidade}${item.unidadeMedida
                              ? ` ${unidadeMedidaLabels[item.unidadeMedida]}`
                              : ""
                            }`}

                          {item.quantidade !== null && item.marca && " · "}

                          {item.marca}
                        </p>
                      )}

                      {item.observacoes && (
                        <p className="mt-1 line-clamp-2 text-label-md text-foreground-muted">
                          {item.observacoes}
                        </p>
                      )}
                    </div>

                    {/* Editar / remover */}
                    {podeAlterar && (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => setItemEditando(item)}
                          aria-label={`Editar ${item.descricao}`}
                          title="Alterar item"
                          className="flex size-10 items-center justify-center rounded-control text-primary transition-colors hover:bg-primary"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-5 fill-none stroke-current"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          onClick={() => setItemParaRemover(item)}
                          aria-label={`Remover ${item.descricao} da lista`}
                          title="Remover da lista"
                          className="flex size-10 items-center justify-center rounded-control text-error transition-colors hover:bg-error/10"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-5 fill-none stroke-current"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v5" />
                            <path d="M14 11v5" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {emPreparacao &&
            lista.contextoUsuario.participanteAtivo && (
              <div className="space-y-gutter pt-page">
                {itensProntos && listaItens.length === 0 && (
                  <p className="rounded-card bg-error/10 p-gutter text-body-md font-normal text-error">
                    Adicione pelo menos um item para iniciar
                    a compra.
                  </p>
                )}

                <div className="w-full [&>button]:w-full">
                  <IniciarCompraButton
                    key={chave}
                    familiaId={familiaSelecionada.id}
                    listaId={listaId}
                    onMutacao={atualizarEstadoMutacao}
                    disabled={
                      !itensProntos ||
                      listaItens.length === 0 ||
                      operacaoParticipante !== null ||
                      operacaoItem !== null ||
                      reordenando ||
                      itemEditando !== null ||
                      itemParaRemover !== null
                    }
                  />
                </div>
              </div>
            )}
        </>
      )}
    </section>
  );
}
