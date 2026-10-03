import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { pool } from "@/lib/db";
import { inspect3mf } from "@/lib/model-package";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modelDir = process.env.FILARIO_MODEL_DIR || "/var/lib/filario/models";
const maxBytes = 100 * 1024 * 1024;

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54) || "modele";
}

const allowedLicenses = new Set([
  "All rights reserved",
  "CC0-1.0",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "CC-BY-NC-4.0",
  "CC-BY-NC-SA-4.0"
]);

export async function POST(request: Request) {
  let tempPath = "";

  try {
    const session = await requireSession();
    const workspace = await ensureWorkspace(session.user);
    const form = await request.formData();

    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "Fichier .3mf manquant." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".3mf")) {
      return Response.json({ error: "Filario accepte actuellement les projets .3mf." }, { status: 400 });
    }

    if (file.size <= 0 || file.size > maxBytes) {
      return Response.json({ error: "Le fichier doit faire moins de 100 Mo." }, { status: 400 });
    }

    const title = String(form.get("title") ?? "").trim().slice(0, 180);
    if (!title) {
      return Response.json({ error: "Le titre est obligatoire." }, { status: 400 });
    }

    const description = String(form.get("description") ?? "").trim().slice(0, 12000);
    const requestedVisibility = String(form.get("visibility") ?? "private");
    const visibility = ["private", "public", "unlisted"].includes(requestedVisibility)
      ? requestedVisibility
      : "private";
    const requestedLicense = String(form.get("license") ?? "All rights reserved");
    const license = allowedLicenses.has(requestedLicense) ? requestedLicense : "All rights reserved";

    if (visibility === "public") {
      const maker = await pool.query(
        "SELECT is_public FROM maker_profiles WHERE user_id = $1 LIMIT 1",
        [session.user.id]
      );
      if (!maker.rows[0]?.is_public) {
        return Response.json({
          error: "Rendez d’abord votre profil maker public pour publier ce modèle."
        }, { status: 400 });
      }
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const profileMetadata = await inspect3mf(bytes);

    const id = randomUUID();
    const slug = `${slugify(title)}-${id.slice(0, 8)}`;
    const storagePath = path.join(modelDir, `${id}.3mf`);
    tempPath = `${storagePath}.tmp`;

    await mkdir(modelDir, { recursive: true });
    await writeFile(tempPath, bytes, { mode: 0o600 });
    await rename(tempPath, storagePath);
    tempPath = "";

    try {
      await pool.query(
        `INSERT INTO published_models (
          id, organization_id, owner_user_id, slug, title, description, license,
          visibility, file_name, file_size_bytes, storage_path, profile_metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
        [
          id,
          workspace.organizationId,
          session.user.id,
          slug,
          title,
          description || null,
          license,
          visibility,
          file.name.slice(0, 255),
          file.size,
          storagePath,
          JSON.stringify(profileMetadata)
        ]
      );
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

    return Response.json({
      ok: true,
      id,
      slug,
      visibility,
      profileMetadata,
      url: `/models/${slug}`
    }, { status: 201 });
  } catch (error) {
    if (tempPath) await unlink(tempPath).catch(() => undefined);
    return Response.json({
      error: error instanceof Error ? error.message : "Publication impossible."
    }, { status: 400 });
  }
}
