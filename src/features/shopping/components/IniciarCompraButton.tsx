import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Modal } from "../../../shared/components/Modal";
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

export function IniciarCompraButton({ familiaId, listaId, participantes, iniciadorMembroFamiliaId, disabled = false, onMutacao }: Props) {
  const { auth, logout } = useSession();
  const navigate = useNavigate();
  const enviandoRef = useRef(false);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const participantesOrdenados = [...participantes].sort((a, b) => {
    if (a.membroFamiliaId === iniciadorMembroFamiliaId) return -1;
    if (b.membroFamiliaId === iniciadorMembroFamiliaId) return 1;
    return a.nome.localeCompare(b.nome, "pt-BR");
  });

  function abrirConfirmacao() {
    setErro(null);
    setSelecionados([]);
    setConfirmando(true);
  }

  async function confirmar() {
    if (!auth || enviandoRef.current || disabled) return;
    enviandoRef.current = true;
    onMutacao?.(true);
    setEnviando(true);
    setErro(null);
    try {
      await iniciarCompra(auth.token, familiaId, listaId, selecionados);
      setConfirmando(false);
      setSelecionados([]);
      navigate(`/listas/${listaId}/compra`);
    } catch (error) {
      const apiError = error as ApiRequestError;
      if (apiError.status === 401) logout();
      else setErro(apiError.message || "Não foi possível iniciar a compra.");
    } finally {
      enviandoRef.current = false;
      onMutacao?.(false);
      setEnviando(false);
    }
  }

  function cancelar() {
    if (!enviando) setConfirmando(false);
  }

  return <>
    <button type="button" disabled={disabled || enviando} onClick={abrirConfirmacao} className="inline-flex min-h-touch items-center justify-center gap-2 rounded-control bg-primary px-page text-center font-semibold text-surface disabled:opacity-60">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 fill-none stroke-current" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="9" cy="20" r="1" /><circle cx="19" cy="20" r="1" /><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 8H7" />
      </svg>
      Iniciar compra
    </button>
    <Modal open={confirmando} onClose={cancelar} closeDisabled={enviando} ariaLabelledBy="iniciar-compra-titulo" panelClassName="max-w-md space-y-page p-page">
      <div className="space-y-gutter">
        <h2 id="iniciar-compra-titulo" className="text-headline-md font-semibold">Iniciar compra?</h2>
        <p className="text-body-md text-foreground-muted">A lista passará para compra em andamento. Confirme se deseja iniciar agora.</p>
      </div>
      {participantes.length > 1 && <div className="space-y-gutter">
        <div>
          <h3 className="text-body-lg font-semibold">Quem está com você?</h3>
          <p className="text-body-md text-foreground-muted">Marque quem está no mercado com você. Quem não for marcado poderá participar à distância ou entrar depois com sua aprovação.</p>
        </div>
        <div className="space-y-2">
          {participantesOrdenados.map((participante) => participante.membroFamiliaId === iniciadorMembroFamiliaId ? (
            <div key={participante.membroFamiliaId} className="rounded-card border border-blue-400 bg-blue-50 p-gutter text-blue-700">
              <span className="font-semibold">{participante.nome}</span><p className="font-semibold">(Você)</p><p className="text-label-md">Responsável operacional · No mercado</p>
            </div>
          ) : (
            <label key={participante.membroFamiliaId} className={`flex min-h-touch items-center gap-gutter rounded-control border p-gutter ${selecionados.includes(participante.membroFamiliaId) ? "border-primary bg-primary/10 text-primary" : "border-foreground/15"}`}>
              <input type="checkbox" checked={selecionados.includes(participante.membroFamiliaId)} disabled={enviando} onChange={() => setSelecionados((atual) => atual.includes(participante.membroFamiliaId) ? atual.filter((id) => id !== participante.membroFamiliaId) : [...atual, participante.membroFamiliaId])} />
              <span className="font-semibold">{participante.nome}</span>{selecionados.includes(participante.membroFamiliaId) && <span className="ml-auto text-label-md">No mercado</span>}
            </label>
          ))}
        </div>
      </div>}
      {erro && <p role="alert" className="rounded-control bg-error/10 p-gutter text-error">{erro}</p>}
      <div className="grid gap-gutter border-t border-foreground/10 pt-gutter sm:grid-cols-2">
        <button type="button" disabled={enviando || disabled} onClick={() => void confirmar()} className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60">{enviando ? "Iniciando compra..." : "Iniciar compra"}</button>
        <button type="button" disabled={enviando} onClick={cancelar} className="min-h-touch rounded-control border border-foreground/20 px-page font-semibold disabled:opacity-60">Cancelar</button>
      </div>
    </Modal>
  </>;
}
