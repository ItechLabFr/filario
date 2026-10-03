import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import pg from "pg";
import { claimInstanceAdmin, isRegistrationAllowed } from "@/lib/instance-settings";

const { Pool } = pg;

const filarioUrl = process.env.FILARIO_URL ?? "http://localhost:3000";
const hostname = new URL(filarioUrl).hostname;

const globalForAuth = globalThis as unknown as {
  filarioAuthPool?: pg.Pool;
};

const authPool =
  globalForAuth.filarioAuthPool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://filario:filario@127.0.0.1:5432/filario",
    max: 10
  });

if (process.env.NODE_ENV !== "production") {
  globalForAuth.filarioAuthPool = authPool;
}

export const auth = betterAuth({
  appName: "Filario",
  baseURL: filarioUrl,
  secret:
    process.env.AUTH_SECRET ??
    "development-only-secret-please-change-this-value",
  trustedOrigins: [filarioUrl],
  database: authPool,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10
  },
  advanced: {
    database: {
      joins: true
    }
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" || process.env.FILARIO_CLOUD === "true") {
        return;
      }

      if (!(await isRegistrationAllowed())) {
        throw new APIError("BAD_REQUEST", {
          message: "Les inscriptions sont désactivées par l'administrateur de cette instance Filario."
        });
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" || process.env.FILARIO_CLOUD === "true") {
        return;
      }

      const userId = ctx.context.newSession?.user?.id;
      if (userId) {
        await claimInstanceAdmin(userId);
      }
    })
  },
  plugins: [
    twoFactor({
      issuer: "Filario",
      backupCodeOptions: {
        amount: 10,
        length: 10
      }
    }),
    passkey({
      rpID: process.env.PASSKEY_RP_ID || hostname,
      rpName: process.env.PASSKEY_RP_NAME || "Filario"
    })
  ]
});
