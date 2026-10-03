import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";

export async function audit(input: {
  organizationId?: string | null;
  userId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditLogs).values({
    organizationId: input.organizationId ?? null,
    userId: input.userId ?? null,
    action: input.action,
    targetType: input.targetType ?? null,
    targetId: input.targetId ?? null,
    metadata: input.metadata ?? {}
  });
}
