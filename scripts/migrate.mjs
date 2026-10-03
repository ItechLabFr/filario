import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import pg from "pg";
import { betterAuth } from "better-auth";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { getMigrations } from "better-auth/db/migration";

const { Pool } = pg;

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const publicUrl = process.env.FILARIO_URL || "http://localhost:3000";
const parsedUrl = new URL(publicUrl);
const rpID = process.env.PASSKEY_RP_ID || parsedUrl.hostname;

const pool = new Pool({ connectionString: databaseUrl });

const auth = betterAuth({
  appName: "Filario",
  baseURL: publicUrl,
  secret: process.env.AUTH_SECRET || "development-only-secret-change-me",
  database: pool,
  emailAndPassword: { enabled: true },
  plugins: [
    twoFactor({ issuer: "Filario" }),
    passkey({
      rpID,
      rpName: process.env.PASSKEY_RP_NAME || "Filario",
      origin: publicUrl
    })
  ]
});

console.log("Migrating Better Auth schema...");
const authMigrations = await getMigrations(auth.options);
await authMigrations.runMigrations();

await pool.query(`
  CREATE TABLE IF NOT EXISTS filario_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const migrationsDir = path.join(process.cwd(), "scripts", "sql");
const files = (await readdir(migrationsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();

for (const file of files) {
  const existing = await pool.query(
    "SELECT 1 FROM filario_migrations WHERE name = $1",
    [file]
  );
  if (existing.rowCount) continue;

  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO filario_migrations(name) VALUES ($1)",
      [file]
    );
    await client.query("COMMIT");
    console.log(`Applied ${file}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

await pool.end();
console.log("Database is up to date.");
