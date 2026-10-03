import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://filario:filario@127.0.0.1:5432/filario";

const globalForDb = globalThis as unknown as {
  filarioPool?: pg.Pool;
};

export const pool =
  globalForDb.filarioPool ??
  new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.filarioPool = pool;
}

export const db = drizzle(pool, { schema });
export { schema };
