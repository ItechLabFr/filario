import { NextResponse } from "next/server";
import { restorePortableBackup } from "@/lib/portable";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspace = await ensureWorkspace(session.user);
    const form = await request.formData();
    const file = form.get("backup");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }
    if (!file.name.endsWith(".filario") && !file.name.endsWith(".zip")) {
      return NextResponse.json({ error: "Utilisez une archive .filario." }, { status: 400 });
    }

    const result = await restorePortableBackup(
      Buffer.from(await file.arrayBuffer()),
      workspace.organizationId,
      session.user.id
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Import impossible.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
