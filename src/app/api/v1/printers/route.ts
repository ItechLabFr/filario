import { asc, eq } from "drizzle-orm";
import { authenticateApiRequest, apiUnauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { printers } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateApiRequest(request, "printers:read");
  if (!auth) return apiUnauthorized();

  const rows = await db
    .select()
    .from(printers)
    .where(eq(printers.organizationId, auth.organizationId))
    .orderBy(asc(printers.name));

  return Response.json({ data: rows });
}
