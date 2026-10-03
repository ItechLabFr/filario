import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { memberships, organizations } from "@/lib/db/schema";

export type Workspace = {
  organizationId: string;
  organizationName: string;
  role: string;
};

export type WorkspaceChoice = Workspace;

function slugPart(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 36);
}

export async function getUserWorkspaces(userId: string): Promise<WorkspaceChoice[]> {
  return db
    .select({
      organizationId: organizations.id,
      organizationName: organizations.name,
      role: memberships.role
    })
    .from(memberships)
    .innerJoin(organizations, eq(memberships.organizationId, organizations.id))
    .where(eq(memberships.userId, userId))
    .orderBy(organizations.name);
}

export async function ensureWorkspace(user: { id: string; name: string; email: string }): Promise<Workspace> {
  let choices = await getUserWorkspaces(user.id);

  if (choices.length === 0) {
    const organizationId = crypto.randomUUID();
    const baseName = user.name?.trim() || user.email.split("@")[0] || "Mon atelier";
    const organizationName = baseName === "Mon atelier" ? baseName : `Atelier de ${baseName}`;
    const slug = `${slugPart(baseName) || "atelier"}-${organizationId.slice(0, 8)}`;

    await db.transaction(async (tx) => {
      await tx.insert(organizations).values({
        id: organizationId,
        name: organizationName,
        slug
      });

      await tx.insert(memberships).values({
        organizationId,
        userId: user.id,
        role: "owner"
      });
    });

    choices = [{
      organizationId,
      organizationName,
      role: "owner"
    }];
  }

  const cookieStore = await cookies();
  const activeId = cookieStore.get("filario-org")?.value;
  const selected = choices.find((workspace) => workspace.organizationId === activeId) || choices[0];

  if (activeId !== selected.organizationId) {
    cookieStore.set("filario-org", selected.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365
    });
  }

  return selected;
}

export async function requireOrganizationAccess(userId: string, organizationId: string) {
  const choices = await getUserWorkspaces(userId);
  const membership = choices.find((workspace) => workspace.organizationId === organizationId);

  if (!membership) {
    throw new Error("Access denied");
  }

  return membership;
}
