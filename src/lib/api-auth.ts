import { createHash, randomBytes } from "node:crypto";
import { and, eq, isNull, or, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";

export const FILARIO_API_SCOPES = [
  "spools:read",
  "spools:write",
  "printers:read",
  "jobs:read",
  "jobs:write"
] as const;

export type FilarioApiScope = (typeof FILARIO_API_SCOPES)[number];

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createApiSecret() {
  const secret = `fil_live_${randomBytes(32).toString("base64url")}`;
  return {
    secret,
    prefix: secret.slice(0, 16),
    hash: hashToken(secret)
  };
}

export async function authenticateApiRequest(
  request: Request,
  requiredScope: FilarioApiScope
) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token.startsWith("fil_live_")) return null;

  const now = new Date();
  const [key] = await db
    .select()
    .from(apiKeys)
    .where(and(
      eq(apiKeys.tokenHash, hashToken(token)),
      isNull(apiKeys.revokedAt),
      or(isNull(apiKeys.expiresAt), gt(apiKeys.expiresAt, now))
    ))
    .limit(1);

  if (!key) return null;
  if (!key.scopes.includes(requiredScope)) return null;

  await db
    .update(apiKeys)
    .set({ lastUsedAt: now })
    .where(eq(apiKeys.id, key.id));

  return {
    organizationId: key.organizationId,
    apiKeyId: key.id,
    scopes: key.scopes
  };
}

export function apiUnauthorized() {
  return Response.json(
    { error: "unauthorized", message: "Clé API absente, invalide ou scope insuffisant." },
    { status: 401 }
  );
}
