"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function RegisterForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const confirm = String(data.get("confirm"));

    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setPending(true);
    const result = await authClient.signUp.email({
      name: String(data.get("name")),
      email: String(data.get("email")),
      password
    });
    setPending(false);

    if (result.error) {
      setError(result.error.message || "Création du compte impossible.");
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <>
      <form className="form" onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <div className="field">
          <label htmlFor="name">Nom</label>
          <input className="input" id="name" name="name" autoComplete="name" required maxLength={100} />
        </div>
        <div className="field">
          <label htmlFor="email">Adresse e-mail</label>
          <input className="input" id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input className="input" id="password" name="password" type="password" minLength={10} autoComplete="new-password" required />
          <small>10 caractères minimum.</small>
        </div>
        <div className="field">
          <label htmlFor="confirm">Confirmation</label>
          <input className="input" id="confirm" name="confirm" type="password" minLength={10} autoComplete="new-password" required />
        </div>
        <button className="button primary" disabled={pending}>
          {pending ? "Création…" : "Créer mon espace Filario"}
        </button>
      </form>
      <div className="auth-switch">
        Déjà inscrit ? <Link href="/login">Se connecter</Link>
      </div>
    </>
  );
}
