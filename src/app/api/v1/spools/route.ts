import { randomBytes } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateApiRequest, apiUnauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { spoolEvents, spools } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  manufacturer: z.string().trim().min(1).max(120),
  productName: z.string().trim().min(1).max(160),
  material: z.string().trim().min(1).max(40),
  colorName: z.string().trim().max(80).nullable().optional(),
  colorHex: z.string().trim().max(9).nullable().optional(),
  diameterMm: z.number().positive().max(10).default(1.75),
  initialWeightG: z.number().int().positive().max(100000).default(1000),
  remainingWeightG: z.number().int().min(0).max(100000).default(1000),
  nozzleMinC: z.number().int().nullable().optional(),
  nozzleMaxC: z.number().int().nullable().optional(),
  bedMinC: z.number().int().nullable().optional(),
  bedMaxC: z.number().int().nullable().optional(),
  dryingTempC: z.number().int().nullable().optional(),
  notes: z.string().max(4000).nullable().optional()
});

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "spools:read");
  if (!auth) return apiUnauthorized();

  const rows = await db
    .select()
    .from(spools)
    .where(eq(spools.organizationId, auth.organizationId))
    .orderBy(desc(spools.updatedAt));

  return Response.json({ data: rows });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, "spools:write");
  if (!auth) return apiUnauthorized();

  const payload = createSchema.parse(await request.json());
  const id = crypto.randomUUID();
  const publicId = randomBytes(9).toString("base64url");

  await db.transaction(async (tx) => {
    await tx.insert(spools).values({
      id,
      organizationId: auth.organizationId,
      publicId,
      manufacturer: payload.manufacturer,
      productName: payload.productName,
      material: payload.material.toUpperCase(),
      colorName: payload.colorName ?? null,
      colorHex: payload.colorHex ?? null,
      diameterMm: String(payload.diameterMm),
      initialWeightG: payload.initialWeightG,
      remainingWeightG: payload.remainingWeightG,
      nozzleMinC: payload.nozzleMinC ?? null,
      nozzleMaxC: payload.nozzleMaxC ?? null,
      bedMinC: payload.bedMinC ?? null,
      bedMaxC: payload.bedMaxC ?? null,
      dryingTempC: payload.dryingTempC ?? null,
      notes: payload.notes ?? null
    });

    await tx.insert(spoolEvents).values({
      organizationId: auth.organizationId,
      spoolId: id,
      eventType: "api_created",
      metadata: { apiKeyId: auth.apiKeyId }
    });
  });

  const [created] = await db
    .select()
    .from(spools)
    .where(eq(spools.id, id))
    .limit(1);

  return Response.json({ data: created }, { status: 201 });
}
