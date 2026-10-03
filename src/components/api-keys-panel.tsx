"use client";

import { useEffect, useState } from "react";

type ApiKeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
};

const availableScopes = [
  "spools:read",
  "spools:write",
  "printers:read",
  "jobs:read",
  "jobs:write"
];

export function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [name, setName] = useState("Intégration");
  const [scopes, setScopes] = useState<string[]>(["spools:read"]);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function load() {
    const response = await fetch("/api/settings/api-keys", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setKeys(data.keys);
  }

  useEffect(() => {
    void load();
  }, []);

  function toggleScope(scope: string) {
    setScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope]
    );
  }

  async function createKey() {
    setError("");
    setSecret("");
    setPending(true);
    const response = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, scopes })
    });
    const data = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(data.error || "Création impossible.");
      return;
    }

    setSecret(data.secret);
    await load();
  }

  async function revoke(id: string) {
    await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="grid grid-2" style={{ alignItems: "start" }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Créer une clé API</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Le secret n'est affiché qu'une seule fois. Filario ne stocke que son hash SHA-256.
        </p>

        {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}
        {secret && (
          <div className="success" style={{ marginBottom: 14 }}>
            <strong>Copiez cette clé maintenant :</strong>
            <code style={{ display: "block", marginTop: 8, overflowWrap: "anywhere", userSelect: "all" }}>
              {secret}
            </code>
          </div>
        )}

        <div className="form">
          <div className="field">
            <label>Nom</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>

          <div className="field">
            <label>Scopes</label>
            <div className="grid" style={{ gap: 7 }}>
              {availableScopes.map((scope) => (
                <label key={scope} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <code>{scope}</code>
                </label>
              ))}
            </div>
          </div>

          <button
            className="button primary"
            type="button"
            onClick={createKey}
            disabled={pending || !name.trim() || scopes.length === 0}
          >
            {pending ? "Création…" : "Créer la clé"}
          </button>
        </div>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Clés existantes</h2>
        {keys.length === 0 ? (
          <div className="empty"><strong>Aucune clé API.</strong>Créez-en une pour une intégration externe.</div>
        ) : (
          <div className="grid">
            {keys.map((key) => (
              <div className="card flat" key={key.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div>
                    <strong>{key.name}</strong>
                    <code style={{ display: "block", color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                      {key.prefix}…
                    </code>
                  </div>
                  <span className="pill">{key.revokedAt ? "Révoquée" : "Active"}</span>
                </div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 12 }}>
                  {key.scopes.map((scope) => <span className="pill" key={scope}>{scope}</span>)}
                </div>
                {!key.revokedAt && (
                  <button className="button danger small" type="button" onClick={() => revoke(key.id)} style={{ marginTop: 12 }}>
                    Révoquer
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
