import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const modelDir = process.env.FILARIO_MODEL_DIR || "/var/lib/filario/models";
const maxChunkBytes = 600 * 1024;

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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return Response.json({ error: "Import invalide." }, { status: 400 });
    }

    const uploadDir = path.join(modelDir, ".uploads", id);
    const metadataPath = path.join(uploadDir, "metadata.json");
    const metadata = JSON.parse(await readFile(metadataPath, "utf8")) as UploadMetadata;

    if (metadata.userId !== session.user.id) {
      return Response.json({ error: "Import introuvable." }, { status: 404 });
    }

    const url = new URL(request.url);
    const index = Number(url.searchParams.get("index"));
    if (!Number.isInteger(index) || index !== metadata.nextIndex) {
      return Response.json({
        error: "Ordre des blocs invalide.",
        expectedIndex: metadata.nextIndex
      }, { status: 409 });
    }

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.byteLength <= 0 || bytes.byteLength > maxChunkBytes) {
      return Response.json({ error: "Bloc d’import invalide." }, { status: 413 });
    }

    if (metadata.bytesReceived + bytes.byteLength > metadata.fileSize) {
      return Response.json({ error: "Le fichier reçu dépasse la taille annoncée." }, { status: 400 });
    }

    const partPath = path.join(uploadDir, "payload.3mf.part");
    await writeFile(partPath, bytes, {
      flag: metadata.nextIndex === 0 ? "w" : "a",
      mode: 0o600
    });

    metadata.bytesReceived += bytes.byteLength;
    metadata.nextIndex += 1;

    await writeFile(
      metadataPath,
      JSON.stringify(metadata, null, 2) + "\n",
      { mode: 0o600 }
    );

    return Response.json({
      ok: true,
      bytesReceived: metadata.bytesReceived,
      fileSize: metadata.fileSize,
      nextIndex: metadata.nextIndex
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Bloc impossible à enregistrer."
    }, { status: 400 });
  }
}
