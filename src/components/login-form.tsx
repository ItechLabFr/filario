"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const data = new FormData(event.currentTarget);

    const result = await authClient.signIn.email({
      email: String(data.get("email")),
      password: String(data.get("password")),
      rememberMe: true
    });

    setPending(false);
    if (result.error) {
      setError(result.error.message || "Connexion impossible.");
      return;
    }

    window.location.href = "/dashboard";
  }

  async function passkeyLogin() {
    setError("");
    setPending(true);
    const result = await authClient.signIn.passkey({
      autoFill: false
    });
    setPending(false);

    if (result?.error) {
      setError(result.error.message || "Connexion avec passkey impossible.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <>
      <form className="form" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label htmlFor="email">Adresse e-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input className="input" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <button className="button primary" disabled={pending}>
          {pending ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div style={{ margin: "15px 0", display: "flex", alignItems: "center", gap: 12, color: "var(--muted)", fontSize: 12 }}>
        <span style={{ height: 1, background: "var(--border)", flex: 1 }} />
        ou
        <span style={{ height: 1, background: "var(--border)", flex: 1 }} />
      </div>

      <button className="button" style={{ width: "100%" }} type="button" onClick={passkeyLogin} disabled={pending}>
        Utiliser une passkey
      </button>

      <div className="auth-switch">
        Pas encore de compte ? <Link href="/register">Créer un espace</Link>
      </div>
    </>
  );
}
