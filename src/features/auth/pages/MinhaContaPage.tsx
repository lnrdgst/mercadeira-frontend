import { useEffect, useState } from "react";
import {
    apiRequest,
    type ApiRequestError,
} from "../../../shared/api/apiClient";
import { PasswordField } from "../components/PasswordField";
import { useSession } from "../session/sessionContext";
import { useAuthenticatedUser } from "../user/AuthenticatedUserContext";

export function MinhaContaPage() {
    const { auth, logout } = useSession();
    const { usuario, recarregarUsuario } = useAuthenticatedUser();
    const [nome, setNome] = useState("");
    const [email, setEmail] = useState("");
    const [senhaAtual, setSenhaAtual] = useState("");
    const [novaSenha, setNovaSenha] = useState("");
    const [confirmacao, setConfirmacao] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const [sucesso, setSucesso] = useState<string | null>(null);
    const [salvando, setSalvando] = useState(false);
    useEffect(() => {
        if (usuario) {
            setNome(usuario.nome);
            setEmail(usuario.email);
        }
    }, [usuario]);
    const token = auth?.token;
    const podeAlterarEmail = usuario?.podeAlterarEmail !== false;
    const podeAlterarSenha = usuario?.podeAlterarSenha !== false;
    if (!token) return null;
    const emailMudou = podeAlterarEmail &&
        email.trim().toLowerCase() !== (usuario?.email ?? "").toLowerCase();
    const mudou = nome.trim() !== (usuario?.nome ?? "") || emailMudou;
    async function salvar(e: React.FormEvent) {
        e.preventDefault();
        if (!mudou || salvando) return;
        setSalvando(true);
        setErro(null);
        setSucesso(null);
        try {
            await apiRequest("/usuarios/me", {
                method: "PATCH",
                token,
                body: {
                    nome,
                    email,
                    senhaAtual: emailMudou ? senhaAtual : undefined,
                },
            });
            await recarregarUsuario();
            setSenhaAtual("");
            setSucesso("Dados pessoais atualizados.");
        } catch (e) {
            const x = e as ApiRequestError;
            if (x.status === 401) logout();
            else setErro(x.message || "Não foi possível salvar os dados.");
        } finally {
            setSalvando(false);
        }
    }
    async function trocarSenha(e: React.FormEvent) {
        e.preventDefault();
        if (salvando) return;
        if (novaSenha !== confirmacao) {
            setErro("A confirmação da nova senha não confere.");
            return;
        }
        setSalvando(true);
        setErro(null);
        setSucesso(null);
        try {
            await apiRequest("/usuarios/me/senha", {
                method: "PUT",
                token,
                body: { senhaAtual, novaSenha },
            });
            logout();
        } catch (e) {
            const x = e as ApiRequestError;
            if (x.status === 401) logout();
            else setErro(x.message || "Não foi possível alterar a senha.");
        } finally {
            setSalvando(false);
        }
    }
    return (
        <section className="mx-auto max-w-xl space-y-page">
            <header>
                <h1 className="text-headline-lg font-bold">Minha conta</h1>
            </header>
            {erro && (
                <p
                    role="alert"
                    className="rounded-card bg-error/10 p-gutter text-error"
                >
                    {erro}
                </p>
            )}
            {sucesso && (
                <p
                    role="status"
                    className="rounded-card bg-primary/10 p-gutter text-primary"
                >
                    {sucesso}
                </p>
            )}
            <form
                onSubmit={salvar}
                className="space-y-gutter rounded-card border border-foreground/10 p-page"
            >
                <h2 className="text-headline-md font-semibold">
                    Dados pessoais
                </h2>
                <label className="block space-y-1">
                    <span className="text-label-lg font-semibold">Nome</span>
                    <input
                        autoComplete="name"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                        className="min-h-touch w-full rounded-card border border-foreground/20 px-gutter"
                        required
                    />
                </label>
                <label className="block space-y-1">
                    <span className="text-label-lg font-semibold">E-mail</span>
                    <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        readOnly={!podeAlterarEmail}
                        aria-readonly={!podeAlterarEmail}
                        className="min-h-touch w-full rounded-card border border-foreground/20 px-gutter"
                        required
                    />
                </label>
                {!podeAlterarEmail && <p className="text-body-sm text-foreground-muted">Gerenciado pela sua Conta Google.</p>}
                {emailMudou && (
                    <PasswordField
                        id="senha-email"
                        name="senhaAtualEmail"
                        label="Confirme sua senha atual"
                        autoComplete="current-password"
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        required
                        disabled={salvando}
                    />
                )}
                <button
                    disabled={!mudou || salvando}
                    className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
                >
                    {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
            </form>
            {podeAlterarSenha && <form
                onSubmit={trocarSenha}
                className="space-y-gutter rounded-card border border-foreground/10 p-page"
            >
                <h2 className="text-headline-md font-semibold">
                    Alterar senha
                </h2>
                <PasswordField
                    id="senha-atual"
                    name="senhaAtual"
                    label="Senha atual"
                    autoComplete="current-password"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    required
                    disabled={salvando}
                />
                <PasswordField
                    id="nova-senha"
                    name="novaSenha"
                    label="Nova senha"
                    autoComplete="new-password"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                    required
                    disabled={salvando}
                />
                <PasswordField
                    id="confirmar-senha"
                    name="confirmarSenha"
                    label="Confirmar nova senha"
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    required
                    disabled={salvando}
                />
                <button
                    disabled={salvando}
                    className="min-h-touch rounded-control bg-primary px-page font-semibold text-surface disabled:opacity-60"
                >
                    {salvando ? "Alterando..." : "Alterar senha"}
                </button>
            </form>}
            {usuario?.formasAcesso && <section className="rounded-card border border-foreground/10 p-page"><h2 className="text-headline-md font-semibold">Formas de acesso</h2><p className="mt-2 text-body-md text-foreground-muted">{usuario.formasAcesso.includes("GOOGLE") ? "Conta Google" : ""}{usuario.formasAcesso.includes("GOOGLE") && usuario.formasAcesso.includes("LOCAL") ? " e " : ""}{usuario.formasAcesso.includes("LOCAL") ? "Senha" : ""}</p></section>}
        </section>
    );
}
