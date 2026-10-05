import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const { id } = await params;

  const result = await pool.query<{
    id: string;
    integration_type: string | null;
    name: string;
  }>(
    `SELECT id, integration_type, name
     FROM printers
     WHERE id = $1 AND organization_id = $2
     LIMIT 1`,
    [id, workspace.organizationId]
  );

  const printer = result.rows[0];
  if (!printer) {
    return Response.json({ error: "Imprimante introuvable." }, { status: 404 });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (printer.integration_type === "bambu-cloud") {
      await client.query(
        `UPDATE bambu_devices
         SET ignored = true,
             printer_id = NULL,
             camera_enabled = false,
             updated_at = now()
         WHERE printer_id = $1
           AND organization_id = $2`,
        [id, workspace.organizationId]
      );
    }

    await client.query(
      `DELETE FROM printers
       WHERE id = $1 AND organization_id = $2`,
      [id, workspace.organizationId]
    );

    await client.query(
      `INSERT INTO audit_logs (
         organization_id, user_id, action, target_type, target_id, metadata
       ) VALUES ($1,$2,'printer.deleted','printer',$3,$4::jsonb)`,
      [
        workspace.organizationId,
        session.user.id,
        id,
        JSON.stringify({
          name: printer.name,
          integrationType: printer.integration_type,
          hiddenFromBambuSync: printer.integration_type === "bambu-cloud"
        })
      ]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return Response.json({ ok: true });
}
