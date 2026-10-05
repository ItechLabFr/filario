"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PrinterDeleteButton({
  printerId,
  printerName,
  cloud = false
}: {
  printerId: string;
  printerName: string;
  cloud?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    const detail = cloud
      ? "Elle restera liée à votre compte Bambu, mais Filario ne la réimportera plus automatiquement."
      : "Les impressions existantes conserveront leur historique sans cette machine.";

    if (!window.confirm(`Supprimer « ${printerName} » de Filario ?\n\n${detail}`)) return;

    setPending(true);
    setError("");

    try {
      const response = await fetch(`/api/printers/${printerId}`, {
        method: "DELETE"
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Suppression impossible.");
      router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Suppression impossible.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="printer-delete-wrap">
      <button className="button small danger subtle-danger" type="button" disabled={pending} onClick={remove}>
        {pending ? "Suppression…" : "Supprimer"}
      </button>
      {error && <small className="inline-error">{error}</small>}
    </div>
  );
}
