import type { CSSProperties } from "react";

const printerPhotos = [
  "https://unsplash.com/photos/CelpKcyAOsQ/download?force=true&w=1400",
  "https://unsplash.com/photos/IBffrp08OIo/download?force=true&w=1400",
  "https://unsplash.com/photos/j6JPxXcVHsY/download?force=true&w=1400",
  "https://unsplash.com/photos/FED1QYdR1qI/download?force=true&w=1400"
];

const filamentPhotos = [
  "https://unsplash.com/photos/MzLDrWp3NYc/download?force=true&w=1200",
  "https://unsplash.com/photos/CelpKcyAOsQ/download?force=true&w=1200",
  "https://unsplash.com/photos/IBffrp08OIo/download?force=true&w=1200",
  "https://unsplash.com/photos/j6JPxXcVHsY/download?force=true&w=1200"
];

function stableIndex(value: string, length: number) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % length;
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
  const photos = kind === "printer" ? printerPhotos : filamentPhotos;
  const key = `${brand} ${name}`;
  const photo = photos[stableIndex(key, photos.length)];
  const style = {
    "--product-tone": color || (kind === "printer" ? "#10bfae" : "#7d8a92")
  } as CSSProperties;

  return (
    <div className={`product-visual ${kind} ${compact ? "compact" : ""}`} style={style}>
      <img
        src={photo}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="product-visual-overlay" />
      <div className="product-visual-copy">
        <span>{brand || (kind === "printer" ? "Imprimante 3D" : "Filament")}</span>
        <strong>{name}</strong>
      </div>
      <div className="product-visual-dot" />
    </div>
  );
}
