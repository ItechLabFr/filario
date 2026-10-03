import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OFD_BULK_URL =
  process.env.OPEN_FILAMENT_DATABASE_URL ||
  "https://api.openfilamentdatabase.org/json/all.json";

type GenericRow = Record<string, any>;

function idOf(row: GenericRow) {
  return String(row.id ?? row.uuid ?? "");
}

function parentId(row: GenericRow, snake: string, camel: string) {
  return String(row[snake] ?? row[camel] ?? "");
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function colorHex(value: unknown) {
  if (Array.isArray(value)) return text(value[0]);
  return text(value);
}

export async function GET(request: NextRequest) {
  const query = (request.nextUrl.searchParams.get("q") || "").trim().toLowerCase();
  if (query.length < 2) {
    return Response.json({ data: [], source: "Open Filament Database" });
  }

  try {
    const response = await fetch(OFD_BULK_URL, {
      headers: { "User-Agent": "Filario/0.1 (+https://filario.fr)" },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(12_000)
    });

    if (!response.ok) {
      throw new Error(`OFD returned ${response.status}`);
    }

    const dataset = await response.json() as GenericRow;
    const brands: GenericRow[] = Array.isArray(dataset.brands) ? dataset.brands : [];
    const materials: GenericRow[] = Array.isArray(dataset.materials) ? dataset.materials : [];
    const filaments: GenericRow[] = Array.isArray(dataset.filaments) ? dataset.filaments : [];
    const variants: GenericRow[] = Array.isArray(dataset.variants) ? dataset.variants : [];
    const sizes: GenericRow[] = Array.isArray(dataset.sizes) ? dataset.sizes : [];

    const brandById = new Map(brands.map((row) => [idOf(row), row]));
    const materialById = new Map(materials.map((row) => [idOf(row), row]));
    const filamentById = new Map(filaments.map((row) => [idOf(row), row]));
    const sizesByVariant = new Map<string, GenericRow[]>();

    for (const size of sizes) {
      const variantId = parentId(size, "variant_id", "variantId");
      if (!variantId) continue;
      const list = sizesByVariant.get(variantId) || [];
      list.push(size);
      sizesByVariant.set(variantId, list);
    }

    const results: GenericRow[] = [];

    for (const variant of variants) {
      const filament = filamentById.get(parentId(variant, "filament_id", "filamentId"));
      if (!filament) continue;

      const material = materialById.get(
        parentId(filament, "material_id", "materialId") ||
        parentId(variant, "material_id", "materialId")
      );
      const brand = brandById.get(
        parentId(filament, "brand_id", "brandId") ||
        parentId(material || {}, "brand_id", "brandId") ||
        parentId(variant, "brand_id", "brandId")
      );

      const haystack = [
        brand?.name,
        material?.material,
        filament.name,
        variant.name,
        variant.slug,
        filament.slug
      ].filter(Boolean).join(" ").toLowerCase();

      if (!haystack.includes(query)) continue;

      const embeddedSizes = Array.isArray(variant.sizes) ? variant.sizes : [];
      const availableSizes = embeddedSizes.length
        ? embeddedSizes
        : (sizesByVariant.get(idOf(variant)) || []);
      const preferredSize =
        availableSizes.find((size) => Number(size.diameter) === 1.75) ||
        availableSizes[0] ||
        {};

      results.push({
        externalSource: "open-filament-database",
        externalId: idOf(variant) || idOf(filament),
        manufacturer: text(brand?.name) || "Inconnu",
        productName: text(filament.name) || text(variant.name) || "Filament",
        material: text(material?.material) || text(filament.materialType) || "OTHER",
        colorName: text(variant.name),
        colorHex: colorHex(variant.color_hex) || null,
        diameterMm: Number(preferredSize.diameter || 1.75),
        initialWeightG: Number(preferredSize.filament_weight || 1000),
        spoolWeightG: preferredSize.empty_spool_weight == null
          ? null
          : Number(preferredSize.empty_spool_weight),
        densityGCm3: filament.density == null ? null : Number(filament.density),
        nozzleMinC: filament.min_print_temperature == null ? null : Number(filament.min_print_temperature),
        nozzleMaxC: filament.max_print_temperature == null ? null : Number(filament.max_print_temperature),
        bedMinC: filament.min_bed_temperature == null ? null : Number(filament.min_bed_temperature),
        bedMaxC: filament.max_bed_temperature == null ? null : Number(filament.max_bed_temperature),
        dryingTempC:
          filament.max_dry_temperature == null
            ? (material?.default_max_dry_temperature == null ? null : Number(material.default_max_dry_temperature))
            : Number(filament.max_dry_temperature),
        dataSheetUrl: text(filament.data_sheet_url) || null,
        gtin: text(preferredSize.gtin) || null,
        articleNumber: text(preferredSize.article_number) || null
      });

      if (results.length >= 40) break;
    }

    // Some products have no color variant yet. Still expose the filament itself.
    if (results.length < 40) {
      for (const filament of filaments) {
        const material = materialById.get(parentId(filament, "material_id", "materialId"));
        const brand = brandById.get(
          parentId(filament, "brand_id", "brandId") ||
          parentId(material || {}, "brand_id", "brandId")
        );
        const haystack = [
          brand?.name,
          material?.material,
          filament.name,
          filament.slug
        ].filter(Boolean).join(" ").toLowerCase();

        if (!haystack.includes(query)) continue;
        if (results.some((row) => row.externalId === idOf(filament))) continue;

        results.push({
          externalSource: "open-filament-database",
          externalId: idOf(filament),
          manufacturer: text(brand?.name) || "Inconnu",
          productName: text(filament.name) || "Filament",
          material: text(material?.material) || "OTHER",
          colorName: null,
          colorHex: null,
          diameterMm: 1.75,
          initialWeightG: 1000,
          spoolWeightG: null,
          densityGCm3: filament.density == null ? null : Number(filament.density),
          nozzleMinC: filament.min_print_temperature == null ? null : Number(filament.min_print_temperature),
          nozzleMaxC: filament.max_print_temperature == null ? null : Number(filament.max_print_temperature),
          bedMinC: filament.min_bed_temperature == null ? null : Number(filament.min_bed_temperature),
          bedMaxC: filament.max_bed_temperature == null ? null : Number(filament.max_bed_temperature),
          dryingTempC:
            filament.max_dry_temperature == null
              ? (material?.default_max_dry_temperature == null ? null : Number(material.default_max_dry_temperature))
              : Number(filament.max_dry_temperature),
          dataSheetUrl: text(filament.data_sheet_url) || null
        });

        if (results.length >= 40) break;
      }
    }

    return Response.json({
      data: results,
      source: "Open Filament Database",
      version: dataset.version ?? dataset.generated_at ?? null
    }, {
      headers: {
        "Cache-Control": "private, max-age=300"
      }
    });
  } catch {
    return Response.json({
      data: [],
      source: "Open Filament Database",
      warning: "catalog_unavailable"
    }, { status: 200 });
  }
}
