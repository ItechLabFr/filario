import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modelDir = process.env.FILARIO_MODEL_DIR || "/var/lib/filario/models";
const maxBytes = 250 * 1024 * 1024;
const chunkSize = 512 * 1024;

const schema = z.object({
  fileName: z.string().trim().min(1).max(255),
  fileSize: z.number().int().positive().max(maxBytes),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(12000).optional().default(""),
  visibility: z.enum(["private", "unlisted", "public"]).default("private"),
  license: z.enum([
    "All rights reserved",
    "CC0-1.0",
    "CC-BY-4.0",
    "CC-BY-SA-4.0",
    "CC-BY-NC-4.0",
    "CC-BY-NC-SA-4.0"
  ]).default("All rights reserved")
});

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspace = await ensureWorkspace(session.user);
    const body = schema.parse(await request.json());

    if (!body.fileName.toLowerCase().endsWith(".3mf")) {
      return Response.json({ error: "Le fichier sélectionné doit être un .3mf." }, { status: 400 });
    }

    if (body.visibility === "public") {
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

    const uploadId = randomUUID();
    const uploadDir = path.join(modelDir, ".uploads", uploadId);
    await mkdir(uploadDir, { recursive: true, mode: 0o700 });

    const metadata = {
      uploadId,
      userId: session.user.id,
      organizationId: workspace.organizationId,
      fileName: body.fileName,
      fileSize: body.fileSize,
      title: body.title,
      description: body.description,
      visibility: body.visibility,
      license: body.license,
      bytesReceived: 0,
      nextIndex: 0,
      createdAt: new Date().toISOString()
    };

    await writeFile(
      path.join(uploadDir, "metadata.json"),
      JSON.stringify(metadata, null, 2) + "\n",
      { mode: 0o600 }
    );

    return Response.json({ uploadId, chunkSize, maxBytes }, { status: 201 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Impossible de préparer l’import."
    }, { status: 400 });
  }
}
