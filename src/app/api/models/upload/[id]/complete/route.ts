import { readFile, rename, rm, unlink } from "node:fs/promises";
import path from "node:path";
import { pool } from "@/lib/db";
import { inspect3mf } from "@/lib/model-package";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modelDir = process.env.FILARIO_MODEL_DIR || "/var/lib/filario/models";

type UploadMetadata = {
  uploadId: string;
  userId: string;
  organizationId: string;
  fileName: string;
  fileSize: number;
  title: string;
  description: string;
  visibility: "private" | "unlisted" | "public";
  license: string;
  bytesReceived: number;
  nextIndex: number;
  createdAt: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 54) || "modele";
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let storagePath = "";

  try {
    const session = await requireSession();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ error: "Import invalide." }, { status: 400 });
    }

    const uploadDir = path.join(modelDir, ".uploads", id);
    const metadata = JSON.parse(
      await readFile(path.join(uploadDir, "metadata.json"), "utf8")
    ) as UploadMetadata;

    if (metadata.userId !== session.user.id) {
      return Response.json({ error: "Import introuvable." }, { status: 404 });
    }

    if (metadata.bytesReceived !== metadata.fileSize) {
      return Response.json({
        error: `Import incomplet : ${metadata.bytesReceived} / ${metadata.fileSize} octets reçus.`
      }, { status: 409 });
    }

    const partPath = path.join(uploadDir, "payload.3mf.part");
    const bytes = await readFile(partPath);
    const profileMetadata = await inspect3mf(bytes);

    const slug = `${slugify(metadata.title)}-${id.slice(0, 8)}`;
    storagePath = path.join(modelDir, `${id}.3mf`);
    await rename(partPath, storagePath);

    try {
      await pool.query(
        `INSERT INTO published_models (
          id, organization_id, owner_user_id, slug, title, description, license,
          visibility, file_name, file_size_bytes, storage_path, profile_metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb)`,
        [
          id,
          metadata.organizationId,
          session.user.id,
          slug,
          metadata.title,
          metadata.description || null,
          metadata.license,
          metadata.visibility,
          metadata.fileName,
          metadata.fileSize,
          storagePath,
          JSON.stringify(profileMetadata)
        ]
      );
    } catch (error) {
      await unlink(storagePath).catch(() => undefined);
      throw error;
    }

    await rm(uploadDir, { recursive: true, force: true }).catch(() => undefined);

    return Response.json({
      ok: true,
      id,
      slug,
      visibility: metadata.visibility,
      profileMetadata,
      url: `/models/${slug}`
    }, { status: 201 });
  } catch (error) {
    if (storagePath) {
      await unlink(storagePath).catch(() => undefined);
    }
    return Response.json({
      error: error instanceof Error ? error.message : "Impossible de finaliser le modèle 3MF."
    }, { status: 400 });
  }
}
