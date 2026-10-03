"use client";

import { useState } from "react";

export function DataPortability() {
  const [file, setFile] = useState<File | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function restore() {
    if (!file || !confirm) return;
    setPending(true);
    setMessage("");
    setError("");

    const body = new FormData();
    body.set("backup", file);

    const response = await fetch("/api/import", {
      method: "POST",
      body
    });
    const result = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(result.error || "Import impossible.");
      return;
    }

    setMessage(`Restauration terminée : ${result.organizationName}.`);
    setTimeout(() => window.location.href = "/dashboard", 900);
  }

  return (
    <div className="grid grid-2">
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Exporter</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Téléchargez une archive <code>.filario</code> contenant votre inventaire, vos emplacements,
          imprimantes, historiques et paramètres métier.
        </p>
        <a className="button primary" href="/api/export">Télécharger ma sauvegarde</a>
        <p style={{ color: "var(--muted)", fontSize: 12, lineHeight: 1.5, marginTop: 16 }}>
          Les mots de passe, secrets TOTP et passkeys ne sont pas inclus. Ils doivent être réenregistrés
          sur l'instance de destination.
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Restaurer</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Restaurez une sauvegarde Filario Cloud ou Self-Hosted dans cet espace.
          Les checksums SHA-256 sont vérifiés avant toute écriture.
        </p>
        {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}
        {message && <div className="success" style={{ marginBottom: 14 }}>{message}</div>}
        <div className="form">
          <div className="field">
            <label>Archive .filario</label>
            <input
              className="input"
              type="file"
              accept=".filario,.zip,application/zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          <label style={{ display: "flex", gap: 9, alignItems: "flex-start", fontSize: 13, lineHeight: 1.5 }}>
            <input type="checkbox" checked={confirm} onChange={(e) => setConfirm(e.target.checked)} />
            Je comprends que la restauration remplace les données métier actuelles de cet espace.
          </label>
          <button className="button danger" type="button" onClick={restore} disabled={!file || !confirm || pending}>
            {pending ? "Restauration…" : "Restaurer l'archive"}
          </button>
        </div>
      </section>
    </div>
  );
}
