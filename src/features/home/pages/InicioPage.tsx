import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import type { ApiRequestError } from "../../../shared/api/apiClient";
import { useSession } from "../../auth/session/sessionContext";
import { useAuthenticatedUser } from "../../auth/user/AuthenticatedUserContext";
import { useFamilyContext } from "../../family/session/familyContext";
import { buscarListas } from "../../shopping-lists/api/shoppingListsApi";
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
  const { familiaSelecionada } = useFamilyContext();
  const [listas, setListas] = useState<ListaCompraResumoResponse[]>([]);
  const [familiaId, setFamiliaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const carregar = useCallback(async () => {
    if (!auth || !familiaSelecionada) return;
    setLoading(true);
    setError(false);
    try {
      const response = await buscarListas(
        auth.token,
        familiaSelecionada.id,
      );
      setListas(response.data || []);
      setFamiliaId(familiaSelecionada.id);
    } catch (err) {
      if ((err as ApiRequestError).status === 401) logout();
      else {
        setError(true);
        setFamiliaId(familiaSelecionada.id);
      }
    } finally {
      setLoading(false);
    }
  }, [auth, familiaSelecionada, logout]);
  useEffect(() => {
    void Promise.resolve().then(carregar);
  }, [carregar]);
  if (!familiaSelecionada) return null;
  const emPreparacao =
    familiaId === familiaSelecionada.id
      ? listas
        .filter((lista) => lista.status === "EM_PREPARACAO")
        .sort((a, b) => b.atualizadaEm.localeCompare(a.atualizadaEm))
        .slice(0, 3)
      : [];
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
        <div className={`rounded-card border border-l-4 p-page shadow-soft ${periodo.cardClass}`}>
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
        </div>

      </header>

      <hr style={{ border: '0', borderTop: '1px solid #e0e0e0', margin: '16px 0' }} />

      <section className="space-y-gutter">
        <div className="flex items-end justify-between">
          <h2 className="text-headline-md font-semibold">
            Listas em preparação
          </h2>

        </div>
        <p>
          <Link to="/listas" className="font-semibold text-primary">
            Ver todas
          </Link>

        </p>


        {loading || familiaId !== familiaSelecionada.id ? (
          <p>Carregando listas...</p>
        ) : error ? (
          <div>
            <p>Não foi possível carregar suas listas.</p>
            <button type="button" onClick={() => void carregar()}>
              Tentar novamente
            </button>
          </div>
        ) : emPreparacao.length === 0 ? (
          <div className="rounded-card bg-surface p-page shadow-soft">
            <p>Nenhuma lista em preparação.</p>
            <Link
              to="/listas/nova"
              className="font-semibold text-primary"
            >
              Criar nova lista
            </Link>
          </div>
        ) : (
          <ul className="grid gap-gutter sm:grid-cols-3">
            {emPreparacao.map((lista) => (
              <li key={lista.id}>
                <Link
                  to={`/listas/${lista.id}`}
                  className="block rounded-card bg-surface p-page shadow-soft"
                >
                  <p className="text-label-lg text-primary">
                    {categoriaCompraLabels[lista.categoria]}
                  </p>
                  <h3 className="font-semibold">
                    {lista.nome}
                  </h3>
                  {lista.estabelecimento && (
                    <p className="text-foreground-muted">
                      {lista.estabelecimento}
                    </p>
                  )}
                  <p>
                    {statusListaCompraLabels[lista.status]}
                  </p>
                  <span className="font-semibold text-primary">
                    Abrir lista
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

    </section>
  );
}
