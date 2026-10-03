import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";

export type Workspace = {
  organizationId: string;
  organizationName: string;
  role: string;
};

function slugPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

export async function ensureWorkspace(user: { id: string; name: string; email: string }): Promise<Workspace> {
  const current = await db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, user.id))
    .limit(1);

  if (current[0]) return current[0];

  const organizationId = crypto.randomUUID();
  const baseName = user.name?.trim() || user.email.split("@")[0] || "Mon atelier";
  const slug = `${slugPart(baseName) || "atelier"}-${organizationId.slice(0, 8)}`;

  await db.transaction(async (tx) => {
    await tx.insert(organizations).values({
      id: organizationId,
      name: baseName === "Mon atelier" ? baseName : `Atelier de ${baseName}`,
      slug
    });

    await tx.insert(memberships).values({
      organizationId,
      userId: user.id,
      role: "owner"
    });
  });

  return {
    organizationId,
    organizationName: baseName === "Mon atelier" ? baseName : `Atelier de ${baseName}`,
    role: "owner"
  };
}

export async function requireOrganizationAccess(userId: string, organizationId: string) {
  const membership = await db
    .select()
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)))
    .limit(1);

  if (!membership[0]) {
    throw new Error("Access denied");
  }

  return membership[0];
}
