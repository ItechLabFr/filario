import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { authenticateApiRequest, apiUnauthorized } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { spools } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateApiRequest(request, "spools:read");
  if (!auth) return apiUnauthorized();

  const { id } = await params;
  const spoolId = z.string().uuid().parse(id);

  const [row] = await db
    .select()
    .from(spools)
    .where(and(
      eq(spools.id, spoolId),
      eq(spools.organizationId, auth.organizationId)
    ))
    .limit(1);

  if (!row) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ data: row });
}
