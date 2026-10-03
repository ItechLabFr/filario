import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateApiRequest, apiUnauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { printJobFilaments, printJobs, printers, spools } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().trim().min(1).max(180),
  printerId: z.string().uuid().nullable().optional(),
  spoolId: z.string().uuid().nullable().optional(),
  plannedWeightG: z.number().int().min(0).max(100000).nullable().optional(),
  notes: z.string().max(4000).nullable().optional()
});

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "jobs:read");
  if (!auth) return apiUnauthorized();

  const rows = await db
    .select({
      id: printJobs.id,
      name: printJobs.name,
      status: printJobs.status,
      printerId: printJobs.printerId,
      startedAt: printJobs.startedAt,
      finishedAt: printJobs.finishedAt,
      durationSeconds: printJobs.durationSeconds,
      notes: printJobs.notes,
      createdAt: printJobs.createdAt
    })
    .from(printJobs)
    .where(eq(printJobs.organizationId, auth.organizationId))
    .orderBy(desc(printJobs.createdAt));

  return Response.json({ data: rows });
}

export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, "jobs:write");
  if (!auth) return apiUnauthorized();

  const payload = createSchema.parse(await request.json());

  if (payload.printerId) {
    const [printer] = await db.select({ id: printers.id }).from(printers)
      .where(eq(printers.id, payload.printerId)).limit(1);
    if (!printer) return Response.json({ error: "printer_not_found" }, { status: 400 });
  }

  if (payload.spoolId) {
    const [spool] = await db.select({ id: spools.id }).from(spools)
      .where(eq(spools.id, payload.spoolId)).limit(1);
    if (!spool) return Response.json({ error: "spool_not_found" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(printJobs).values({
      id,
      organizationId: auth.organizationId,
      printerId: payload.printerId ?? null,
      name: payload.name,
      notes: payload.notes ?? null
    });

    if (payload.spoolId) {
      await tx.insert(printJobFilaments).values({
        organizationId: auth.organizationId,
        printJobId: id,
        spoolId: payload.spoolId,
        plannedWeightG: payload.plannedWeightG ?? null
      });
    }
  });

  return Response.json({ data: { id } }, { status: 201 });
}
