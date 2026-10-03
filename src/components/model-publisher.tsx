"use client";

import { useState } from "react";

type PublishResult = {
  slug: string;
  url: string;
  profileMetadata?: {
    printerModel?: string | null;
    layerHeight?: string | null;
    filamentTypes?: string[];
    plateCount?: number;
  };
};

export function ModelPublisher({ canPublishPublic }: { canPublishPublic: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setResult(null);

    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/models/publish", {
      method: "POST",
      body: form
    });
    const payload = await response.json();
    setPending(false);

    if (!response.ok) {
      setError(payload.error || "Publication impossible.");
      return;
    }

    setResult(payload);
    event.currentTarget.reset();
  }

  return (
    <form className="card form model-publish-form" onSubmit={submit}>
      <div>
        <span className="eyebrow">Nouveau modèle</span>
        <h2>Publier un projet 3MF</h2>
        <p className="muted">
          Filario analyse le fichier, extrait le profil d’impression et génère l’aperçu 3D.
        </p>
      </div>

      {error && <div className="error">{error}</div>}
      {result && (
        <div className="success">
          Modèle importé.{" "}
          <a href={result.url} style={{ fontWeight: 800, textDecoration: "underline" }}>
            Ouvrir la fiche
          </a>
        </div>
      )}

      <div className="field">
        <label>Projet .3mf *</label>
        <input className="input file-input" name="file" type="file" accept=".3mf,model/3mf" required />
        <small>100 Mo maximum. Le modèle reste privé tant que vous ne choisissez pas Public.</small>
      </div>

      <div className="field">
        <label>Titre *</label>
        <input className="input" name="title" maxLength={180} placeholder="Support casque minimal" required />
      </div>

      <div className="field">
        <label>Description</label>
        <textarea className="textarea" name="description" maxLength={12000} placeholder="Expliquez le modèle, l’assemblage et les réglages utiles…" />
      </div>

      <div className="form-row">
        <div className="field">
          <label>Licence</label>
          <select className="select" name="license" defaultValue="All rights reserved">
            <option>All rights reserved</option>
            <option value="CC0-1.0">CC0</option>
            <option value="CC-BY-4.0">CC BY 4.0</option>
            <option value="CC-BY-SA-4.0">CC BY-SA 4.0</option>
            <option value="CC-BY-NC-4.0">CC BY-NC 4.0</option>
            <option value="CC-BY-NC-SA-4.0">CC BY-NC-SA 4.0</option>
          </select>
        </div>

        <div className="field">
          <label>Visibilité</label>
          <select className="select" name="visibility" defaultValue="private">
            <option value="private">Privé</option>
            <option value="unlisted">Non répertorié</option>
            <option value="public" disabled={!canPublishPublic}>Public</option>
          </select>
          {!canPublishPublic && <small>Activez d’abord votre profil maker public.</small>}
        </div>
      </div>

      <button className="button primary" disabled={pending} type="submit">
        {pending ? "Analyse du 3MF…" : "Importer et analyser"}
      </button>
    </form>
  );
}
