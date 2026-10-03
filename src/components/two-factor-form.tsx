"use client";

import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function TwoFactorForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const data = new FormData(event.currentTarget);

    const result = await authClient.twoFactor.verifyTotp({
      code: String(data.get("code")).replace(/\s/g, ""),
      trustDevice: Boolean(data.get("trustDevice"))
    });

    setPending(false);
    if (result.error) {
      setError(result.error.message || "Code incorrect.");
      return;
    }
    window.location.href = "/dashboard";
  }

  return (
    <form className="form" onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <div className="field">
        <label htmlFor="code">Code à 6 chiffres</label>
        <input
          className="input"
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
        />
      </div>
      <label style={{ display: "flex", gap: 9, alignItems: "center", fontSize: 13 }}>
        <input type="checkbox" name="trustDevice" value="1" />
        Faire confiance à cet appareil pendant 30 jours
      </label>
      <button className="button primary" disabled={pending}>
        {pending ? "Vérification…" : "Vérifier"}
      </button>
    </form>
  );
}
