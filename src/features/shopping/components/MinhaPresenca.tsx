import { useEffect, useRef, useState } from "react";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import { useSession } from "../../auth/session/sessionContext";
import { presencaLabels, type CompraResponse } from "../types/shopping";

type Confirmacao = "solicitar" | "responsabilidade" | null;

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
  onAtualizar: () => Promise<void>;
}) {
  const { logout } = useSession();
  const ativo = useRef(true);
  const enviando = useRef(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [precisaAtualizar, setPrecisaAtualizar] = useState(false);
  const [confirmacao, setConfirmacao] = useState<Confirmacao>(null);
  const proprio = compra.participantes.find(
    (participante) => participante.usuarioId === usuarioId,
  );
  const solicitacao = compra.minhaSolicitacaoPresenca;
  const contexto = compra.contextoUsuario;
  const responsabilidade = compra.responsabilidadeOperacional;

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
  ) {
    if (enviando.current || ocupada || precisaAtualizar) return;
    enviando.current = true;
    setErro(null);
    setMensagem(mensagemEmAndamento);
    try {
      await acao();
      if (!ativo.current) return;
      setConfirmacao(null);
      setPrecisaAtualizar(false);
      setMensagem("Compra atualizada.");
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
  const solicitacaoResponsabilidade = compra.minhaSolicitacaoResponsabilidade;
  const podeSolicitarResponsabilidade =
    contexto.podeSolicitarResponsabilidade === true &&
    solicitacaoResponsabilidade?.estado !== "PENDENTE";

  const aguardandoResponsabilidade =
    solicitacaoResponsabilidade?.estado === "PENDENTE";

  const semPresentes = responsabilidade?.responsavel == null;

  return (
    <section
      aria-labelledby="compra-participantes"
      aria-busy={ocupada}
      className="min-w-0 space-y-gutter"
    >

      <h2
        id="compra-participantes"
        className="text-headline-md font-semibold"
      >
        Participantes
      </h2>
      {podeVerParticipantes && (
        <div className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
          <ul className="flex min-w-0 flex-wrap gap-2">
            {compra.participantes.map((participante) => {
              const estado = participante.presencaOperacional?.estado;
              const meu = participante.id === proprio?.id;

              const responsavel =
                responsabilidade?.responsavel?.participanteCompraId ===
                participante.id;

              const estiloParticipante = responsavel
                ? "bg-blue-50 text-blue-700"
                : estado === "PRESENTE"
                  ? "bg-primary/10 text-primary"
                  : "bg-foreground/5 text-foreground-muted";

              const estilo = `inline-flex min-w-0 max-w-full flex-wrap items-center gap-x-1 rounded-control px-gutter py-2 text-label-lg break-words [overflow-wrap:anywhere] ${estiloParticipante}`;

              const partesNome = participante.nome.trim().split(/\s+/);

              const nome =
                partesNome.length > 1
                  ? `${partesNome[0]} ${partesNome[partesNome.length - 1][0].toUpperCase()}`
                  : partesNome[0];

              return (
                <li key={participante.id} className={estilo}>
                  <span className="min-w-0 font-semibold">
                    {nome}
                    {meu && " (você)"}
                  </span>

                  <span aria-hidden="true">·</span>

                  <span>
                    {presencaLabels[estado] ?? "Presença indisponível"}
                  </span>

                  {responsavel && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Responsável operacional</span>
                    </>
                  )}
                </li>

              );
            })}
          </ul>
          {compra.participantes.length === 0 && (
            <p className="text-foreground-muted">
              Esta compra não possui participantes.
            </p>
          )}
          {compra.solicitacoesPresencaPendentes &&
            compra.solicitacoesPresencaPendentes.length > 0 && (
              <section
                aria-label="Solicitações de presença"
                className="space-y-gutter rounded-card bg-primary/10 p-page"
              >
                <h3 className="text-headline-md font-semibold">
                  Solicitações de presença
                </h3>
                <ul className="space-y-2">
                  {compra.solicitacoesPresencaPendentes.map(
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
                          className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center"
                        >
                          <div>
                            <span className="font-semibold">
                              {solicitante?.nome ?? "Participante"}
                            </span>{" "}
                            <span className="text-foreground-muted">
                              solicitou presença no mercado.
                            </span>
                            <hr style={{ border: '0', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />
                          </div>


                          {pedido.acoes.podeDecidirPresenca === true && (
                            <div className="flex flex-wrap gap-2">
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
            <div className="space-y-2" role="status">
              <p className="font-semibold">
                Aguardando confirmação do responsável
                operacional.
              </p>
              <hr style={{ border: '0', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />
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
            confirmacao !== "solicitar" && (
              <button
                type="button"
                disabled={ocupada || precisaAtualizar}
                onClick={() => setConfirmacao("solicitar")}
                className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
              >
                Solicitar presença no mercado
              </button>
            )}

          {confirmacao === "solicitar" && (
            <div
              className="space-y-gutter rounded-card bg-primary/5 p-page"
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

              <div className="flex flex-wrap gap-2">
              <hr style={{ border: '0', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />
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


          {confirmacao === null && (
            <div className="flex flex-col items-start gap-1">
              <hr style={{ border: '0', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />
              {podeSair &&
                !temSolicitacaoPresencaParaDecidir &&
                !temSolicitacaoResponsabilidadeParaDecidir && (
                  <button
                    type="button"
                    disabled={ocupada || precisaAtualizar}
                    onClick={() =>
                      void executar("Declarando saída...", onSair)
                    }
                    className="py-1 font-semibold text-accent hover:underline disabled:opacity-60"
                  >
                    Não estou no mercado
                  </button>
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
            </div>
          )}


          {!aguardandoResponsabilidade &&
            confirmacao === "responsabilidade" && (
              <div
                className="space-y-gutter rounded-card bg-blue-50 p-page"
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
                  <hr style={{ border: '0', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />
                </div>

                <div className="flex flex-wrap gap-2">
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
            <div role="status" className="space-y-2">
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
          {compra.solicitacoesResponsabilidadePendentes &&
            compra.solicitacoesResponsabilidadePendentes.length > 0 && (
              <section
                aria-label="Solicitações de responsabilidade"
                className="space-y-gutter rounded-card bg-blue-50 p-page"
              >
                <h3 className="text-headline-md font-semibold text-blue-700">
                  Solicitações de responsabilidade
                </h3>
                <ul className="space-y-2">
                  {compra.solicitacoesResponsabilidadePendentes.map(
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
                          className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:items-center"
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


      {mensagem && <p role="status">{mensagem}</p>}
      {erro && (
        <p role="alert" className="text-error">
          {erro}
        </p>
      )}
      {precisaAtualizar && (
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
      )}
    </section>
  );
}
