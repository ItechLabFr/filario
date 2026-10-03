import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { spools } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export default async function ScanPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const [spool] = await db
    .select({ id: spools.id })
    .from(spools)
    .where(and(eq(spools.publicId, publicId), eq(spools.organizationId, workspace.organizationId)))
    .limit(1);

  if (!spool) notFound();
  redirect(`/inventory/${spool.id}`);
}
