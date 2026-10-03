import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const { id } = await params;
  const keyId = z.string().uuid().parse(id);

  const [revoked] = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(apiKeys.id, keyId),
      eq(apiKeys.organizationId, workspace.organizationId)
    ))
    .returning({ id: apiKeys.id });

  if (!revoked) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "api_key.revoked",
    targetType: "api_key",
    targetId: keyId
  });

  return new Response(null, { status: 204 });
}
