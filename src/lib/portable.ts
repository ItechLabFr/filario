import { createHash } from "node:crypto";
import JSZip from "jszip";
import type { PoolClient } from "pg";
import { pool } from "@/lib/db";

const FORMAT = "filario-backup";
const FORMAT_VERSION = 1;

const tableFiles = [
  ["locations", "data/locations.jsonl"],
  ["spools", "data/spools.jsonl"],
  ["spool_events", "data/spool-events.jsonl"],
  ["drying_events", "data/drying-events.jsonl"],
  ["printers", "data/printers.jsonl"],
  ["printer_slots", "data/printer-slots.jsonl"],
  ["print_jobs", "data/print-jobs.jsonl"],
  ["print_job_filaments", "data/print-job-filaments.jsonl"],
  ["suppliers", "data/suppliers.jsonl"],
  ["purchases", "data/purchases.jsonl"],
  ["audit_logs", "data/audit-logs.jsonl"]
] as const;

type BackupManifest = {
  format: typeof FORMAT;
  formatVersion: number;
  appVersion: string;
  createdAt: string;
  source: {
    type: "cloud" | "self-hosted";
  };
  organization: {
    id: string;
    name: string;
  };
  authentication: {
    included: false;
    note: string;
  };
};

function sha256(content: string | Buffer) {
  return createHash("sha256").update(content).digest("hex");
}

function toJsonl(rows: unknown[]) {
  return rows.map((row) => JSON.stringify(row)).join("\n") + (rows.length ? "\n" : "");
}

function parseJsonl(content: string) {
  return content
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

export async function createPortableBackup(organizationId: string) {
  const client = await pool.connect();
  try {
    const orgResult = await client.query(
      "SELECT id, name FROM organizations WHERE id = $1",
      [organizationId]
    );
    if (!orgResult.rows[0]) throw new Error("Organization not found");

    const manifest: BackupManifest = {
      format: FORMAT,
      formatVersion: FORMAT_VERSION,
      appVersion: process.env.npm_package_version || "0.1.0",
      createdAt: new Date().toISOString(),
      source: {
        type: process.env.FILARIO_CLOUD === "true" ? "cloud" : "self-hosted"
      },
      organization: {
        id: orgResult.rows[0].id,
        name: orgResult.rows[0].name
      },
      authentication: {
        included: false,
        note: "Passwords, TOTP secrets and passkeys are intentionally excluded. Re-enrol authentication factors on the destination instance."
      }
    };

    const zip = new JSZip();
    const files = new Map<string, string>();

    files.set("manifest.json", JSON.stringify(manifest, null, 2) + "\n");
    files.set(
      "data/organization.jsonl",
      toJsonl(orgResult.rows)
    );

    for (const [table, file] of tableFiles) {
      const result = await client.query(
        `SELECT * FROM ${table} WHERE organization_id = $1 ORDER BY created_at ASC`,
        [organizationId]
      );
      files.set(file, toJsonl(result.rows));
    }

    for (const [name, content] of files) {
      zip.file(name, content);
    }

    const checksumLines = [...files.entries()]
      .map(([name, content]) => `${sha256(content)}  ${name}`)
      .join("\n") + "\n";

    zip.file("checksums.sha256", checksumLines);

    const bytes = await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 7 }
    });

    return {
      bytes,
      filename: `filario-${new Date().toISOString().slice(0, 10)}.filario`
    };
  } finally {
    client.release();
  }
}

const allowedColumns: Record<string, string[]> = {
  locations: ["id","organization_id","parent_id","name","description","created_at","updated_at"],
  spools: ["id","organization_id","public_id","manufacturer","product_name","material","color_name","color_hex","diameter_mm","initial_weight_g","remaining_weight_g","spool_weight_g","density_g_cm3","nozzle_min_c","nozzle_max_c","bed_min_c","bed_max_c","drying_temp_c","purchase_price_cents","currency","lot_number","external_source","external_id","location_id","opened_at","purchased_at","notes","status","created_at","updated_at"],
  spool_events: ["id","organization_id","spool_id","user_id","event_type","quantity_g","metadata","created_at"],
  drying_events: ["id","organization_id","spool_id","user_id","temperature_c","duration_minutes","notes","created_at"],
  printers: ["id","organization_id","name","manufacturer","model","integration_type","integration_url","status","created_at","updated_at"],
  printer_slots: ["id","organization_id","printer_id","name","spool_id","created_at"],
  print_jobs: ["id","organization_id","printer_id","name","status","started_at","finished_at","duration_seconds","notes","created_at"],
  print_job_filaments: ["id","organization_id","print_job_id","spool_id","planned_weight_g","actual_weight_g","created_at"],
  suppliers: ["id","organization_id","name","website","created_at"],
  purchases: ["id","organization_id","supplier_id","reference","total_cents","currency","purchased_at","notes","created_at"],
  audit_logs: ["id","organization_id","user_id","action","target_type","target_id","metadata","created_at"]
};

async function insertRows(
  client: PoolClient,
  table: string,
  rows: Record<string, unknown>[],
  organizationId: string,
  options?: { omit?: string[] }
) {
  const columns = allowedColumns[table];
  if (!columns) throw new Error(`Unsupported table: ${table}`);
  const used = columns.filter((column) => !(options?.omit || []).includes(column));

  for (const row of rows) {
    const values = used.map((column) =>
      column === "organization_id" ? organizationId : row[column] ?? null
    );
    const placeholders = used.map((_, index) => `$${index + 1}`).join(", ");
    const names = used.map((column) => `"${column}"`).join(", ");
    await client.query(
      `INSERT INTO "${table}" (${names}) VALUES (${placeholders})`,
      values
    );
  }
}

async function readAndVerify(zip: JSZip) {
  const manifestFile = zip.file("manifest.json");
  const checksumFile = zip.file("checksums.sha256");
  if (!manifestFile || !checksumFile) throw new Error("Archive Filario incomplète.");

  const manifestText = await manifestFile.async("string");
  const manifest = JSON.parse(manifestText) as BackupManifest;
  if (manifest.format !== FORMAT || manifest.formatVersion !== FORMAT_VERSION) {
    throw new Error("Version de sauvegarde Filario non compatible.");
  }

  const checksumText = await checksumFile.async("string");
  for (const line of checksumText.split(/\r?\n/).filter(Boolean)) {
    const match = /^([a-f0-9]{64})  (.+)$/.exec(line);
    if (!match) throw new Error("Fichier de contrôle invalide.");
    const [, expected, name] = match;
    const file = zip.file(name);
    if (!file) throw new Error(`Fichier manquant: ${name}`);
    const content = await file.async("nodebuffer");
    if (sha256(content) !== expected) {
      throw new Error(`Checksum invalide pour ${name}`);
    }
  }

  return manifest;
}

async function rows(zip: JSZip, name: string) {
  const file = zip.file(name);
  if (!file) return [];
  return parseJsonl(await file.async("string"));
}

export async function restorePortableBackup(
  bytes: Buffer,
  organizationId: string,
  userId: string
) {
  if (bytes.length > 100 * 1024 * 1024) {
    throw new Error("Archive trop volumineuse (100 Mo maximum).");
  }

  const zip = await JSZip.loadAsync(bytes);
  const manifest = await readAndVerify(zip);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const importedOrg = (await rows(zip, "data/organization.jsonl"))[0];
    if (importedOrg?.name) {
      await client.query(
        "UPDATE organizations SET name = $1, updated_at = now() WHERE id = $2",
        [String(importedOrg.name), organizationId]
      );
    }

    // Exact replacement of business data inside the current organization.
    for (const table of [
      "print_job_filaments",
      "printer_slots",
      "spool_events",
      "drying_events",
      "print_jobs",
      "purchases",
      "audit_logs",
      "spools",
      "printers",
      "suppliers",
      "locations"
    ]) {
      await client.query(`DELETE FROM "${table}" WHERE organization_id = $1`, [organizationId]);
    }

    const locationRows = await rows(zip, "data/locations.jsonl");
    await insertRows(client, "locations", locationRows, organizationId, { omit: ["parent_id"] });
    for (const row of locationRows) {
      if (row.parent_id) {
        await client.query(
          "UPDATE locations SET parent_id = $1 WHERE id = $2 AND organization_id = $3",
          [row.parent_id, row.id, organizationId]
        );
      }
    }

    await insertRows(client, "spools", await rows(zip, "data/spools.jsonl"), organizationId);
    await insertRows(client, "printers", await rows(zip, "data/printers.jsonl"), organizationId);
    await insertRows(client, "suppliers", await rows(zip, "data/suppliers.jsonl"), organizationId);
    await insertRows(client, "print_jobs", await rows(zip, "data/print-jobs.jsonl"), organizationId);
    await insertRows(client, "printer_slots", await rows(zip, "data/printer-slots.jsonl"), organizationId);
    await insertRows(client, "print_job_filaments", await rows(zip, "data/print-job-filaments.jsonl"), organizationId);
    await insertRows(client, "purchases", await rows(zip, "data/purchases.jsonl"), organizationId);
    await insertRows(client, "spool_events", await rows(zip, "data/spool-events.jsonl"), organizationId);
    await insertRows(client, "drying_events", await rows(zip, "data/drying-events.jsonl"), organizationId);
    await insertRows(client, "audit_logs", await rows(zip, "data/audit-logs.jsonl"), organizationId);

    await client.query(
      `INSERT INTO audit_logs (organization_id, user_id, action, target_type, target_id, metadata)
       VALUES ($1, $2, 'backup.restored', 'organization', $1, $3::jsonb)`,
      [organizationId, userId, JSON.stringify({ sourceOrganizationId: manifest.organization.id, formatVersion: manifest.formatVersion })]
    );

    await client.query("COMMIT");
    return {
      organizationName: manifest.organization.name,
      formatVersion: manifest.formatVersion
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
