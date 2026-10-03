"use client";

import { useEffect, useRef, useState } from "react";

type CatalogResult = {
  externalSource: string;
  externalId: string;
  manufacturer: string;
  productName: string;
  material: string;
  colorName: string | null;
  colorHex: string | null;
  diameterMm: number;
  initialWeightG: number;
  spoolWeightG: number | null;
  densityGCm3: number | null;
  nozzleMinC: number | null;
  nozzleMaxC: number | null;
  bedMinC: number | null;
  bedMaxC: number | null;
  dryingTempC: number | null;
};

function setFormValue(name: string, value: string | number | null) {
  if (value == null || value === "") return;
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(
    `[name="${name}"]`
  );
  if (!element) return;
  element.value = String(value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function CatalogPicker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      const current = ++requestId.current;
      setLoading(true);
      try {
        const response = await fetch(`/api/catalog/search?q=${encodeURIComponent(query)}`);
        const payload = await response.json();
        if (current === requestId.current) {
          setResults(Array.isArray(payload.data) ? payload.data : []);
        }
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query]);

  function apply(item: CatalogResult) {
    const values: Record<string, string | number | null> = {
      externalSource: item.externalSource,
      externalId: item.externalId,
      manufacturer: item.manufacturer,
      productName: item.productName,
      material: item.material,
      colorName: item.colorName,
      colorHex: item.colorHex,
      diameterMm: item.diameterMm,
      initialWeightG: item.initialWeightG,
      remainingWeightG: item.initialWeightG,
      spoolWeightG: item.spoolWeightG,
      densityGCm3: item.densityGCm3,
      nozzleMinC: item.nozzleMinC,
      nozzleMaxC: item.nozzleMaxC,
      bedMinC: item.bedMinC,
      bedMaxC: item.bedMaxC,
      dryingTempC: item.dryingTempC
    };

    for (const [name, value] of Object.entries(values)) {
      setFormValue(name, value);
    }

    setSelected(`${item.manufacturer} · ${item.productName}${item.colorName ? ` · ${item.colorName}` : ""}`);
    setResults([]);
  }

  return (
    <div className="card flat" style={{ background: "var(--panel-2)" }}>
      <div className="field">
        <label>Rechercher dans Open Filament Database</label>
        <input
          className="input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Bambu PLA Matte, PolyTerra, Prusament PETG…"
          autoComplete="off"
        />
        <small>
          {selected
            ? `Référence appliquée : ${selected}. Vous pouvez modifier les valeurs ci-dessous.`
            : loading
              ? "Recherche…"
              : "La sélection préremplit les caractéristiques techniques disponibles."}
        </small>
      </div>

      {results.length > 0 && (
        <div className="grid" style={{ gap: 7, marginTop: 10, maxHeight: 320, overflowY: "auto" }}>
          {results.map((item, index) => (
            <button
              key={`${item.externalId}-${index}`}
              className="button"
              type="button"
              onClick={() => apply(item)}
              style={{ justifyContent: "flex-start", minHeight: 48, textAlign: "left" }}
            >
              {item.colorHex && (
                <span className="color-dot" style={{ background: item.colorHex }} />
              )}
              <span>
                <strong>{item.manufacturer} · {item.productName}</strong>
                <span style={{ display: "block", fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                  {item.material}{item.colorName ? ` · ${item.colorName}` : ""}
                  {item.nozzleMinC != null ? ` · ${item.nozzleMinC}–${item.nozzleMaxC ?? item.nozzleMinC} °C` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
