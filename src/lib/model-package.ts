import JSZip from "jszip";

export type ModelProfileMetadata = {
  format: "3mf";
  entries: string[];
  standardMetadata: Record<string, string>;
  slicer: string | null;
  printerModel: string | null;
  nozzleDiameter: string | null;
  layerHeight: string | null;
  filamentTypes: string[];
  filamentColors: string[];
  estimatedTimeSeconds: number | null;
  estimatedFilamentGrams: number | null;
  plateCount: number;
};

function firstString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
  }
  return null;
}

function deepFind(root: unknown, keys: string[]): unknown[] {
  const wanted = new Set(keys.map((key) => key.toLowerCase()));
  const found: unknown[] = [];

  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      if (wanted.has(key.toLowerCase())) found.push(child);
      visit(child);
    }
  }

  visit(root);
  return found;
}

function parseNumber(value: string | null) {
  if (!value) return null;
  const parsed = Number(value.replace(",", ".").replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export async function inspect3mf(bytes: Buffer): Promise<ModelProfileMetadata> {
  const zip = await JSZip.loadAsync(bytes);
  const entries = Object.keys(zip.files);

  const modelEntry =
    entries.find((name) => /^3D\/.*\.model$/i.test(name)) ||
    entries.find((name) => name.toLowerCase().endsWith(".model"));

  if (!modelEntry) {
    throw new Error("Ce fichier ne contient pas de modèle 3MF valide.");
  }

  const modelXml = await zip.file(modelEntry)!.async("string");
  const standardMetadata: Record<string, string> = {};
  const metadataRegex = /<metadata\s+name=["']([^"']+)["'][^>]*>([\s\S]*?)<\/metadata>/gi;
  for (const match of modelXml.matchAll(metadataRegex)) {
    standardMetadata[match[1]] = match[2].replace(/<[^>]+>/g, "").trim();
  }

  let slicer: string | null = null;
  let printerModel: string | null = null;
  let nozzleDiameter: string | null = null;
  let layerHeight: string | null = null;
  let estimatedTimeSeconds: number | null = null;
  let estimatedFilamentGrams: number | null = null;
  const filamentTypes = new Set<string>();
  const filamentColors = new Set<string>();

  const jsonEntries = entries.filter((name) =>
    /Metadata\/.*\.(json|config)$/i.test(name) ||
    /project_settings\.config$/i.test(name)
  );

  for (const name of jsonEntries) {
    const file = zip.file(name);
    if (!file) continue;
    const text = await file.async("string");

    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      const kv: Record<string, string> = {};
      for (const match of text.matchAll(/(?:key|name)=["']([^"']+)["'][^>]*(?:value=["']([^"']*)["']|>([^<]*)<)/gi)) {
        kv[match[1]] = (match[2] ?? match[3] ?? "").trim();
      }
      parsed = kv;
    }

    const slicerValue = firstString(deepFind(parsed, ["slicer", "slicer_name", "application"])[0]);
    if (slicerValue) slicer ??= slicerValue;

    const printerValue = firstString(deepFind(parsed, [
      "printer_model", "printer_model_id", "printer_preset", "printer_settings_id"
    ])[0]);
    if (printerValue) printerModel ??= printerValue;

    const nozzleValue = firstString(deepFind(parsed, ["nozzle_diameter"])[0]);
    if (nozzleValue) nozzleDiameter ??= nozzleValue;

    const layerValue = firstString(deepFind(parsed, ["layer_height"])[0]);
    if (layerValue) layerHeight ??= layerValue;

    for (const value of deepFind(parsed, ["filament_type", "filament_types"])) {
      if (Array.isArray(value)) value.forEach((item) => {
        const v = firstString(item);
        if (v) filamentTypes.add(v);
      });
      else {
        const v = firstString(value);
        if (v) filamentTypes.add(v);
      }
    }

    for (const value of deepFind(parsed, ["filament_colour", "filament_color", "filament_colours"])) {
      if (Array.isArray(value)) value.forEach((item) => {
        const v = firstString(item);
        if (v) filamentColors.add(v);
      });
      else {
        const v = firstString(value);
        if (v) filamentColors.add(v);
      }
    }

    const time = firstString(deepFind(parsed, [
      "prediction", "estimated_time", "estimated_print_time", "print_time"
    ])[0]);
    const parsedTime = parseNumber(time);
    if (parsedTime != null && parsedTime > 0) estimatedTimeSeconds ??= Math.round(parsedTime);

    const weight = firstString(deepFind(parsed, [
      "filament_weight", "estimated_filament_weight", "total_weight"
    ])[0]);
    const parsedWeight = parseNumber(weight);
    if (parsedWeight != null && parsedWeight > 0) estimatedFilamentGrams ??= parsedWeight;
  }

  if (!slicer) {
    const joined = entries.join("\n").toLowerCase();
    if (joined.includes("bambu")) slicer = "Bambu Studio / compatible";
    else if (joined.includes("orca")) slicer = "OrcaSlicer";
    else if (joined.includes("prusaslicer")) slicer = "PrusaSlicer";
  }

  const plateIds = new Set(
    entries
      .map((name) => /(?:plate|slice_info)[_-]?(\d+)/i.exec(name)?.[1])
      .filter((value): value is string => Boolean(value))
  );

  return {
    format: "3mf",
    entries: entries.slice(0, 200),
    standardMetadata,
    slicer,
    printerModel,
    nozzleDiameter,
    layerHeight,
    filamentTypes: [...filamentTypes].slice(0, 16),
    filamentColors: [...filamentColors].slice(0, 16),
    estimatedTimeSeconds,
    estimatedFilamentGrams,
    plateCount: Math.max(1, plateIds.size)
  };
}
