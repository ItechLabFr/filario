import { z } from "zod";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ accountId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspace = await ensureWorkspace(session.user);
    const { accountId } = schema.parse(await request.json());

    await pool.query(
      `DELETE FROM bambu_accounts
       WHERE id = $1 AND organization_id = $2 AND user_id = $3`,
      [accountId, workspace.organizationId, session.user.id]
    );

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Déconnexion impossible."
    }, { status: 400 });
  }
}
