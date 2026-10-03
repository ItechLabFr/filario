import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateApiRequest, apiUnauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { spoolEvents, spools } from "@/lib/db/schema";

export const runtime = "nodejs";

const consumeSchema = z.object({
  grams: z.number().int().positive().max(100000),
  reason: z.string().trim().max(160).optional()
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request, "spools:write");
  if (!auth) return apiUnauthorized();

  const { id } = await params;
  const spoolId = z.string().uuid().parse(id);
  const payload = consumeSchema.parse(await request.json());

  const remainingWeightG = await db.transaction(async (tx) => {
    const [spool] = await tx
      .select({ remainingWeightG: spools.remainingWeightG })
      .from(spools)
      .where(and(
        eq(spools.id, spoolId),
        eq(spools.organizationId, auth.organizationId)
      ))
      .for("update")
      .limit(1);

    if (!spool) return null;
    if (payload.grams > spool.remainingWeightG) {
      throw new Error("insufficient_filament");
    }

    const remaining = spool.remainingWeightG - payload.grams;

    await tx
      .update(spools)
      .set({
        remainingWeightG: remaining,
        status: remaining === 0 ? "empty" : "active",
        updatedAt: new Date()
      })
      .where(eq(spools.id, spoolId));

    await tx.insert(spoolEvents).values({
      organizationId: auth.organizationId,
      spoolId,
      eventType: "api_consumption",
      quantityG: -payload.grams,
      metadata: {
        apiKeyId: auth.apiKeyId,
        reason: payload.reason ?? null,
        remainingWeightG: remaining
      }
    });

    return remaining;
  });

  if (remainingWeightG == null) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json({
    data: {
      spoolId,
      consumedG: payload.grams,
      remainingWeightG
    }
  });
}
