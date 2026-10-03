import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import {
  createApiSecret,
  FILARIO_API_SCOPES
} from "@/lib/api-auth";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const rows = await db
    .select({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      scopes: apiKeys.scopes,
      lastUsedAt: apiKeys.lastUsedAt,
      expiresAt: apiKeys.expiresAt,
      revokedAt: apiKeys.revokedAt,
      createdAt: apiKeys.createdAt
    })
    .from(apiKeys)
    .where(eq(apiKeys.organizationId, workspace.organizationId))
    .orderBy(desc(apiKeys.createdAt));

  return Response.json({ keys: rows });
}

export async function POST(request: Request) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const payload = z.object({
    name: z.string().trim().min(1).max(120),
    scopes: z.array(z.enum(FILARIO_API_SCOPES)).min(1),
    expiresAt: z.string().datetime().nullable().optional()
  }).parse(await request.json());

  const generated = createApiSecret();

  const [created] = await db
    .insert(apiKeys)
    .values({
      organizationId: workspace.organizationId,
      createdByUserId: session.user.id,
      name: payload.name,
      prefix: generated.prefix,
      tokenHash: generated.hash,
      scopes: payload.scopes,
      expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null
    })
    .returning({
      id: apiKeys.id,
      name: apiKeys.name,
      prefix: apiKeys.prefix,
      scopes: apiKeys.scopes,
      createdAt: apiKeys.createdAt
    });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "api_key.created",
    targetType: "api_key",
    targetId: created.id,
    metadata: { scopes: payload.scopes }
  });

  return Response.json({
    key: created,
    secret: generated.secret
  }, { status: 201 });
}
