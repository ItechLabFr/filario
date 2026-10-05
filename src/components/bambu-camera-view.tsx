"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function BambuCameraView({
  printerId,
  enabled,
  host,
  initialError
}: {
  printerId: string;
  enabled: boolean;
  host: string | null;
  initialError: string | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState(enabled);
  const [cameraHost, setCameraHost] = useState(host || "");
  const [editing, setEditing] = useState(!enabled);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(initialError || "");
  const [frameUrl, setFrameUrl] = useState("");
  const [connected, setConnected] = useState(false);
  const timer = useRef<number | null>(null);
  const currentUrl = useRef("");

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
    };
  }, []);

  useEffect(() => {
    if (!active || editing) return;

    let stopped = false;

    async function loadFrame() {
      try {
        const response = await fetch(`/api/printers/${printerId}/camera/frame?t=${Date.now()}`, {
          cache: "no-store"
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || "Flux caméra indisponible.");
        }

        const blob = await response.blob();
        if (stopped) return;

        const url = URL.createObjectURL(blob);
        if (currentUrl.current) URL.revokeObjectURL(currentUrl.current);
        currentUrl.current = url;
        setFrameUrl(url);
        setConnected(true);
        setError("");

        timer.current = window.setTimeout(loadFrame, 1200);
      } catch (frameError) {
        if (stopped) return;
        setConnected(false);
        setError(frameError instanceof Error ? frameError.message : "Flux caméra indisponible.");
        timer.current = window.setTimeout(loadFrame, 5000);
      }
    }

    loadFrame();

    return () => {
      stopped = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [active, editing, printerId]);

  async function save(nextEnabled: boolean) {
    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/printers/${printerId}/camera`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: nextEnabled,
          host: cameraHost
        })
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Configuration caméra impossible.");

      setActive(nextEnabled);
      setEditing(!nextEnabled);
      setConnected(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Configuration caméra impossible.");
    } finally {
      setPending(false);
    }
  }

  if (!active || editing) {
    return (
      <div className="camera-setup-panel">
        <div className="camera-setup-copy">
          <span className="machine-section-label">Caméra réelle</span>
          <strong>{active ? "Modifier la connexion caméra" : "Afficher la caméra dans Filario"}</strong>
          <p>
            La machine reste en Bambu Cloud. Indiquez simplement son IP locale ; Filario utilise le code d’accès reçu du compte Bambu.
          </p>
        </div>
        <div className="camera-setup-form">
          <input
            className="input"
            inputMode="decimal"
            value={cameraHost}
            onChange={(event) => setCameraHost(event.target.value)}
            placeholder="192.168.1.42"
            aria-label="Adresse IP locale de l’imprimante"
          />
          <button
            className="button primary"
            type="button"
            disabled={pending || !cameraHost}
            onClick={() => save(true)}
          >
            {pending ? "Connexion…" : "Activer la caméra"}
          </button>
          {active && (
            <button className="button" type="button" disabled={pending} onClick={() => setEditing(false)}>
              Annuler
            </button>
          )}
        </div>
        {error && <div className="camera-inline-error">{error}</div>}
      </div>
    );
  }

  return (
    <div className="camera-live">
      <div className="camera-live-head">
        <div>
          <span className={connected ? "camera-live-dot online" : "camera-live-dot"} />
          <strong>Caméra</strong>
          <span>{connected ? "Direct local" : "Reconnexion…"}</span>
        </div>
        <div className="camera-live-actions">
          <button className="text-button" type="button" onClick={() => setEditing(true)}>
            Configurer
          </button>
          <button className="text-button danger-text" type="button" disabled={pending} onClick={() => save(false)}>
            Désactiver
          </button>
        </div>
      </div>

      <div className="camera-live-frame">
        {frameUrl ? (
          <img src={frameUrl} alt="Vue caméra de l’imprimante Bambu Lab" />
        ) : (
          <div className="camera-loading">
            <span className="camera-loader" />
            <strong>Connexion à la caméra…</strong>
          </div>
        )}
        {!connected && error && <div className="camera-overlay-error">{error}</div>}
      </div>
    </div>
  );
}
