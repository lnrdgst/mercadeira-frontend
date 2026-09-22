import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import { useSession } from "../../auth/session/sessionContext";
import {
  buscarMinhasSolicitacoesPendentes,
  criarFamilia,
  solicitarEntrada,
} from "../api/familyApi";
import { useFamilyContext } from "../session/familyContext";
import type { MinhaSolicitacaoPendenteResponse } from "../types/family";
import mascote from '../../../assets/branding/mercadeira/mascote-mercadeira.png'

type FormMode = "overview" | "create" | "join";

const mensagemNomeFamiliaInvalido =
  "Ops! Parece que você não digitou um nome válido. Por favor, tente novamente.";
const mensagemCodigoIngressoInvalido =
  "Ops! Parece que o código digitado não é válido. Por favor, tente novamente.";

function normalizarNomeFamilia(nome: string) {
  return nome.trim();
}

function contemPalavraFamilia(nome: string) {
  return /\bfamilia\b/i.test(
    nome.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
  );
}

export function FamiliaEntradaPage() {
  const { auth, logout } = useSession();
  const { recarregarFamilias } = useFamilyContext();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<
    MinhaSolicitacaoPendenteResponse[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [formMode, setFormMode] = useState<FormMode>("overview");
  const [nomeFamilia, setNomeFamilia] = useState("");
  const [codigoIngresso, setCodigoIngresso] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    if (!auth) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await buscarMinhasSolicitacoesPendentes(
        auth.token,
      );
      setRequests(response.data || []);
    } catch (error) {
      if ((error as ApiRequestError).status === 401) logout();
      else
        setErrorMessage("Não foi possível carregar suas solicitações.");
    } finally {
      setIsLoading(false);
    }
  }, [auth, logout]);

  useEffect(() => {
    void Promise.resolve().then(loadRequests);
  }, [loadRequests]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;
    const nome = normalizarNomeFamilia(nomeFamilia);

    if (nome.length < 2 || contemPalavraFamilia(nome)) {
      setErrorMessage(mensagemNomeFamiliaInvalido);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const response = await criarFamilia(auth.token, {
        nome,
      });
      if (!response.data) {
        throw new Error("Não foi possível criar a família.");
      }

      const familiaSelecionada = await recarregarFamilias(
        response.data.id,
      );

      if (!familiaSelecionada) {
        setErrorMessage("Não foi possível atualizar a família criada.");
        return;
      }

      navigate("/inicio", { replace: true });
    } catch (error) {
      const falha = error as ApiRequestError;
      if (falha.status === 401) logout();
      else if (
        falha.status === 400 &&
        /(payload|requisição) inválid[ao]/i.test(falha.message)
      ) {
        setErrorMessage(mensagemNomeFamiliaInvalido);
      } else setErrorMessage(falha.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;
    const codigo = codigoIngresso.trim();

    if (!codigo) {
      setErrorMessage(mensagemCodigoIngressoInvalido);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await solicitarEntrada(auth.token, {
        codigoIngresso: codigo,
      });
      setSuccessMessage(
        "Solicitação enviada. Agora é só aguardar a aprovação.",
      );
      setFormMode("overview");
      await loadRequests();
    } catch (error) {
      const falha = error as ApiRequestError;
      if (falha.status === 401) logout();
      else if (falha.status === 400 || falha.status === 404) {
        setErrorMessage(mensagemCodigoIngressoInvalido);
      } else setErrorMessage(falha.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCheckAgain() {
    setIsChecking(true);
    try {
      const familiaSelecionada = await recarregarFamilias();
      if (familiaSelecionada) {
        navigate("/inicio", { replace: true });
      } else {
        await loadRequests();
      }
    } finally {
      setIsChecking(false);
    }
  }

  const nomeFamiliaNormalizado = normalizarNomeFamilia(nomeFamilia);
  const nomeFamiliaValido =
    nomeFamiliaNormalizado.length >= 2 &&
    !contemPalavraFamilia(nomeFamiliaNormalizado);
  const codigoIngressoValido = codigoIngresso.trim().length > 0;

  if (isLoading) {
    return (
      <main className="mx-auto max-w-xl space-y-page py-page text-foreground">
        <p className="text-body-md text-foreground-muted">
          Carregando suas solicitações...
        </p>
        <button
          type="button"
          onClick={logout}
          className="min-h-touch rounded-control px-page text-label-lg font-semibold text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Sair da conta
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl space-y-page py-page text-foreground">
      <header className="flex flex-col items-center text-center space-y-1">
        <div className="space-y-2 text-center">
          <img
            src={mascote}
            alt="Mercadeira — Listas que aproximam"
            className="mx-auto w-full max-w-[260px] sm:max-w-xs"
          />

        </div>
        <h1 className="text-headline-lg font-bold">
          Vamos configurar sua família
        </h1>
        <p className="text-body-md text-foreground-muted">
          Crie uma família ou entre em uma existente.
        </p>
      </header>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-card bg-error/10 p-gutter text-error"
        >
          {errorMessage}
        </p>
      )}
      {successMessage && (
        <p
          role="status"
          className="rounded-card bg-primary/10 p-gutter text-primary"
        >
          {successMessage}
        </p>
      )}
      {requests.length > 0 && (
        <section className="space-y-gutter rounded-card bg-surface p-page shadow-soft">
          <div>
            <h2 className="text-headline-md font-semibold">
              Solicitações aguardando aprovação
            </h2>
            <p className="text-body-md text-foreground-muted">
              Você pode acompanhar todas as famílias solicitadas.
            </p>
          </div>
          <ul className="space-y-2">
            {requests.map((request) => (
              <li
                key={request.id}
                className="rounded-card border border-foreground/10 p-gutter"
              >
                <p className="font-semibold">
                  {request.familia.nome}
                </p>
                <p className="text-label-lg text-warning">
                  Aguardando aprovação
                </p>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => void handleCheckAgain()}
            disabled={isChecking}
            className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary disabled:opacity-60"
          >
            {isChecking ? "Verificando..." : "Verificar novamente"}
          </button>
        </section>
      )}
      {formMode === "overview" && (
        <section className="grid gap-gutter sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setFormMode("create")}
            className="min-h-touch rounded-card bg-primary p-page text-label-lg font-semibold text-surface"
          >
            Cadastrar uma família
          </button>
          <button
            type="button"
            onClick={() => setFormMode("join")}
            className="min-h-touch rounded-card border border-primary p-page text-label-lg font-semibold text-primary"
          >
            Entrar em uma família
          </button>
        </section>
      )}
      {formMode === "create" && (
        <form
          onSubmit={handleCreate}
          className="space-y-gutter rounded-card bg-surface p-page shadow-soft"
        >
          <label className="block font-semibold" htmlFor="nome">
            Nome da família
          </label>
          <div className="flex min-h-touch w-full items-center rounded-card border border-foreground/20">
            <span className="pl-gutter font-medium text-foreground-muted">
              Família
            </span>

            <input
              id="nome"
              name="nome"
              required
              maxLength={120}
              disabled={isSubmitting}
              value={nomeFamilia}
              onChange={(event) => {
                setNomeFamilia(event.target.value);
                setErrorMessage(null);
              }}
              placeholder="Silva"
              aria-describedby="orientacao-nome-familia"
              className="min-w-0 flex-1 bg-transparent px-2 outline-none"
            />
          </div>
          <p id="orientacao-nome-familia" className="text-label-md text-foreground-muted">
            Digite apenas o nome, sem a palavra “Família”. Ex.: Silva.
          </p>
          <div className="flex gap-gutter">
            <button
              type="submit"
              disabled={isSubmitting || !nomeFamiliaValido}
              className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
            >
              {isSubmitting ? "Criando..." : "Cadastrar família"}
            </button>
            <button
              type="button"
              onClick={() => setFormMode("overview")}
              className="min-h-touch px-page"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
      {formMode === "join" && (
        <form
          onSubmit={handleJoin}
          className="space-y-gutter rounded-card bg-surface p-page shadow-soft"
        >
          <label
            className="block font-semibold"
            htmlFor="codigoIngresso"
          >
            Código de ingresso
          </label>
          <input
            id="codigoIngresso"
            name="codigoIngresso"
            required
            maxLength={32}
            disabled={isSubmitting}
            value={codigoIngresso}
            /* O .toUpperCase() transforma tudo o que for digitado ou colado em maiúsculo */
            onChange={(event) => {
              setCodigoIngresso(event.target.value.toUpperCase());
              setErrorMessage(null);
            }}
            /* Adicionada a classe 'uppercase' para manter o comportamento visual fluido */
            className="min-h-touch w-full rounded-card border border-foreground/20 px-gutter uppercase"
          />

          <div className="flex gap-gutter">
            <button
              type="submit"
              disabled={isSubmitting || !codigoIngressoValido}
              className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
            >
              {isSubmitting ? "Enviando..." : "Solicitar entrada"}
            </button>
            <button
              type="button"
              onClick={() => setFormMode("overview")}
              className="min-h-touch px-page"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
      {errorMessage && requests.length === 0 && (
        <button
          type="button"
          onClick={() => void loadRequests()}
          className="min-h-touch rounded-control border border-primary px-page font-semibold text-primary"
        >
          Tentar novamente
        </button>
      )}
      <button
        type="button"
        onClick={logout}
        className="min-h-touch w-full rounded-control px-page text-label-lg font-semibold text-foreground-muted transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Sair da conta
      </button>
    </main>
  );
}
