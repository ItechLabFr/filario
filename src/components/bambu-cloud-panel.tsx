"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Account = {
  id: string;
  email: string;
  region: "global" | "china";
  status: string;
  updatedAt: string;
  lastError: string | null;
  deviceCount: number;
};

async function json(response: Response) {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return { error: text || `HTTP ${response.status}` }; }
}

export function BambuCloudPanel({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [region, setRegion] = useState<"global" | "china">("global");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sendCode() {
    setPending("code");
    setError("");
    setMessage("");
    const response = await fetch("/api/integrations/bambu/send-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, region })
    });
    const payload = await json(response);
    setPending("");
    if (!response.ok) {
      setError(payload.error || "Impossible d’envoyer le code.");
      return;
    }
    setStep("code");
    setMessage("Bambu Lab a envoyé un code à votre adresse e-mail.");
  }

  async function verify() {
    setPending("verify");
    setError("");
    setMessage("");
    const response = await fetch("/api/integrations/bambu/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code, region })
    });
    const payload = await json(response);
    setPending("");
    if (!response.ok) {
      setError(payload.error || "Connexion Bambu impossible.");
      return;
    }
    setMessage(payload.message || "Compte Bambu connecté.");
    setCode("");
    setEmail("");
    setStep("email");
    router.refresh();
  }

  async function sync(accountId: string) {
    setPending(accountId);
    setError("");
    const response = await fetch("/api/integrations/bambu/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId })
    });
    const payload = await json(response);
    setPending("");
    if (!response.ok) {
      setError(payload.error || "Synchronisation impossible.");
      return;
    }
    setMessage(`${payload.deviceCount ?? 0} imprimante(s) synchronisée(s).`);
    router.refresh();
  }

  async function disconnect(accountId: string) {
    if (!window.confirm("Déconnecter ce compte Bambu de Filario ?")) return;
    setPending(accountId);
    setError("");
    const response = await fetch("/api/integrations/bambu/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId })
    });
    const payload = await json(response);
    setPending("");
    if (!response.ok) {
      setError(payload.error || "Déconnexion impossible.");
      return;
    }
    setMessage("Compte Bambu déconnecté.");
    router.refresh();
  }

  return (
    <div className="integration-stack">
      <section className="surface-panel integration-connect-panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Bambu Cloud · Beta</span>
            <h2>Connecter un compte Bambu Lab</h2>
            <p>
              Connexion par code e-mail. Aucun mot de passe Bambu n’est enregistré dans Filario.
            </p>
          </div>
          <span className="status-chip status-beta">Cloud</span>
        </div>

        {error && <div className="error">{error}</div>}
        {message && <div className="success">{message}</div>}

        {step === "email" ? (
          <div className="integration-form-row">
            <div className="field grow">
              <label>Compte Bambu Lab</label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="vous@exemple.fr"
                autoComplete="email"
              />
            </div>
            <div className="field region-field">
              <label>Région</label>
              <select
                className="select"
                value={region}
                onChange={(event) => setRegion(event.target.value as "global" | "china")}
              >
                <option value="global">Global</option>
                <option value="china">Chine</option>
              </select>
            </div>
            <button
              className="button primary"
              type="button"
              disabled={!email || pending === "code"}
              onClick={sendCode}
            >
              {pending === "code" ? "Envoi…" : "Recevoir le code"}
            </button>
          </div>
        ) : (
          <div className="integration-form-row">
            <div className="field grow">
              <label>Code reçu par e-mail</label>
              <input
                className="input code-input"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                autoComplete="one-time-code"
              />
            </div>
            <button className="button" type="button" onClick={() => setStep("email")}>
              Retour
            </button>
            <button
              className="button primary"
              type="button"
              disabled={code.length !== 6 || pending === "verify"}
              onClick={verify}
            >
              {pending === "verify" ? "Connexion…" : "Connecter"}
            </button>
          </div>
        )}

        <div className="integration-notice">
          <strong>Lecture seule pour la version Beta.</strong>
          <span>
            Filario importe vos machines et leur état de connexion. Les commandes d’impression restent désactivées tant que l’intégration officielle Bambu n’est pas disponible.
          </span>
        </div>
      </section>

      {accounts.length > 0 && (
        <section className="surface-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">Comptes connectés</span>
              <h2>Bambu Lab</h2>
            </div>
          </div>
          <div className="connection-list">
            {accounts.map((account) => (
              <div className="connection-row" key={account.id}>
                <div className="connection-icon">B</div>
                <div className="connection-copy">
                  <strong>{account.email}</strong>
                  <span>
                    {account.deviceCount} imprimante(s) · {account.region === "china" ? "Chine" : "Global"}
                  </span>
                  {account.lastError && <small>{account.lastError}</small>}
                </div>
                <span className={account.status === "connected" ? "status-chip status-online" : "status-chip status-offline"}>
                  {account.status === "connected" ? "Connecté" : account.status}
                </span>
                <button
                  className="button small"
                  type="button"
                  disabled={pending === account.id}
                  onClick={() => sync(account.id)}
                >
                  {pending === account.id ? "Sync…" : "Synchroniser"}
                </button>
                <button
                  className="button small danger"
                  type="button"
                  disabled={pending === account.id}
                  onClick={() => disconnect(account.id)}
                >
                  Déconnecter
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
