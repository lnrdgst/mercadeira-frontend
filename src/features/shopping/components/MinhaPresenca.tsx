import { useEffect, useRef, useState } from "react";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import { useSession } from "../../auth/session/sessionContext";
import { presencaLabels, type CompraResponse } from "../types/shopping";

type Confirmacao = "solicitar" | "responsabilidade" | "sair" | null;

function nomeCompacto(nome: string, repetidos: Map<string, number>, indice: number) {
  const partes = nome.trim().split(/\s+/);
  const primeiro = partes[0] || nome;
  if ((repetidos.get(primeiro) || 0) < 2) return primeiro;
  const ultimo = partes.at(-1);
  return ultimo && ultimo !== primeiro
    ? `${primeiro} ${ultimo[0].toUpperCase()}.`
    : `${primeiro} ${indice + 1}`;
}

export function MinhaPresenca({
  compra,
  usuarioId,
  ocupada,
  onSolicitar,
  onCancelar,
  onDecidir,
  onSair,
  onSolicitarResponsabilidade,
  onCancelarResponsabilidade,
  onDecidirResponsabilidade,
  onTransferirResponsabilidade,
  onAtualizar,
}: {
  compra: CompraResponse;
  usuarioId?: string;
  ocupada: boolean;
  onSolicitar: () => Promise<void>;
  onCancelar: (solicitacaoId: string) => Promise<void>;
  onDecidir: (
    solicitacaoId: string,
    decisao: "aprovar" | "rejeitar",
  ) => Promise<void>;
  onSair: () => Promise<void>;
  onSolicitarResponsabilidade: () => Promise<void>;
  onCancelarResponsabilidade: (solicitacaoId: string) => Promise<void>;
  onDecidirResponsabilidade: (
    solicitacaoId: string,
    decisao: "aprovar" | "rejeitar",
  ) => Promise<void>;
  onTransferirResponsabilidade: (participanteCompraId: string) => Promise<void>;
  onAtualizar: () => Promise<void>;
}) {
  const { logout } = useSession();
  const ativo = useRef(true);
  const enviando = useRef(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const [transferindo, setTransferindo] = useState(false);
  const proprio = compra.participantes.find(
    (participante) => participante.usuarioId === usuarioId,
  );
  const solicitacao = compra.minhaSolicitacaoPresenca;
  const contexto = compra.contextoUsuario;
  const responsabilidade = compra.responsabilidadeOperacional;
  const responsavelId = responsabilidade?.responsavel?.participanteCompraId;
  const elegiveisTransferencia = compra.participantes.filter((participante) => participante.id !== proprio?.id && participante.presencaOperacional?.estado === 'PRESENTE');
  const podeTransferir = contexto.podeTransferirResponsabilidade === true;
  const participantesOrdenados = [...compra.participantes].sort(
    (a, b) => Number(b.id === responsavelId) - Number(a.id === responsavelId),
  );
  const primeirosNomes = participantesOrdenados.reduce((nomes, participante) => {
    const primeiro = participante.nome.trim().split(/\s+/)[0] || participante.nome;
    nomes.set(primeiro, (nomes.get(primeiro) || 0) + 1);
    return nomes;
  }, new Map<string, number>());

  const podeVerParticipantes = true;

  const temSolicitacaoPresencaParaDecidir =
    compra.solicitacoesPresencaPendentes?.some(
      (pedido) => pedido.acoes.podeDecidirPresenca === true,
    ) ?? false;

  const temSolicitacaoResponsabilidadeParaDecidir =
    compra.solicitacoesResponsabilidadePendentes?.some(
      (pedido) =>
        pedido.acoes.podeDecidirResponsabilidade === true,
    ) ?? false;



  useEffect(() => {
    ativo.current = true;
    return () => {
      ativo.current = false;
    };
  }, []);

  async function executar(
    mensagemEmAndamento: string,
    acao: () => Promise<void>,
    escrita = true,
    aoConcluir?: () => void,
  ) {
    if (enviando.current || ocupada || precisaAtualizar) return;
    enviando.current = true;
    setErro(null);
    setMensagem(mensagemEmAndamento);
    try {
      await acao();
      if (!ativo.current) return;
      setConfirmacao(null);
      setTransferindo(false);
      setPrecisaAtualizar(false);
      setMensagem("Compra atualizada.");
      aoConcluir?.();
    } catch (error) {
      if (!ativo.current) return;
      const falha = error as ApiRequestError;
      setMensagem(null);
      if (falha.status === 401) {
        logout();
        return;
      }
      setErro(falha.message || "Não foi possível atualizar a presença.");
      setPrecisaAtualizar(true);
      if (escrita) {
        try {
          await onAtualizar();
          if (!ativo.current) return;
          setPrecisaAtualizar(false);
          setMensagem(
            "Compra atualizada. Confira o estado antes de tentar novamente.",
          );
        } catch (erroAtualizacao) {
          if (!ativo.current) return;
          if ((erroAtualizacao as ApiRequestError).status === 401)
            logout();
          else
            setErro(
              `${falha.message} Não foi possível conferir o resultado. Atualize a compra antes de tentar novamente.`,
            );
        }
      }
    } finally {
      enviando.current = false;
    }
  }

  const aguardando = solicitacao?.estado === "PENDENTE";
  const podeSolicitar =
    contexto.podeSolicitarPresenca === true && !aguardando;
  const podeSair = contexto.podeDeclararSaida === true;
  const podeFicarRemoto = podeSair && compra.participantes.length > 1;
  const solicitacaoResponsabilidade = compra.minhaSolicitacaoResponsabilidade;
  const podeSolicitarResponsabilidade =
    contexto.podeSolicitarResponsabilidade === true &&
    solicitacaoResponsabilidade?.estado !== "PENDENTE";

  const aguardandoResponsabilidade =
    solicitacaoResponsabilidade?.estado === "PENDENTE";

  const semPresentes = responsabilidade?.responsavel == null;
  const podeExibirAcoesDiretas =
    (podeFicarRemoto &&
      !temSolicitacaoPresencaParaDecidir &&
      !temSolicitacaoResponsabilidadeParaDecidir) ||
    podeSolicitarResponsabilidade;
  const solicitacoesPresencaPendentes =
    compra.solicitacoesPresencaPendentes ?? [];
  const solicitacoesResponsabilidadePendentes =
    compra.solicitacoesResponsabilidadePendentes ?? [];
  const temSolicitacoesPresencaPendentes =
    solicitacoesPresencaPendentes.length > 0;
  const temSolicitacoesResponsabilidadePendentes =
    solicitacoesResponsabilidadePendentes.length > 0;
  const temConteudoOperacional =
    temSolicitacoesPresencaPendentes ||
    aguardando ||
    (confirmacao === null && podeSolicitar) ||
    confirmacao === "solicitar" ||
    (confirmacao === null && podeExibirAcoesDiretas) ||
    confirmacao === "sair" ||
    (!aguardandoResponsabilidade && confirmacao === "responsabilidade") ||
    aguardandoResponsabilidade ||
    temSolicitacoesResponsabilidadePendentes;

  return (
    <section
      aria-labelledby="compra-participantes"
      aria-busy={ocupada}
      className="min-w-0 space-y-gutter rounded-card border border-primary/20 bg-primary/5 p-gutter"
    >

      <h2
        id="compra-participantes"
        className="text-headline-md font-semibold"
      >
        Participantes
      </h2>
      {podeVerParticipantes && (
        <div className="space-y-gutter">
          <ul className="space-y-1">
            {participantesOrdenados.map((participante, indice) => {
              const estado = participante.presencaOperacional?.estado;
              const meu = participante.id === proprio?.id;
              const responsavel = participante.id === responsavelId;
              const nome = nomeCompacto(participante.nome, primeirosNomes, indice);
              const descricaoPresenca = presencaLabels[estado] ?? "Presença indisponível";
              const estiloLinha = responsavel
                ? "border border-blue-400 bg-blue-50 text-blue-700"
                : estado === "PRESENTE"
                  ? "border border-primary bg-primary/10 text-primary"
                  : estado === "NAO_PRESENTE"
                    ? "border border-orange-200 bg-orange-50 text-orange-800"
                    : "bg-foreground/5 border border-foreground/20 text-foreground-muted";

              return (
                <li key={participante.id} className={`min-h-touch min-w-0 rounded-card px-gutter py-2 ${estiloLinha}`}>
                  <span className="block min-w-0 truncate font-semibold" title={participante.nome} aria-label={`${participante.nome}${meu ? ' (você)' : ''}`}>
                    {nome}
                    {meu && " (você)"}
                  </span>
                  {responsavel && <span className="block text-label-md font-semibold">Responsável operacional</span>}
                  <span className={`block text-label-md ${estado === "PRESENTE" ? "text-primary" : ""}`}>{descricaoPresenca}</span>
                </li>
              );
            })}
          </ul>
          {compra.participantes.length === 0 && (
            <p className="text-foreground-muted">
              Esta compra não possui participantes.
            </p>
          )}
          {temConteudoOperacional && (
            <div className="flex w-full flex-col items-center gap-2 text-center">
              {temSolicitacoesPresencaPendentes && (
                <section
                  aria-label="Solicitações de presença"
                  className="mt-gutter w-full space-y-gutter border-t border-foreground/10 bg-primary/10 p-page pt-gutter"
                >
                  <h3 className="text-headline-md font-semibold">
                    Solicitações de presença
                  </h3>
                  <ul className="space-y-2">
                    {solicitacoesPresencaPendentes.map(
                      (pedido) => {
                        const solicitante =
                          compra.participantes.find(
                            (participante) =>
                              participante.id ===
                              pedido.solicitanteParticipanteCompraId,
                          );
                        return (
                          <li
                            key={pedido.id}
                            className="flex flex-col items-center gap-3 text-center sm:flex-row sm:flex-wrap sm:justify-center"
                          >
                            <div>
                              <span className="font-semibold">
                                {solicitante?.nome ?? "Participante"}
                              </span>{" "}
                              <span className="text-foreground-muted">
                                solicitou presença no mercado.
                              </span>
                            </div>


                            {pedido.acoes.podeDecidirPresenca === true && (
                              <div className="flex flex-wrap justify-center gap-2">
                                <button
                                  type="button"
                                  disabled={ocupada || precisaAtualizar}
                                  onClick={() =>
                                    void executar(
                                      "Confirmando presença...",
                                      () => onDecidir(pedido.id, "aprovar"),
                                    )
                                  }
                                  className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
                                >
                                  Confirmar presença
                                </button>

                                <button
                                  type="button"
                                  disabled={ocupada || precisaAtualizar}
                                  onClick={() =>
                                    void executar(
                                      "Recusando solicitação...",
                                      () => onDecidir(pedido.id, "rejeitar"),
                                    )
                                  }
                                  className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60"
                                >
                                  Recusar
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      },
                    )}
                  </ul>
                </section>
              )}
              {aguardando && (
                <div className="mt-gutter flex w-full flex-col items-center gap-2 border-t border-foreground/10 pt-gutter text-center" role="status">
                  <p className="font-semibold">
                    Aguardando confirmação do responsável
                    operacional.
                  </p>
                  {contexto.podeCancelarSolicitacaoPresenca ===
                    true && (
                      <button
                        type="button"
                        disabled={ocupada || precisaAtualizar}
                        onClick={() =>
                          void executar(
                            "Cancelando solicitação...",
                            () => onCancelar(solicitacao!.id),
                          )
                        }
                        className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60"
                      >
                        Cancelar solicitação
                      </button>
                    )}
                </div>
              )}
              {!aguardando &&
                podeSolicitar &&
                confirmacao === null && (
                  <div className="mt-gutter flex w-full flex-col items-center gap-2 border-t border-foreground/10 pt-gutter text-center">
                    <button
                      type="button"
                      disabled={ocupada || precisaAtualizar}
                      onClick={() => setConfirmacao("solicitar")}
                      className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
                    >
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="size-5 fill-none stroke-current"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        {/* indicador */}
                        <path d="M7.5 13V7a1.5 1.5 0 0 1 3 0v5" />

                        {/* médio */}
                        <path d="M10.5 12V5a1.5 1.5 0 0 1 3 0v7" />

                        {/* anelar */}
                        <path d="M13.5 12V6a1.5 1.5 0 0 1 3 0v6" />

                        {/* mínimo */}
                        <path d="M16.5 12V8a1.5 1.5 0 0 1 3 0v6" />

                        {/* polegar */}
                        <path d="M7.5 12.5 6 11a1.8 1.8 0 0 0-2.6 2.5l3.8 5A5.5 5.5 0 0 0 11.6 21H14a5.5 5.5 0 0 0 5.5-5.5V14" />
                      </svg>

                      <span>Solicitar presença no mercado</span>
                    </button>
                  </div>
                )}

              {confirmacao === "solicitar" && (
                <div
                  className="mt-gutter w-full space-y-gutter border-t border-foreground/10 bg-primary/5 p-page pt-gutter"
                  role="dialog"
                  aria-label="Confirmar solicitação de presença"
                >


                  <div className="space-y-2">
                    <h3 className="text-headline-md font-semibold text-primary">
                      Solicitar presença no mercado
                    </h3>

                    <p className="text-foreground-muted">
                      {semPresentes
                        ? "Você se tornará o responsável operacional desta compra por não haver presentes no mercado responsáveis por esta lista."
                        : "O responsável operacional receberá sua solicitação de presença."}
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-2">
                    <button
                      type="button"
                      disabled={ocupada || precisaAtualizar}
                      onClick={() =>
                        void executar(
                          "Enviando solicitação...",
                          onSolicitar,
                        )
                      }
                      className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
                    >
                      Confirmar solicitação
                    </button>

                    <button
                      type="button"
                      disabled={ocupada}
                      onClick={() => setConfirmacao(null)}
                      className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary"
                    >
                      Voltar
                    </button>
                  </div>
                </div>
              )}

              {podeSolicitarResponsabilidade && (
                    <button
                      type="button"
                      disabled={ocupada || precisaAtualizar}
                      onClick={() =>
                        setConfirmacao("responsabilidade")
                      }
                      className="py-1 font-semibold text-blue-700 hover:underline disabled:opacity-60"
                    >
                      Solicitar responsabilidade operacional
                    </button>
                  )}


              {confirmacao === null && podeExibirAcoesDiretas && (
                <div className="mt-gutter flex w-full flex-col items-center gap-1 border-t border-foreground/10 pt-gutter text-center">
                  {podeFicarRemoto &&
                    !temSolicitacaoPresencaParaDecidir &&
                    !temSolicitacaoResponsabilidadeParaDecidir && (
                      <button
                        type="button"
                        disabled={ocupada || precisaAtualizar}
                        onClick={() => setConfirmacao("sair")}
                        className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control border border-[#f6d0c9] bg-[#fff1ee] px-gutter font-semibold text-[#8a3f34] transition-colors hover:bg-[#ffd8d1] disabled:opacity-60"
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 24 24"
                          className="size-5 fill-none stroke-current"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          {/* celular */}
                          <rect x="6" y="3" width="9" height="18" rx="2" />
                          <path d="M9 18h3" />

                          {/* conexão/remoto */}
                          <path d="M18 8a3 3 0 0 1 3 3" />
                          <path d="M18 4a7 7 0 0 1 7 7" />
                        </svg>

                        <span>Vou participar desta compra à distância</span>
                      </button>
                    )}

                </div>
              )}

              {confirmacao === null && podeTransferir && (
                <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => setTransferindo(true)} className="py-1 font-semibold text-blue-700 hover:underline disabled:opacity-60">Transferir responsabilidade</button>
              )}

              {transferindo && (
                <div role="dialog" aria-label="Transferir responsabilidade" className="mt-gutter w-full space-y-gutter border-t border-foreground/10 bg-blue-50 p-page text-center">
                  <div><h3 className="text-headline-md font-semibold text-blue-700">Transferir responsabilidade</h3><p className="text-foreground-muted">Quem ficará responsável pela compra?</p></div>
                  <div className="space-y-2 text-left">{elegiveisTransferencia.map((participante) => <button key={participante.id} type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar('Transferindo responsabilidade...', () => onTransferirResponsabilidade(participante.id), true, () => setConfirmacao("sair"))} className="flex min-h-touch w-full items-center justify-between rounded-control border border-blue-200 bg-surface px-gutter font-semibold text-blue-700">{participante.nome}<span className="text-label-md text-primary">No mercado</span></button>)}</div>
                  <button type="button" disabled={ocupada} onClick={() => setTransferindo(false)} className="min-h-touch rounded-control border border-blue-700 px-page font-semibold text-blue-700">Cancelar</button>
                </div>
              )}

              {confirmacao === "sair" && podeFicarRemoto && !transferindo && (
                <div
                  className={`mt-gutter w-full space-y-gutter ${podeTransferir ? 'border-t border-foreground/10 pt-gutter' : 'rounded-card border border-[#f6d0c9] bg-[#fff1ee] p-page'}`}
                  role="dialog"
                  aria-label="Confirmar participação à distância"
                >
                  {podeTransferir ? (
                    <>
                      <div className="space-y-2 text-center">
                        <h3 className="text-headline-md font-semibold text-[#8a3f34]">Antes de participar à distância</h3>
                        <p className="text-foreground-muted">Transfira a responsabilidade da compra antes de informar que está remoto.</p>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => setTransferindo(true)} className="min-h-touch rounded-control bg-blue-700 px-page font-semibold text-white">Transferir responsabilidade</button>
                        <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => setConfirmacao(null)} className="inline-flex min-h-touch min-w-[180px] items-center justify-center gap-2 whitespace-nowrap rounded-control border border-[#f6d0c9] bg-surface px-10 font-semibold text-[#8a3f34] disabled:opacity-60">
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
                          <span>Voltar</span>
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2 text-center">
                        <h3 className="text-headline-md font-semibold text-[#8a3f34]">Confirma sua participação nesta compra à distância?</h3>
                        <p className="text-foreground-muted">Ao confirmar, você só poderá atuar nesta compra à distância. Se quiser participar no mercado, será necessário solicitar presença e aguardar a aprovação do responsável operacional da compra.</p>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => void executar("Declarando saída...", onSair)} className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control border border-[#f6d0c9] bg-[#ffd8d1] px-page font-semibold text-[#8a3f34] transition-colors hover:bg-[#f7c7bd] disabled:opacity-60">
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="3" width="9" height="18" rx="2" /><path d="M9 18h3" /><path d="M18 8a3 3 0 0 1 3 3" /><path d="M18 4a7 7 0 0 1 7 7" /></svg>
                          <span>Confirmar participação à distância</span>
                        </button>
                        <button type="button" disabled={ocupada || precisaAtualizar} onClick={() => setConfirmacao(null)} className="inline-flex min-h-touch min-w-[180px] items-center justify-center gap-2 whitespace-nowrap rounded-control border border-[#f6d0c9] bg-surface px-10 font-semibold text-[#8a3f34] disabled:opacity-60">
                          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
                          <span>Voltar</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}


              {!aguardandoResponsabilidade &&
                confirmacao === "responsabilidade" && (
                  <div
                    className="mt-gutter w-full space-y-gutter border-t border-foreground/10 bg-blue-50 p-page pt-gutter"
                    role="dialog"
                    aria-label="Confirmar solicitação de responsabilidade operacional"
                  >
                    <div className="space-y-2">
                      <h3 className="text-headline-md font-semibold text-blue-700">
                        Solicitar responsabilidade operacional
                      </h3>

                      <p className="text-foreground-muted">
                        O responsável operacional atual precisará aprovar esta transferência.
                      </p>
                    </div>

                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        type="button"
                        disabled={ocupada || precisaAtualizar}
                        onClick={() =>
                          void executar(
                            "Enviando solicitação de responsabilidade...",
                            onSolicitarResponsabilidade,
                          )
                        }
                        className="min-h-touch rounded-control bg-blue-700 px-page font-semibold text-white disabled:opacity-60"
                      >
                        Confirmar solicitação
                      </button>

                      <button
                        type="button"
                        disabled={ocupada}
                        onClick={() => setConfirmacao(null)}
                        className="min-h-touch rounded-control border border-blue-700 px-page font-semibold text-blue-700"
                      >
                        Voltar
                      </button>
                    </div>
                  </div>
                )}

              {solicitacaoResponsabilidade?.estado === "PENDENTE" && (
                <div role="status" className="mt-gutter flex w-full flex-col items-center gap-2 border-t border-foreground/10 pt-gutter text-center">
                  <p className="font-semibold">
                    Aguardando decisão sobre sua solicitação de
                    responsabilidade.
                  </p>
                  {contexto.podeCancelarSolicitacaoResponsabilidade ===
                    true && (
                      <button
                        type="button"
                        disabled={ocupada || precisaAtualizar}
                        onClick={() =>
                          void executar(
                            "Cancelando solicitação de responsabilidade...",
                            () =>
                              onCancelarResponsabilidade(
                                solicitacaoResponsabilidade.id,
                              ),
                          )
                        }
                        className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60"
                      >
                        Cancelar solicitação de responsabilidade
                      </button>
                    )}
                </div>
              )}
              {temSolicitacoesResponsabilidadePendentes && (
                <section
                  aria-label="Solicitações de responsabilidade"
                  className="mt-gutter w-full space-y-gutter border-t border-foreground/10 bg-blue-50 p-page pt-gutter"
                >
                  <h3 className="text-headline-md font-semibold text-blue-700">
                    Solicitações de responsabilidade
                  </h3>
                  <ul className="space-y-2">
                    {solicitacoesResponsabilidadePendentes.map(
                      (pedido) => {
                        const solicitante =
                          compra.participantes.find(
                            (participante) =>
                              participante.id ===
                              pedido.solicitanteParticipanteCompraId,
                          );
                        return (
                          <li
                            key={pedido.id}
                            className="flex flex-col items-center gap-3 text-center sm:flex-row sm:flex-wrap sm:justify-center"
                          >
                            <span className="font-semibold">
                              {solicitante?.nome ??
                                "Participante"}
                            </span>
                            <span className="text-foreground-muted">
                              solicitou assumir a
                              responsabilidade operacional.
                            </span>
                            {pedido.acoes
                              .podeDecidirResponsabilidade ===
                              true && (
                                <>
                                  <button
                                    type="button"
                                    disabled={
                                      ocupada ||
                                      precisaAtualizar
                                    }
                                    onClick={() =>
                                      void executar(
                                        "Aprovando responsabilidade...",
                                        () =>
                                          onDecidirResponsabilidade(
                                            pedido.id,
                                            "aprovar",
                                          ),
                                      )
                                    }
                                    className="min-h-touch rounded-control bg-blue-700 px-page font-semibold text-white disabled:opacity-60"
                                  >
                                    Aprovar responsabilidade
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      ocupada ||
                                      precisaAtualizar
                                    }
                                    onClick={() =>
                                      void executar(
                                        "Rejeitando solicitação...",
                                        () =>
                                          onDecidirResponsabilidade(
                                            pedido.id,
                                            "rejeitar",
                                          ),
                                      )
                                    }
                                    className="min-h-touch rounded-control border border-blue-700 px-page font-semibold text-blue-700 disabled:opacity-60"
                                  >
                                    Rejeitar
                                  </button>
                                </>
                              )}
                          </li>
                        );
                      },
                    )}
                  </ul>
                </section>
              )}
            </div>
          )}
        </div>
      )}


      {mensagem && <p role="status" className="text-center">{mensagem}</p>}
      {erro && (
        <p role="alert" className="text-center text-error">
          {erro}
        </p>
      )}
      {precisaAtualizar && (
        <div className="mt-gutter flex justify-center border-t border-foreground/10 pt-gutter">
          <button
            type="button"
            disabled={ocupada}
            onClick={() =>
              void executar(
                "Atualizando compra...",
                onAtualizar,
                false,
              )
            }
            className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60"
          >
            Atualizar compra
          </button>
        </div>
      )}
    </section>
  );
}
