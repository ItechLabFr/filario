"use client";

import { useCallback, useEffect, useState } from "react";

type UpdateState = {
  enabled: boolean;
  currentVersion: string;
  status: {
    state: string;
    version: string | null;
    message: string;
    updatedAt?: string;
  };
};

export function SystemUpdatePanel() {
  const [data, setData] = useState<UpdateState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/system/update", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) setData(result);
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function upload() {
    if (!file) return;
    setPending(true);
    setError("");

    const form = new FormData();
    form.set("update", file);

    const response = await fetch("/api/system/update", {
      method: "POST",
      body: form
    });
    const result = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(result.error || "Mise à jour impossible.");
      return;
    }

    setFile(null);
    await load();
  }

  return (
    <div className="grid grid-2" style={{ alignItems: "start" }}>
      <section className="card">
        <h2 style={{ marginTop: 0 }}>Système</h2>
        <div className="kv">
          <div className="kv-item">
            <span>Version actuelle</span>
            <strong>{data?.currentVersion || "…"}</strong>
          </div>
          <div className="kv-item">
            <span>État updater</span>
            <strong>{data?.status.state || "…"}</strong>
          </div>
        </div>
        <p style={{ color: "var(--muted)", lineHeight: 1.6, marginTop: 16 }}>
          {data?.status.message || "Lecture de l'état…"}
        </p>
      </section>

      <section className="card">
        <h2 style={{ marginTop: 0 }}>Installer depuis un ZIP</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>
          Filario accepte uniquement les paquets dont le manifeste est signé en Ed25519
          et qui ciblent une image officielle par digest SHA-256.
        </p>

        {data && !data.enabled && (
          <div className="error" style={{ marginBottom: 14 }}>
            Clé publique de mise à jour non configurée sur cette instance.
          </div>
        )}
        {error && <div className="error" style={{ marginBottom: 14 }}>{error}</div>}

        <div className="form">
          <div className="field">
            <label>Paquet filario-update-*.zip</label>
            <input
              className="input"
              type="file"
              accept=".zip,application/zip"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </div>
          <button
            className="button primary"
            type="button"
            onClick={upload}
            disabled={!file || pending || !data?.enabled}
          >
            {pending ? "Vérification…" : "Vérifier et installer"}
          </button>
        </div>
      </section>
    </div>
  );
}
