import { pool } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/secret-crypto";
import { bambuModelLabel, getBambuDevices } from "@/lib/bambu-cloud";

type AccountRow = {
  id: string;
  organization_id: string;
  user_id: string;
  email: string;
  region: "global" | "china";
  token_ciphertext: string;
  token_iv: string;
  token_tag: string;
};

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (!value || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/(access.?code|password|passwd|secret|token|auth.?key)/i.test(key)) continue;
    out[key] = scrub(child);
  }
  return out;
}

export async function syncBambuAccount(account: AccountRow) {
  const token = decryptSecret({
    ciphertext: account.token_ciphertext,
    iv: account.token_iv,
    tag: account.token_tag
  });

  const devices = await getBambuDevices(token, account.region);

  for (const device of devices) {
    const label = bambuModelLabel(device.productName, device.modelName);
    const status = device.online ? "idle" : "offline";
    const deviceState = await pool.query<{ ignored: boolean; printer_id: string | null }>(
      `SELECT ignored, printer_id
       FROM bambu_devices
       WHERE account_id = $1 AND dev_id = $2
       LIMIT 1`,
      [account.id, device.devId]
    );
    const ignored = Boolean(deviceState.rows[0]?.ignored);
    const encryptedAccessCode = device.accessCode ? encryptSecret(device.accessCode) : null;

    const existing = ignored
      ? { rows: [] as { id: string }[] }
      : await pool.query<{ id: string }>(
      `SELECT id
       FROM printers
       WHERE organization_id = $1
         AND integration_type = 'bambu-cloud'
         AND external_id = $2
       LIMIT 1`,
      [account.organization_id, device.devId]
    );

    let printerId = ignored ? null : (existing.rows[0]?.id ?? null);

    if (!ignored && !printerId) {
      const created = await pool.query<{ id: string }>(
        `INSERT INTO printers (
           organization_id, name, manufacturer, model, integration_type,
           external_id, integration_metadata, status, updated_at
         ) VALUES ($1,$2,'Bambu Lab',$3,'bambu-cloud',$4,$5::jsonb,$6,now())
         RETURNING id`,
        [
          account.organization_id,
          device.name || label,
          label,
          device.devId,
          JSON.stringify({ source: "bambu-cloud", accountId: account.id }),
          status
        ]
      );
      printerId = created.rows[0]?.id ?? null;
    } else if (!ignored) {
      await pool.query(
        `UPDATE printers
         SET name = $1,
             manufacturer = 'Bambu Lab',
             model = $2,
             status = $3,
             integration_metadata = $4::jsonb,
             updated_at = now()
         WHERE id = $5 AND organization_id = $6`,
        [
          device.name || label,
          label,
          status,
          JSON.stringify({ source: "bambu-cloud", accountId: account.id }),
          printerId,
          account.organization_id
        ]
      );
    }

    await pool.query(
      `INSERT INTO bambu_devices (
         account_id, organization_id, printer_id, dev_id, name,
         product_name, model_name, online, raw_data, last_seen_at,
         access_code_ciphertext, access_code_iv, access_code_tag, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,now())
       ON CONFLICT (account_id, dev_id) DO UPDATE SET
         printer_id = CASE WHEN bambu_devices.ignored THEN NULL ELSE EXCLUDED.printer_id END,
         name = EXCLUDED.name,
         product_name = EXCLUDED.product_name,
         model_name = EXCLUDED.model_name,
         online = EXCLUDED.online,
         raw_data = EXCLUDED.raw_data,
         last_seen_at = EXCLUDED.last_seen_at,
         access_code_ciphertext = COALESCE(EXCLUDED.access_code_ciphertext, bambu_devices.access_code_ciphertext),
         access_code_iv = COALESCE(EXCLUDED.access_code_iv, bambu_devices.access_code_iv),
         access_code_tag = COALESCE(EXCLUDED.access_code_tag, bambu_devices.access_code_tag),
         updated_at = now()`,
      [
        account.id,
        account.organization_id,
        printerId,
        device.devId,
        device.name || label,
        device.productName,
        device.modelName,
        device.online,
        JSON.stringify(scrub(device.raw)),
        device.online ? new Date() : null,
        encryptedAccessCode?.ciphertext ?? null,
        encryptedAccessCode?.iv ?? null,
        encryptedAccessCode?.tag ?? null
      ]
    );
  }

  await pool.query(
    `UPDATE bambu_accounts
     SET status = 'connected', last_error = NULL, updated_at = now()
     WHERE id = $1`,
    [account.id]
  );

  return devices.length;
}
