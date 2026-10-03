import { createPortableBackup } from "@/lib/portable";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const backup = await createPortableBackup(workspace.organizationId);

  const body = backup.bytes.buffer.slice(
    backup.bytes.byteOffset,
    backup.bytes.byteOffset + backup.bytes.byteLength
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${backup.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
