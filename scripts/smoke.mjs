import pg from "pg";

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const requiredTables = [
  "user",
  "session",
  "organizations",
  "memberships",
  "locations",
  "spools",
  "spool_events",
  "drying_events",
  "printers",
  "api_keys",
  "filario_instance_settings",
  "maker_profiles",
  "published_models",
  "bambu_accounts",
  "bambu_devices",
  "filario_migrations"
];

for (const table of requiredTables) {
  const result = await pool.query(
    "select to_regclass($1) as table_name",
    [`public.${table}`]
  );
  if (!result.rows[0]?.table_name) {
    throw new Error(`Missing table: ${table}`);
  }
}


const settings = await pool.query(
  "select id, allow_registration, enforce_registration_policy from filario_instance_settings where id = 1"
);
if (!settings.rows[0]) {
  throw new Error("Missing Filario instance settings singleton");
}

const trigger = await pool.query(
  `select 1
   from pg_trigger
   where tgname = 'filario_user_registration_guard'
     and not tgisinternal`
);
if (!trigger.rowCount) {
  throw new Error("Missing user registration guard trigger");
}

const version = await pool.query(
  "select name from filario_migrations order by applied_at desc limit 1"
);
console.log("Filario database smoke test OK:", version.rows[0]?.name || "no business migration");

await pool.end();


const bambuTelemetryColumns = await pool.query(
  `select column_name
   from information_schema.columns
   where table_schema = 'public'
     and table_name = 'bambu_devices'
     and column_name in ('telemetry', 'telemetry_updated_at')`
);
if (bambuTelemetryColumns.rowCount !== 2) {
  throw new Error("Missing Bambu telemetry columns");
}
