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
  "printers",
  "api_keys",
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

const version = await pool.query(
  "select name from filario_migrations order by applied_at desc limit 1"
);
console.log("Filario database smoke test OK:", version.rows[0]?.name || "no business migration");

await pool.end();
