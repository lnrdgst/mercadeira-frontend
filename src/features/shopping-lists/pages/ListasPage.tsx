import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import { useSession } from "../../auth/session/sessionContext";
import { useAuthenticatedUser } from "../../auth/user/AuthenticatedUserContext";
import {
    buscarHistoricoListas,
    buscarListas,
    buscarMembrosFamilia,
    type FiltrosListas,
} from "../api/shoppingListsApi";
import { useFamilyContext } from "../../family/session/familyContext";
import type {
    HistoricoListaCompraItemResponse,
    ListaCompraResumoResponse,
    MembroFamiliaResponse,
} from "../types/shoppingList";
import { lerFiltrosListas, removerFiltrosListas, salvarFiltrosListas } from '../session/listasFiltersStorage';
import {
    categoriaCompraLabels,
    statusListaCompraLabels,
} from "../types/shoppingList";

function formatarDataBr(data?: string) {
    if (!data) return "";
    const [ano, mes, dia] = data.split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : "";
}

function isoDaDataBr(data: string) {
    const encontrado = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(data);
    if (!encontrado) return undefined;
    const [, dia, mes, ano] = encontrado;
    const iso = `${ano}-${mes}-${dia}`;
    const dataUtc = new Date(`${iso}T00:00:00Z`);
    return dataUtc.getUTCFullYear() === Number(ano) &&
        dataUtc.getUTCMonth() === Number(mes) - 1 &&
        dataUtc.getUTCDate() === Number(dia)
        ? iso
        : undefined;
}

function mascararData(valor: string) {
    const digitos = valor.replace(/\D/g, "").slice(0, 8);
    return digitos.length > 4
        ? `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`
        : digitos.length > 2
            ? `${digitos.slice(0, 2)}/${digitos.slice(2)}`
            : digitos;
}

function CampoData({
    label,
    texto,
    onChange,
    tentarAplicar,
}: {
    label: string;
    texto: string;
    onChange: (texto: string) => void;
    tentarAplicar: boolean;
}) {
    const invalido = texto.length === 10 && !isoDaDataBr(texto);
    const incompleto = texto.length > 0 && texto.length < 10;
    return (
        <label className="space-y-2 text-label-lg font-semibold">
            {label}
            <input
                value={texto}
                inputMode="numeric"
                autoComplete="off"
                placeholder="dd/mm/aaaa"
                aria-invalid={
                    invalido || (tentarAplicar && incompleto) || undefined
                }
                onChange={(event) => onChange(mascararData(event.target.value))}
                className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter"
            />
            {(invalido || (tentarAplicar && incompleto)) && (
                <span className="block text-label-md text-error">
                    Informe uma data válida.
                </span>
            )}
        </label>
    );
}

export function ListasPage() {
    const { auth, logout } = useSession();
    const { usuario } = useAuthenticatedUser();
    const { familiaSelecionada } = useFamilyContext();
    const [searchParams, setSearchParams] = useSearchParams();
    const [filtros, setFiltros] = useState<FiltrosListas>(() => ({
        criadaDe: searchParams.get("dataInicial") || undefined,
        criadaAte: searchParams.get("dataFinal") || undefined,
        criadaPorUsuarioId: searchParams.get("criadaPor") || undefined,
        participanteMembroFamiliaId:
            searchParams.get("participante") || undefined,
    }));
    const [membros, setMembros] = useState<MembroFamiliaResponse[]>([]);
    const [modalFiltrosAberto, setModalFiltrosAberto] = useState(false);
    const [filtrosTemporarios, setFiltrosTemporarios] = useState<FiltrosListas>(
        {},
    );
    const [rascunhosDatas, setRascunhosDatas] = useState({
        inicial: "",
        final: "",
    });
    const [tentouAplicar, setTentouAplicar] = useState(false);
    const [listas, setListas] = useState<ListaCompraResumoResponse[]>([]);
    const [familiaCarregadaId, setFamiliaCarregadaId] = useState<string | null>(
        null,
    );
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState<string | null>(null);
    const [totalHistorico, setTotalHistorico] = useState(0);
    const [historicoAberto, setHistoricoAberto] = useState(false);
    const [historico, setHistorico] = useState<
        HistoricoListaCompraItemResponse[]
    >([]);
    const [historicoTemProxima, setHistoricoTemProxima] = useState(false);
    const [paginaHistorico, setPaginaHistorico] = useState(-1);
    const [carregandoHistorico, setCarregandoHistorico] = useState(false);
    const [erroHistorico, setErroHistorico] = useState<string | null>(null);
    const carregandoHistoricoRef = useRef(false);

    const filtrosDaUrl = useCallback((): FiltrosListas => ({
        criadaDe: searchParams.get('dataInicial') || undefined,
        criadaAte: searchParams.get('dataFinal') || undefined,
        criadaPorUsuarioId: searchParams.get('criadaPor') || undefined,
        participanteMembroFamiliaId: searchParams.get('participante') || undefined,
    }), [searchParams]);

    useEffect(() => {
        if (!auth || !usuario?.id || !familiaSelecionada) return;
        const urlExplicita = ['dataInicial', 'dataFinal', 'criadaPor', 'participante'].some((parametro) => searchParams.has(parametro));
        const candidata = urlExplicita ? filtrosDaUrl() : lerFiltrosListas(usuario.id, familiaSelecionada.id);
        void buscarMembrosFamilia(auth.token, familiaSelecionada.id).then((resposta) => {
            const integrantes = resposta.data || [];
            const dataValida = (data?: string) => !data || /^\d{4}-\d{2}-\d{2}$/.test(data) && !Number.isNaN(new Date(`${data}T00:00:00Z`).getTime());
            const saneados: FiltrosListas = {
                criadaDe: dataValida(candidata.criadaDe) ? candidata.criadaDe : undefined,
                criadaAte: dataValida(candidata.criadaAte) ? candidata.criadaAte : undefined,
                criadaPorUsuarioId: integrantes.some((membro) => membro.usuarioId === candidata.criadaPorUsuarioId) ? candidata.criadaPorUsuarioId : undefined,
                participanteMembroFamiliaId: integrantes.some((membro) => membro.membroFamiliaId === candidata.participanteMembroFamiliaId) ? candidata.participanteMembroFamiliaId : undefined,
            };
            setFiltros(saneados);
            salvarFiltrosListas(usuario.id, familiaSelecionada.id, saneados);
        }).catch(() => { });
    }, [auth, usuario?.id, familiaSelecionada, searchParams, filtrosDaUrl]);

    const carregarListas = useCallback(async () => {
        if (!auth || !familiaSelecionada) {
            return;
        }
        if (
            filtros.criadaDe &&
            filtros.criadaAte &&
            filtros.criadaDe > filtros.criadaAte
        ) {
            return;
        }

        setCarregando(true);
        setErro(null);

        try {
            const response = await buscarListas(
                auth.token,
                familiaSelecionada.id,
                filtros,
            );
            setListas(response.data || []);
            setTotalHistorico(
                Number(response.headers.get("X-Total-Compras-Anteriores") || 0),
            );
            setHistorico([]);
            setPaginaHistorico(-1);
            setHistoricoTemProxima(false);
            setHistoricoAberto(false);
            setErroHistorico(null);
            setFamiliaCarregadaId(familiaSelecionada.id);
        } catch (error) {
            const apiError = error as ApiRequestError;

            if (apiError.status === 401) {
                logout();
                return;
            }

            setListas([]);
            setFamiliaCarregadaId(familiaSelecionada.id);
            setErro(
                apiError.message || "Não foi possível carregar suas listas.",
            );
        } finally {
            setCarregando(false);
        }
    }, [auth, familiaSelecionada, logout, filtros]);

    const carregarHistorico = useCallback(
        async (pagina: number) => {
            if (!auth || !familiaSelecionada || carregandoHistoricoRef.current)
                return;
            carregandoHistoricoRef.current = true;
            setCarregandoHistorico(true);
            setErroHistorico(null);
            try {
                const response = await buscarHistoricoListas(
                    auth.token,
                    familiaSelecionada.id,
                    pagina,
                    20,
                    filtros,
                );
                const dados = response.data;
                if (!dados)
                    throw new Error(
                        "NÃ£o foi possÃ­vel carregar compras anteriores.",
                    );
                setHistorico((atuais) =>
                    pagina === 0
                        ? dados.content
                        : [...atuais, ...dados.content],
                );
                setPaginaHistorico(dados.page);
                setHistoricoTemProxima(dados.hasNext);
            } catch (error) {
                const apiError = error as ApiRequestError;
                if (apiError.status === 401) {
                    logout();
                    return;
                }
                setErroHistorico(
                    apiError.message ||
                    "NÃ£o foi possÃ­vel carregar compras anteriores.",
                );
            } finally {
                carregandoHistoricoRef.current = false;
                setCarregandoHistorico(false);
            }
        },
        [auth, familiaSelecionada, logout, filtros],
    );

    const alternarHistorico = () => {
        const abrir = !historicoAberto;
        setHistoricoAberto(abrir);
        if (abrir && paginaHistorico < 0) void carregarHistorico(0);
    };

    useEffect(() => {
        void Promise.resolve().then(carregarListas);
    }, [carregarListas]);

    useEffect(() => {
        const precisaResolverMembros = modalFiltrosAberto
            || Boolean(filtros.participanteMembroFamiliaId)
            || Boolean(filtros.criadaPorUsuarioId);
        if (!auth || !familiaSelecionada || !precisaResolverMembros) return;
        void buscarMembrosFamilia(auth.token, familiaSelecionada.id)
            .then((response) => setMembros(response.data || []))
            .catch(() => setMembros([]));
    }, [auth, familiaSelecionada, modalFiltrosAberto, filtros.participanteMembroFamiliaId, filtros.criadaPorUsuarioId]);

    function atualizarFiltros(parcial: Partial<FiltrosListas>) {
        const proximos = { ...filtros, ...parcial };
        setFiltros(proximos);
        if (usuario?.id && familiaSelecionada) salvarFiltrosListas(usuario.id, familiaSelecionada.id, proximos);
        const parametros = new URLSearchParams();
        if (proximos.criadaDe) parametros.set("dataInicial", proximos.criadaDe);
        if (proximos.criadaAte) parametros.set("dataFinal", proximos.criadaAte);
        if (proximos.criadaPorUsuarioId)
            parametros.set("criadaPor", proximos.criadaPorUsuarioId);
        if (proximos.participanteMembroFamiliaId)
            parametros.set(
                "participante",
                proximos.participanteMembroFamiliaId,
            );
        setSearchParams(parametros, { replace: true });
    }
    const filtrosAtivos = Object.entries(filtros).filter(
        ([chave, valor]) => valor && chave !== "page" && chave !== "size",
    );
    const dataInicialIso = rascunhosDatas.inicial
        ? isoDaDataBr(rascunhosDatas.inicial)
        : undefined;
    const dataFinalIso = rascunhosDatas.final
        ? isoDaDataBr(rascunhosDatas.final)
        : undefined;
    const datasTemporariasInvalidas =
        (!!rascunhosDatas.inicial && !dataInicialIso) ||
        (!!rascunhosDatas.final && !dataFinalIso) ||
        (!!dataInicialIso && !!dataFinalIso && dataInicialIso > dataFinalIso);
    function abrirFiltros() {
        setFiltrosTemporarios(filtros);
        setRascunhosDatas({
            inicial: formatarDataBr(filtros.criadaDe),
            final: formatarDataBr(filtros.criadaAte),
        });
        setTentouAplicar(false);
        setModalFiltrosAberto(true);
    }
    function aplicarFiltros() {
        setTentouAplicar(true);
        if (!datasTemporariasInvalidas) {
            atualizarFiltros({
                ...filtrosTemporarios,
                criadaDe: dataInicialIso,
                criadaAte: dataFinalIso,
            });
            setModalFiltrosAberto(false);
        }
    }
    function limparFiltros() {
        atualizarFiltros({
            criadaDe: undefined,
            criadaAte: undefined,
            criadaPorUsuarioId: undefined,
            participanteMembroFamiliaId: undefined,
        });
        if (usuario?.id && familiaSelecionada) removerFiltrosListas(usuario.id, familiaSelecionada.id);
        setModalFiltrosAberto(false);
    }
    function nomeMembro(
        id: string | undefined,
        tipo: "usuarioId" | "membroFamiliaId",
    ) {
        return membros.find((membro) => membro[tipo] === id)?.nome || "Participante selecionado";
    }

    if (!familiaSelecionada) {
        return null;
    }

    const listasVisiveis =
        familiaCarregadaId === familiaSelecionada.id ? listas : [];
    const mostrandoCarregamento =
        carregando || familiaCarregadaId !== familiaSelecionada.id;

    return (
        <section className="mx-auto max-w-3xl space-y-page py-page">
            <header className="flex flex-wrap items-end justify-between gap-gutter">
                <div>
                    <h1 className="text-headline-lg font-bold">
                        Minhas listas
                    </h1>
                    <p className="mt-1 text-body-md text-foreground-muted">
                        Gerencie e acompanhe as listas de compras da família{" "}
                        {familiaSelecionada.nome}.
                    </p>
                </div>

                <section className="border border-foreground relative left-1/2 w-dvw -translate-x-1/2 overflow-hidden rounded-card bg-foreground/5">
                    <button
                        type="button"
                        onClick={abrirFiltros}
                        className="flex min-h-touch w-full items-center justify-center gap-2 rounded-control font-semibold text-foreground transition-colors hover:text-primary"
                    >
                        <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            className="size-5 fill-none stroke-current"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="11" cy="11" r="8" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>

                        {filtrosAtivos.length > 0
                            ? `Busca de listas com ${filtrosAtivos.length} ${filtrosAtivos.length === 1 ? "filtro" : "filtros"
                            }`
                            : "Toque para buscar listas"}
                    </button>

                    {filtrosAtivos.length > 0 && (
                        <div className="space-y-3 px-page pb-gutter">
                            <div className="flex items-center justify-between gap-gutter">
                                <p className="text-label-md font-semibold text-foreground-muted">
                                    Filtros ativos:
                                </p>

                                <button
                                    type="button"
                                    onClick={limparFiltros}
                                    className="inline-flex items-center gap-1.5 text-label-md font-semibold text-error hover:underline"
                                >
                                    <svg
                                        aria-hidden="true"
                                        viewBox="0 0 24 24"
                                        className="size-4 fill-none stroke-current"
                                        strokeWidth="2.5"
                                        strokeLinecap="round"
                                    >
                                        <path d="M18 6 6 18" />
                                        <path d="m6 6 12 12" />
                                    </svg>

                                    <span>Limpar filtros</span>
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {filtros.criadaDe && (
                                    <span className="rounded-full bg-surface px-gutter py-1 text-label-md">
                                        De: {formatarDataBr(filtros.criadaDe)}
                                    </span>
                                )}

                                {filtros.criadaAte && (
                                    <span className="rounded-full bg-surface px-gutter py-1 text-label-md">
                                        Até: {formatarDataBr(filtros.criadaAte)}
                                    </span>
                                )}

                                {filtros.criadaPorUsuarioId && (
                                    <span className="rounded-full bg-surface px-gutter py-1 text-label-md">
                                        Criada por:{" "}
                                        {nomeMembro(
                                            filtros.criadaPorUsuarioId,
                                            "usuarioId",
                                        )}
                                    </span>
                                )}

                                {filtros.participanteMembroFamiliaId && (
                                    <span className="rounded-full bg-surface px-gutter py-1 text-label-md">
                                        Participante:{" "}
                                        {nomeMembro(
                                            filtros.participanteMembroFamiliaId,
                                            "membroFamiliaId",
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </section>

                <Link
                    to="/listas/nova"
                    className="flex min-h-touch w-full items-center justify-center gap-2 rounded-control bg-primary px-page font-semibold text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                    <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="size-5 fill-none stroke-current"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <path d="M8 6h8" />
                        <path d="M8 12h5" />
                        <path d="M8 18h4" />

                        <circle cx="4" cy="6" r="1" />
                        <circle cx="4" cy="12" r="1" />
                        <circle cx="4" cy="18" r="1" />

                        <path d="M18 14v6" />
                        <path d="M15 17h6" />
                    </svg>

                    <span>Nova lista de compras</span>
                </Link>
            </header>

            {modalFiltrosAberto && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="Filtrar listas"
                    className="fixed inset-0 z-50 flex items-end bg-foreground/40 p-gutter sm:items-center sm:justify-center"
                >
                    <section className="max-h-[calc(100dvh-2rem)] w-full max-w-2xl space-y-page overflow-y-auto rounded-t-card bg-surface p-page shadow-soft sm:rounded-card sm:p-8">
                        <h2 className="text-headline-md font-semibold">
                            Buscar listas da família
                        </h2>
                        <div className="grid gap-page sm:grid-cols-2">
                            <CampoData
                                label="A partir do dia:"
                                texto={rascunhosDatas.inicial}
                                tentarAplicar={tentouAplicar}
                                onChange={(inicial) =>
                                    setRascunhosDatas((atual) => ({
                                        ...atual,
                                        inicial,
                                    }))
                                }
                            />
                            <CampoData
                                label="Até o dia:"
                                texto={rascunhosDatas.final}
                                tentarAplicar={tentouAplicar}
                                onChange={(final) =>
                                    setRascunhosDatas((atual) => ({
                                        ...atual,
                                        final,
                                    }))
                                }
                            />
                            <label className="space-y-2 text-label-lg font-semibold">
                                Criada por
                                <select
                                    value={
                                        filtrosTemporarios.criadaPorUsuarioId ||
                                        ""
                                    }
                                    onChange={(event) =>
                                        setFiltrosTemporarios((atual) => ({
                                            ...atual,
                                            criadaPorUsuarioId:
                                                event.target.value || undefined,
                                        }))
                                    }
                                    className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter"
                                >
                                    <option value="">Todas</option>
                                    {membros.map((membro) => (
                                        <option
                                            key={membro.usuarioId}
                                            value={membro.usuarioId}
                                        >
                                            {membro.nome}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="space-y-2 text-label-lg font-semibold">
                                Participante
                                <select
                                    value={
                                        filtrosTemporarios.participanteMembroFamiliaId ||
                                        ""
                                    }
                                    onChange={(event) =>
                                        setFiltrosTemporarios((atual) => ({
                                            ...atual,
                                            participanteMembroFamiliaId:
                                                event.target.value || undefined,
                                        }))
                                    }
                                    className="min-h-touch w-full rounded-card border border-foreground/20 bg-background px-gutter"
                                >
                                    <option value="">Todos</option>
                                    {membros.map((membro) => (
                                        <option
                                            key={membro.membroFamiliaId}
                                            value={membro.membroFamiliaId}
                                        >
                                            {membro.nome}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        {dataInicialIso &&
                            dataFinalIso &&
                            dataInicialIso > dataFinalIso && (
                                <p
                                    role="alert"
                                    className="rounded-card bg-error/10 p-gutter text-error"
                                >
                                    A data inicial não pode ser posterior à data
                                    final.
                                </p>
                            )}
                        <footer className="sticky bottom-0 -mx-page flex flex-col-reverse gap-gutter border-t border-foreground/10 bg-surface px-page pt-gutter pb-[max(env(safe-area-inset-bottom),1rem)] sm:flex-row sm:items-center">
                            <button
                                type="button"
                                onClick={() => setModalFiltrosAberto(false)}
                                className="min-h-touch rounded-control px-page font-semibold text-foreground-muted"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={limparFiltros}
                                className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold"
                            >
                                Limpar filtros
                            </button>
                            <button
                                type="button"
                                disabled={datasTemporariasInvalidas}
                                onClick={aplicarFiltros}
                                className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60 sm:ml-auto"
                            >
                                Aplicar filtros
                            </button>
                        </footer>
                    </section>
                </div>
            )}

            {mostrandoCarregamento && (
                <p className="rounded-card bg-surface p-page text-body-md text-foreground-muted shadow-soft">
                    Carregando suas listas...
                </p>
            )}

            {!mostrandoCarregamento && erro && (
                <div className="space-y-gutter rounded-card bg-error/10 p-page text-error">
                    <p>{erro}</p>
                    <button
                        type="button"
                        onClick={() => void carregarListas()}
                        className="min-h-touch rounded-control border border-current px-page font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        Tentar novamente
                    </button>
                </div>
            )}

            {!mostrandoCarregamento && !erro && listasVisiveis.length === 0 && (
                <div className="space-y-gutter rounded-card bg-surface p-page text-center shadow-soft">
                    <p className="text-body-md text-foreground-muted">
                        Você ainda não possui listas.
                    </p>
                </div>
            )}

            {!mostrandoCarregamento && !erro && listasVisiveis.length > 0 && (
                <ul className="grid gap-gutter sm:grid-cols-2">
                    {listasVisiveis.map((lista) => {
                        const emAndamento = lista.status === "EM_COMPRA";
                        const finalizada = lista.status === "FINALIZADA";
                        const labelStatus = emAndamento
                            ? "Em andamento"
                            : statusListaCompraLabels[lista.status];
                        const criadaPeloUsuario =
                            lista.criadaPorUsuarioId === usuario?.id;

                        return (
                            <li key={lista.id}>
                                <Link
                                    to={
                                        finalizada
                                            ? `/listas/${lista.id}/compra/revisao`
                                            : emAndamento
                                                ? `/listas/${lista.id}/compra`
                                                : `/listas/${lista.id}`
                                    }
                                    className={`block min-h-touch space-y-gutter rounded-card border p-page shadow-soft transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${finalizada
                                        ? "border-blue-300 bg-blue-50"
                                        : emAndamento
                                            ? "border-primary/20 bg-primary/5"
                                            : "border-foreground/10 bg-surface"
                                        }`}
                                >
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">
                                            {
                                                categoriaCompraLabels[
                                                lista.categoria
                                                ]
                                            }
                                        </span>

                                        <span
                                            className={`rounded-full px-gutter py-1 text-label-md font-semibold ${finalizada
                                                ? "bg-blue-100 text-blue-700"
                                                : emAndamento
                                                    ? "bg-primary/10 text-primary"
                                                    : "bg-foreground/5 text-foreground-muted"
                                                }`}
                                        >
                                            {labelStatus}
                                        </span>
                                    </div>

                                    <div>
                                        <h2 className="text-headline-md font-semibold">
                                            {lista.nome}
                                        </h2>
                                        <span>
                                            {criadaPeloUsuario && (
                                                <p className="mt-1 text-label-md font-medium text-primary">
                                                    Lista criada por você
                                                </p>
                                            )}
                                        </span>

                                        {lista.estabelecimento && (
                                            <p className="mt-1 text-body-md text-foreground-muted">
                                                {lista.estabelecimento}
                                            </p>
                                        )}
                                    </div>

                                    <p className="text-label-lg font-semibold text-primary">
                                        {finalizada
                                            ? "Ver resumo"
                                            : emAndamento
                                                ? "Ver compra"
                                                : "Abrir lista"}
                                    </p>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}

            {!mostrandoCarregamento && !erro && totalHistorico > 0 && (
                <section className="rounded-card border border-amber-200 bg-amber-50/50 p-page">
                    <button
                        type="button"
                        onClick={alternarHistorico}
                        aria-expanded={historicoAberto}
                        aria-controls="compras-anteriores"
                        className="flex min-h-touch w-full items-center justify-between gap-gutter text-left font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                        <span>Compras anteriores ({totalHistorico})</span>
                        <span aria-hidden="true">
                            {historicoAberto ? "▾" : "▸"}
                        </span>
                    </button>
                    {historicoAberto && (
                        <div
                            id="compras-anteriores"
                            className="mt-gutter space-y-gutter"
                        >
                            {carregandoHistorico && historico.length === 0 && (
                                <p className="text-body-md text-foreground-muted">
                                    Carregando compras anteriores...
                                </p>
                            )}
                            {erroHistorico && (
                                <div className="space-y-gutter text-error">
                                    <p>{erroHistorico}</p>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            void carregarHistorico(
                                                paginaHistorico < 0
                                                    ? 0
                                                    : paginaHistorico + 1,
                                            )
                                        }
                                        className="min-h-touch rounded-control border border-current px-page font-semibold"
                                    >
                                        Tentar novamente
                                    </button>
                                </div>
                            )}
                            {historico.length > 0 && (
                                <ul className="grid gap-gutter sm:grid-cols-2">
                                    {historico.map(({ lista }) => (
                                        <li key={lista.id}>
                                            <Link
                                                to={`/listas/${lista.id}/compra/revisao`}
                                                className="block min-h-touch space-y-gutter rounded-card border border-blue-300 bg-blue-50 p-page shadow-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                            >
                                                <div className="flex flex-wrap gap-2">
                                                    <span className="rounded-full bg-foreground/5 px-gutter py-1 text-label-md font-semibold text-foreground-muted">
                                                        {
                                                            categoriaCompraLabels[
                                                            lista.categoria
                                                            ]
                                                        }
                                                    </span>
                                                    <span className="rounded-full bg-blue-100 px-gutter py-1 text-label-md font-semibold text-blue-700">
                                                        Finalizada
                                                    </span>
                                                </div>
                                                <div>
                                                    <h2 className="text-headline-md font-semibold">
                                                        {lista.nome}
                                                    </h2>
                                                    {lista.estabelecimento && (
                                                        <p className="mt-1 text-body-md text-foreground-muted">
                                                            {
                                                                lista.estabelecimento
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                                <p className="text-label-lg font-semibold text-primary">
                                                    Ver resumo
                                                </p>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {historicoTemProxima && (
                                <button
                                    type="button"
                                    disabled={carregandoHistorico}
                                    onClick={() =>
                                        void carregarHistorico(
                                            paginaHistorico + 1,
                                        )
                                    }
                                    className="min-h-touch rounded-control border border-amber-400 px-page font-semibold text-amber-900 disabled:opacity-60"
                                >
                                    {carregandoHistorico
                                        ? "Carregando..."
                                        : "Carregar mais"}
                                </button>
                            )}
                        </div>
                    )}
                </section>
            )}
        </section>
    );
}
