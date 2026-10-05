import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const { id } = await params;

  const result = await pool.query(
    `SELECT
       p.id,
       p.integration_type,
       p.status,
       d.online,
       d.telemetry,
       d.telemetry_updated_at
     FROM printers p
     LEFT JOIN bambu_devices d ON d.printer_id = p.id
     WHERE p.id = $1
       AND p.organization_id = $2
     ORDER BY d.updated_at DESC NULLS LAST
     LIMIT 1`,
    [id, workspace.organizationId]
  );

  const row = result.rows[0];
  if (!row) return Response.json({ error: "Imprimante introuvable." }, { status: 404 });

  return Response.json({
    printerId: row.id,
    integrationType: row.integration_type,
    status: row.status,
    online: Boolean(row.online),
    telemetry: row.telemetry || {},
    telemetryUpdatedAt: row.telemetry_updated_at
  }, {
    headers: {
      "Cache-Control": "private, no-store"
    }
  });
}
