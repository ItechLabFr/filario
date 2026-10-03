"use client";

import { useRef, useState } from "react";

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

type InitResult = {
  uploadId: string;
  chunkSize: number;
  maxBytes: number;
};

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    if (response.status === 413) {
      return {
        error:
          "Le reverse proxy a refusé la requête. Rechargez Filario après la mise à jour : l’import par blocs évite désormais cette limite."
      };
    }
    return {
      error: text
        ? `Réponse serveur inattendue (${response.status}).`
        : `Erreur serveur (${response.status}).`
    };
  }
}

function prettyBytes(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
  }
  return `${Math.max(1, Math.round(value / 1024)).toLocaleString("fr-FR")} Ko`;
}

export function ModelPublisher({ canPublishPublic }: { canPublishPublic: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  function chooseFile(next: File | null) {
    setError("");
    setResult(null);
    setProgress(0);

    if (!next) {
      setFile(null);
      return;
    }

    if (!next.name.toLowerCase().endsWith(".3mf")) {
      setFile(null);
      setError("Choisissez un fichier .3mf. Sur iPhone : Fichiers → sélectionner le projet 3MF.");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setFile(next);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;

    setError("");
    setResult(null);
    setProgress(0);

    if (!file) {
      setError("Sélectionnez d’abord votre fichier .3mf.");
      return;
    }

    setPending(true);

    try {
      const form = new FormData(formElement);
      const metadata = {
        fileName: file.name,
        fileSize: file.size,
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? ""),
        visibility: String(form.get("visibility") ?? "private"),
        license: String(form.get("license") ?? "All rights reserved")
      };

      setStage("Préparation de l’import…");

      const initResponse = await fetch("/api/models/upload/init", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metadata)
      });
      const initPayload = await readJson(initResponse);

      if (!initResponse.ok) {
        throw new Error(initPayload.error || "Impossible de préparer l’import.");
      }

      const { uploadId, chunkSize } = initPayload as InitResult;
      const chunks = Math.ceil(file.size / chunkSize);

      for (let index = 0; index < chunks; index += 1) {
        const start = index * chunkSize;
        const end = Math.min(file.size, start + chunkSize);
        const blob = file.slice(start, end);

        setStage(`Envoi du 3MF… ${Math.round((start / file.size) * 100)} %`);

        const chunkResponse = await fetch(
          `/api/models/upload/${uploadId}/chunk?index=${index}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: blob
          }
        );
        const chunkPayload = await readJson(chunkResponse);

        if (!chunkResponse.ok) {
          throw new Error(chunkPayload.error || `Bloc ${index + 1} impossible à envoyer.`);
        }

        setProgress(Math.round((end / file.size) * 100));
      }

      setStage("Analyse du profil et du modèle 3D…");

      const completeResponse = await fetch(
        `/api/models/upload/${uploadId}/complete`,
        { method: "POST" }
      );
      const completePayload = await readJson(completeResponse);

      if (!completeResponse.ok) {
        throw new Error(completePayload.error || "Impossible de finaliser le modèle.");
      }

      setProgress(100);
      setStage("Import terminé.");
      setResult(completePayload);
      setFile(null);
      formElement.reset();
      if (inputRef.current) inputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Import impossible.");
      setStage("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card form model-publish-form" onSubmit={submit}>
      <div>
        <span className="eyebrow">Nouveau modèle</span>
        <h2>Publier un projet 3MF</h2>
        <p className="muted">
          Filario envoie le fichier par petits blocs, analyse le profil d’impression puis génère l’aperçu 3D.
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
        <label className="model-file-picker">
          <input
            ref={inputRef}
            name="file"
            type="file"
            onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
            disabled={pending}
          />
          <span className="model-file-picker-icon">3MF</span>
          <span className="model-file-picker-copy">
            <strong>{file ? file.name : "Choisir un fichier 3MF"}</strong>
            <small>
              {file
                ? `${prettyBytes(file.size)} · prêt à être envoyé`
                : "iPhone, Android, ordinateur · jusqu’à 250 Mo"}
            </small>
          </span>
          <span className="button small" aria-hidden="true">Parcourir</span>
        </label>
        <small>
          Le filtre de fichier a été retiré pour iOS : Filario contrôle lui-même l’extension après sélection.
        </small>
      </div>

      {pending && (
        <div className="model-upload-status" aria-live="polite">
          <div>
            <strong>{stage || "Import…"}</strong>
            <span>{progress}%</span>
          </div>
          <div className="progress">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

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

      <button className="button primary" disabled={pending || !file} type="submit">
        {pending ? "Import en cours…" : "Importer et analyser le 3MF"}
      </button>
    </form>
  );
}
