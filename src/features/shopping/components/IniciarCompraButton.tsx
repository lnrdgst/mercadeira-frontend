import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import type { ParticipanteListaResponse } from "../../shopping-lists/types/shoppingList";
import { useSession } from "../../auth/session/sessionContext";
import { iniciarCompra } from "../api/shoppingApi";

type Props = {
  familiaId: string;
  listaId: string;
  participantes: ParticipanteListaResponse[];
  iniciadorMembroFamiliaId: string;
  disabled?: boolean;
  onMutacao?: (emAndamento: boolean) => void;
};

export function IniciarCompraButton({
  familiaId,
  listaId,
  participantes,
  iniciadorMembroFamiliaId,
  disabled = false,
  onMutacao,
}: Props) {
  const { auth, logout } = useSession();
  const navigate = useNavigate();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const enviandoRef = useRef(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const participantesOrdenados = [...participantes].sort((a, b) => {
    const aEhIniciador =
      a.membroFamiliaId === iniciadorMembroFamiliaId;
    const bEhIniciador =
      b.membroFamiliaId === iniciadorMembroFamiliaId;

    if (aEhIniciador) return -1;
    if (bEhIniciador) return 1;

    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  async function confirmar() {
    if (!auth || enviandoRef.current || disabled) return;
    enviandoRef.current = true;
    onMutacao?.(true);
    setEnviando(true);
    setErro(null);
    try {
      await iniciarCompra(auth.token, familiaId, listaId, selecionados);
      dialogRef.current?.close();
      setSelecionados([]);
      navigate(`/listas/${listaId}/compra`);
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else
        setErro(
          apiError.message || "Não foi possível iniciar a compra.",
        );
    } finally {
      enviandoRef.current = false;
      onMutacao?.(false);
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled || enviando}
        onClick={() => {
          setErro(null);
          setSelecionados([]);
          dialogRef.current?.showModal();
        }}
        className="inline-flex min-h-touch text-center items-center justify-center gap-2 rounded-control bg-primary px-page font-semibold text-surface"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 fill-none stroke-current"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="20" r="1" />
          <circle cx="19" cy="20" r="1" />
          <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H7" />
        </svg>
        Iniciar compra
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="iniciar-compra-titulo"
        aria-describedby="iniciar-compra-descricao"
        onCancel={(event) => {
          if (enviandoRef.current) event.preventDefault();
        }}
        onClose={() =>
          buttonRef.current?.focus({ preventScroll: true })
        }
        className="m-auto max-h-[calc(100svh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-card bg-surface p-page text-foreground shadow-soft backdrop:bg-foreground/40"
      >
        <div className="space-y-page">
          <h2
            id="iniciar-compra-titulo"
            className="text-center text-headline-md font-semibold"
          >
            Quem está com você?
          </h2>
          <p
            id="iniciar-compra-descricao"
            className="text-body-md text-foreground-muted"
          >
            Marque quem está no mercado com você.
            Quem não for marcado continuará sem presença confirmada,
            mas poderá entrar depois com sua aprovação ou participar a distância.
          </p>
          <div className="space-y-2">
            {participantesOrdenados.map((participante) =>
              participante.membroFamiliaId ===
                iniciadorMembroFamiliaId ? (
                <div
                  key={participante.membroFamiliaId}
                  className="rounded-card border border-blue-400 bg-blue-50 p-gutter text-blue-700"
                >
                  <span className="font-semibold">
                    {participante.nome}
                  </span>
                  <p className="font-semibold">(Você)</p>
                  <p className="text-label-md">
                    Responsável operacional · No mercado
                  </p>
                </div>
              ) : (
                <label
                  key={participante.membroFamiliaId}
                  className={`flex min-h-touch items-center gap-gutter rounded-control border p-gutter ${selecionados.includes(participante.membroFamiliaId) ? "border-primary bg-primary/10 text-primary" : "border-foreground/15"}`}
                >
                  <input
                    type="checkbox"
                    checked={selecionados.includes(
                      participante.membroFamiliaId,
                    )}
                    disabled={enviando}
                    onChange={() =>
                      setSelecionados((atual) =>
                        atual.includes(
                          participante.membroFamiliaId,
                        )
                          ? atual.filter(
                            (id) =>
                              id !==
                              participante.membroFamiliaId,
                          )
                          : [
                            ...atual,
                            participante.membroFamiliaId,
                          ],
                      )
                    }
                  />
                  <span className="font-semibold">
                    {participante.nome}
                  </span>
                  {selecionados.includes(
                    participante.membroFamiliaId,
                  ) && (
                      <span className="ml-auto text-label-md">
                        No mercado
                      </span>
                    )}
                </label>
              ),
            )}
          </div>
          {erro && (
            <p
              role="alert"
              className="rounded-control bg-error/10 p-gutter text-error"
            >
              {erro}
            </p>
          )}
          <div className="sticky bottom-0 z-10 flex flex-col gap-2 border-t border-foreground/10 bg-surface pt-gutter pb-1">
            <button
              type="button"
              disabled={enviando || disabled}
              onClick={() => void confirmar()}
              className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="20" r="1" />
                <circle cx="19" cy="20" r="1" />
                <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H7" />
              </svg>

              <span>
                {enviando ? "Iniciando compra..." : "Iniciar compra"}
              </span>
            </button>

            <button
              type="button"
              autoFocus
              disabled={enviando}
              onClick={() => dialogRef.current?.close()}
              className="inline-flex min-h-touch min-w-[180px] items-center justify-center gap-2 whitespace-nowrap rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="size-5 shrink-0 fill-none stroke-current"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 12H5" />
                <path d="m12 19-7-7 7-7" />
              </svg>

              <span>Voltar</span>
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
