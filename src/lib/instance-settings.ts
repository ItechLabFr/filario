import { pool } from "@/lib/db";

export type InstanceSettings = {
  adminUserId: string | null;
  allowRegistration: boolean;
  registrationAllowed: boolean;
  userCount: number;
  bootstrap: boolean;
};

type SettingsRow = {
  admin_user_id: string | null;
  allow_registration: boolean;
};

async function ensureSettingsRow() {
  await pool.query(
    `INSERT INTO filario_instance_settings (id, allow_registration)
     VALUES (1, false)
     ON CONFLICT (id) DO NOTHING`
  );

  await pool.query(
    `UPDATE filario_instance_settings
     SET
       admin_user_id = (
         SELECT id
         FROM "user"
         ORDER BY "createdAt" ASC
         LIMIT 1
       ),
       updated_at = now()
     WHERE id = 1
       AND admin_user_id IS NULL
       AND EXISTS (SELECT 1 FROM "user")`
  );
}

export async function getInstanceSettings(): Promise<InstanceSettings> {
  await ensureSettingsRow();

  const [settingsResult, countResult] = await Promise.all([
    pool.query<SettingsRow>(
      `SELECT admin_user_id, allow_registration
       FROM filario_instance_settings
       WHERE id = 1`
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM "user"`)
  ]);

  const row = settingsResult.rows[0] ?? {
    admin_user_id: null,
    allow_registration: false
  };
  const userCount = Number(countResult.rows[0]?.count ?? "0");
  const bootstrap = userCount === 0;

  return {
    adminUserId: row.admin_user_id,
    allowRegistration: row.allow_registration,
    registrationAllowed:
      process.env.FILARIO_CLOUD === "true" || bootstrap || row.allow_registration,
    userCount,
    bootstrap
  };
}

export async function isRegistrationAllowed() {
  if (process.env.FILARIO_CLOUD === "true") return true;
  return (await getInstanceSettings()).registrationAllowed;
}

export async function claimInstanceAdmin(userId: string) {
  if (process.env.FILARIO_CLOUD === "true") return;

  await ensureSettingsRow();
  await pool.query(
    `UPDATE filario_instance_settings
     SET admin_user_id = $1, updated_at = now()
     WHERE id = 1 AND admin_user_id IS NULL`,
    [userId]
  );
}

export async function isInstanceAdmin(userId: string) {
  if (process.env.FILARIO_CLOUD === "true") return false;
  const settings = await getInstanceSettings();
  return settings.adminUserId === userId;
}

export async function updateRegistrationPolicy(enabled: boolean) {
  await ensureSettingsRow();
  await pool.query(
    `UPDATE filario_instance_settings
     SET allow_registration = $1, updated_at = now()
     WHERE id = 1`,
    [enabled]
  );
}
