import { createPortableBackup } from "@/lib/portable";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const backup = await createPortableBackup(workspace.organizationId);

  return new Response(backup.bytes, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${backup.filename}"`,
      "Cache-Control": "no-store"
    }
  });
}
