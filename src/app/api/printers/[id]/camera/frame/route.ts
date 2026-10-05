import { pool } from "@/lib/db";
import {
  cameraTransport,
  captureJpegTunnelFrame,
  captureRtspFrame,
  isPrivateIpv4
} from "@/lib/bambu-camera";
import { decryptSecret } from "@/lib/secret-crypto";
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

  const result = await pool.query<{
    device_id: string;
    dev_id: string;
    model: string | null;
    camera_host: string | null;
    camera_enabled: boolean;
    camera_cert_fingerprint: string | null;
    access_code_ciphertext: string | null;
    access_code_iv: string | null;
    access_code_tag: string | null;
  }>(
    `SELECT
       d.id AS device_id,
       d.dev_id,
       p.model,
       d.camera_host,
       d.camera_enabled,
       d.camera_cert_fingerprint,
       d.access_code_ciphertext,
       d.access_code_iv,
       d.access_code_tag
     FROM printers p
     JOIN bambu_devices d ON d.printer_id = p.id
     WHERE p.id = $1
       AND p.organization_id = $2
       AND p.integration_type = 'bambu-cloud'
       AND d.ignored = false
     ORDER BY d.updated_at DESC
     LIMIT 1`,
    [id, workspace.organizationId]
  );

  const row = result.rows[0];
  if (!row || !row.camera_enabled || !row.camera_host) {
    return Response.json({ error: "Caméra non configurée." }, { status: 404 });
  }

  if (!isPrivateIpv4(row.camera_host)) {
    return Response.json({ error: "Adresse caméra refusée." }, { status: 400 });
  }

  if (!row.access_code_ciphertext || !row.access_code_iv || !row.access_code_tag) {
    return Response.json({ error: "Code d’accès Bambu indisponible." }, { status: 409 });
  }

  const transport = cameraTransport(row.model);
  if (!transport) {
    return Response.json({
      error: "Ce modèle Bambu n’a pas encore de transport caméra pris en charge."
    }, { status: 422 });
  }

  const accessCode = decryptSecret({
    ciphertext: row.access_code_ciphertext,
    iv: row.access_code_iv,
    tag: row.access_code_tag
  });

  try {
    const frame = transport === "jpeg-tunnel"
      ? await captureJpegTunnelFrame({
          host: row.camera_host,
          serial: row.dev_id,
          accessCode,
          expectedFingerprint: row.camera_cert_fingerprint
        })
      : await captureRtspFrame({
          host: row.camera_host,
          serial: row.dev_id,
          accessCode,
          expectedFingerprint: row.camera_cert_fingerprint
        });

    if (!row.camera_cert_fingerprint && frame.fingerprint) {
      await pool.query(
        `UPDATE bambu_devices
         SET camera_cert_fingerprint = $1,
             camera_last_error = NULL,
             updated_at = now()
         WHERE id = $2`,
        [frame.fingerprint, row.device_id]
      ).catch(() => undefined);
    } else {
      await pool.query(
        `UPDATE bambu_devices
         SET camera_last_error = NULL
         WHERE id = $1`,
        [row.device_id]
      ).catch(() => undefined);
    }

    return new Response(new Uint8Array(frame.jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Caméra Bambu indisponible.";
    await pool.query(
      `UPDATE bambu_devices
       SET camera_last_error = $1, updated_at = now()
       WHERE id = $2`,
      [message.slice(0, 500), row.device_id]
    ).catch(() => undefined);

    return Response.json({ error: message }, { status: 502 });
  }
}
