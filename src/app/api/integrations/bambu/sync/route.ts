import { z } from "zod";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { syncBambuAccount } from "@/lib/bambu-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ accountId: z.string().uuid() });

export async function POST(request: Request) {
  try {
    const session = await requireSession();
    const workspace = await ensureWorkspace(session.user);
    const { accountId } = schema.parse(await request.json());

    const result = await pool.query(
      `SELECT id, organization_id, user_id, email, region,
              token_ciphertext, token_iv, token_tag
       FROM bambu_accounts
       WHERE id = $1 AND organization_id = $2 AND user_id = $3
       LIMIT 1`,
      [accountId, workspace.organizationId, session.user.id]
    );

    const account = result.rows[0];
    if (!account) return Response.json({ error: "Compte Bambu introuvable." }, { status: 404 });

    try {
      const deviceCount = await syncBambuAccount(account);
      return Response.json({ ok: true, deviceCount });
    } catch (error) {
      await pool.query(
        `UPDATE bambu_accounts
         SET status = 'error', last_error = $1, updated_at = now()
         WHERE id = $2`,
        [error instanceof Error ? error.message.slice(0, 500) : "Erreur Bambu", accountId]
      );
      throw error;
    }
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Synchronisation impossible."
    }, { status: 400 });
  }
}
