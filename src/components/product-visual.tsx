import type { CSSProperties } from "react";

type PrinterShape = "open" | "enclosed" | "delta" | "generic";

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function printerShape(brand: string, name: string): PrinterShape {
  const value = normalize(`${brand} ${name}`);

  if (
    value.includes("bambu lab a1") ||
    value.includes("bambu a1") ||
    value.includes("a1 mini") ||
    value.includes("prusa mk") ||
    value.includes("prusa mini") ||
    value.includes("ender") ||
    value.includes("neptune") ||
    value.includes("kobra")
  ) return "open";

  if (
    value.includes("x1 carbon") ||
    value.includes("x1c") ||
    value.includes("p1s") ||
    value.includes("p1p") ||
    value.includes("h2d") ||
    value.includes("h2s") ||
    value.includes("k1") ||
    value.includes("k2") ||
    value.includes("core one") ||
    value.includes("centauri")
  ) return "enclosed";

  if (value.includes("delta") || value.includes("v400")) return "delta";

  return "generic";
}

function initials(brand: string) {
  const parts = brand.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "3D";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function ProductVisual({
  kind,
  brand,
  name,
  color,
  compact = false
}: {
  kind: "printer" | "filament";
  brand: string;
  name: string;
  color?: string | null;
  compact?: boolean;
}) {
  const tone = color || (kind === "printer" ? "#10bfae" : "#7d8a92");
  const style = {
    "--product-tone": tone
  } as CSSProperties;

  if (kind === "filament") {
    return (
      <div className={`product-visual filament ${compact ? "compact" : ""}`} style={style}>
        <div className="filament-art" aria-hidden="true">
          <span className="filament-spool">
            <i className="filament-hub" />
            <i className="filament-windings" />
          </span>
          <span className="product-brand-badge">{initials(brand)}</span>
        </div>
        <div className="product-visual-copy">
          <span>{brand || "Filament"}</span>
          <strong>{name}</strong>
        </div>
        <div className="product-visual-dot" />
      </div>
    );
  }

  const shape = printerShape(brand, name);

  return (
    <div className={`product-visual printer ${compact ? "compact" : ""}`} style={style}>
      <div className={`printer-art printer-art-${shape}`} aria-hidden="true">
        <span className="printer-frame">
          <i className="printer-bed" />
          <i className="printer-gantry" />
          <i className="printer-head" />
          <i className="printer-door" />
        </span>
        <span className="product-brand-badge">{initials(brand)}</span>
      </div>
      <div className="product-visual-copy">
        <span>{brand || "Imprimante 3D"}</span>
        <strong>{name}</strong>
      </div>
      <div className="product-visual-dot" />
    </div>
  );
}
