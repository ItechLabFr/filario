import { z } from "zod";
import { pool } from "@/lib/db";
import { isPrivateIpv4 } from "@/lib/bambu-camera";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { syncBambuAccount } from "@/lib/bambu-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  enabled: z.boolean(),
  host: z.string().trim().max(64).optional().default("")
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const { id } = await params;
  const input = schema.parse(await request.json());

  if (input.enabled && !isPrivateIpv4(input.host)) {
    return Response.json({
      error: "Utilisez l’adresse IPv4 privée de l’imprimante (ex. 192.168.1.42)."
    }, { status: 400 });
  }

  const deviceResult = await pool.query<{
    id: string;
    account_id: string;
    access_code_ciphertext: string | null;
  }>(
    `SELECT d.id, d.account_id, d.access_code_ciphertext
     FROM bambu_devices d
     JOIN printers p ON p.id = d.printer_id
     WHERE p.id = $1
       AND p.organization_id = $2
       AND p.integration_type = 'bambu-cloud'
       AND d.ignored = false
     ORDER BY d.updated_at DESC
     LIMIT 1`,
    [id, workspace.organizationId]
  );

  let device = deviceResult.rows[0];
  if (!device) {
    return Response.json({ error: "Cette imprimante Bambu n’est plus liée au compte cloud." }, { status: 404 });
  }

  if (input.enabled && !device.access_code_ciphertext) {
    const accountResult = await pool.query(
      `SELECT id, organization_id, user_id, email, region,
              token_ciphertext, token_iv, token_tag
       FROM bambu_accounts
       WHERE id = $1 AND organization_id = $2
       LIMIT 1`,
      [device.account_id, workspace.organizationId]
    );

    const account = accountResult.rows[0];
    if (account) {
      await syncBambuAccount(account);
      const refreshed = await pool.query<{
        id: string;
        account_id: string;
        access_code_ciphertext: string | null;
      }>(
        `SELECT id, account_id, access_code_ciphertext
         FROM bambu_devices
         WHERE printer_id = $1
         ORDER BY updated_at DESC
         LIMIT 1`,
        [id]
      );
      device = refreshed.rows[0] || device;
    }
  }

  if (input.enabled && !device.access_code_ciphertext) {
    return Response.json({
      error: "Le code d’accès caméra n’a pas été récupéré. Synchronisez Bambu Cloud puis réessayez."
    }, { status: 409 });
  }

  await pool.query(
    `UPDATE bambu_devices
     SET camera_enabled = $1,
         camera_host = CASE WHEN $1 THEN $2 ELSE camera_host END,
         camera_last_error = NULL,
         updated_at = now()
     WHERE id = $3`,
    [input.enabled, input.host || null, device.id]
  );

  return Response.json({
    ok: true,
    enabled: input.enabled,
    host: input.enabled ? input.host : null
  });
}
