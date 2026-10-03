"use server";

import { randomBytes } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, pool } from "@/lib/db";
import {
  locations,
  memberships,
  printers,
  dryingEvents,
  printJobs,
  printJobFilaments,
  spoolEvents,
  spools
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace, requireOrganizationAccess } from "@/lib/workspace";
import { audit } from "@/lib/audit";
import { isInstanceAdmin, updateRegistrationPolicy } from "@/lib/instance-settings";

const nullableInt = (value: FormDataEntryValue | null) => {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
};

const spoolSchema = z.object({
  manufacturer: z.string().trim().min(1).max(120),
  productName: z.string().trim().min(1).max(160),
  material: z.string().trim().min(1).max(40),
  colorName: z.string().trim().max(80).optional(),
  colorHex: z.string().trim().max(9).optional(),
  initialWeightG: z.number().int().positive().max(100000),
  remainingWeightG: z.number().int().min(0).max(100000),
  diameterMm: z.number().positive().max(10),
  locationId: z.string().uuid().nullable(),
  notes: z.string().max(4000).optional()
});

function publicId() {
  return randomBytes(9).toString("base64url");
}

export async function createSpool(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const parsed = spoolSchema.parse({
    manufacturer: String(formData.get("manufacturer") ?? ""),
    productName: String(formData.get("productName") ?? ""),
    material: String(formData.get("material") ?? ""),
    colorName: String(formData.get("colorName") ?? ""),
    colorHex: String(formData.get("colorHex") ?? ""),
    initialWeightG: nullableInt(formData.get("initialWeightG")) ?? 1000,
    remainingWeightG: nullableInt(formData.get("remainingWeightG")) ?? 1000,
    diameterMm: Number(formData.get("diameterMm") || 1.75),
    locationId: formData.get("locationId") ? String(formData.get("locationId")) : null,
    notes: String(formData.get("notes") ?? "")
  });

  const id = crypto.randomUUID();
  const pubId = publicId();

  await db.transaction(async (tx) => {
    await tx.insert(spools).values({
      id,
      organizationId: workspace.organizationId,
      publicId: pubId,
      manufacturer: parsed.manufacturer,
      productName: parsed.productName,
      material: parsed.material.toUpperCase(),
      colorName: parsed.colorName || null,
      colorHex: parsed.colorHex || null,
      initialWeightG: parsed.initialWeightG,
      remainingWeightG: parsed.remainingWeightG,
      diameterMm: String(parsed.diameterMm),
      spoolWeightG: nullableInt(formData.get("spoolWeightG")),
      densityGCm3: formData.get("densityGCm3")
        ? String(Number(formData.get("densityGCm3")))
        : null,
      externalSource: String(formData.get("externalSource") ?? "").trim() || null,
      externalId: String(formData.get("externalId") ?? "").trim() || null,
      locationId: parsed.locationId,
      nozzleMinC: nullableInt(formData.get("nozzleMinC")),
      nozzleMaxC: nullableInt(formData.get("nozzleMaxC")),
      bedMinC: nullableInt(formData.get("bedMinC")),
      bedMaxC: nullableInt(formData.get("bedMaxC")),
      dryingTempC: nullableInt(formData.get("dryingTempC")),
      purchasePriceCents: formData.get("purchasePrice")
        ? Math.round(Number(formData.get("purchasePrice")) * 100)
        : null,
      purchasedAt: formData.get("purchasedAt")
        ? new Date(String(formData.get("purchasedAt")))
        : null,
      notes: parsed.notes || null
    });

    await tx.insert(spoolEvents).values({
      organizationId: workspace.organizationId,
      spoolId: id,
      userId: session.user.id,
      eventType: "created",
      metadata: { initialWeightG: parsed.initialWeightG }
    });
  });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "spool.created",
    targetType: "spool",
    targetId: id
  });

  revalidatePath("/inventory");
  redirect(`/inventory/${id}`);
}

export async function setSpoolWeight(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const id = z.string().uuid().parse(String(formData.get("id")));
  const remainingWeightG = z.number().int().min(0).max(100000).parse(
    Number(formData.get("remainingWeightG"))
  );

  const current = await db
    .select({ remainingWeightG: spools.remainingWeightG })
    .from(spools)
    .where(and(eq(spools.id, id), eq(spools.organizationId, workspace.organizationId)))
    .limit(1);

  if (!current[0]) throw new Error("Bobine introuvable");

  const delta = remainingWeightG - current[0].remainingWeightG;

  await db.transaction(async (tx) => {
    await tx
      .update(spools)
      .set({
        remainingWeightG,
        status: remainingWeightG === 0 ? "empty" : "active",
        updatedAt: new Date()
      })
      .where(and(eq(spools.id, id), eq(spools.organizationId, workspace.organizationId)));

    await tx.insert(spoolEvents).values({
      organizationId: workspace.organizationId,
      spoolId: id,
      userId: session.user.id,
      eventType: delta <= 0 ? "consumption" : "weight_adjustment",
      quantityG: delta,
      metadata: { previousWeightG: current[0].remainingWeightG, remainingWeightG }
    });
  });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "spool.weight.updated",
    targetType: "spool",
    targetId: id,
    metadata: { remainingWeightG }
  });

  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
}

export async function createLocation(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const name = z.string().trim().min(1).max(120).parse(String(formData.get("name") ?? ""));
  const description = String(formData.get("description") ?? "").trim();

  const [created] = await db.insert(locations).values({
    organizationId: workspace.organizationId,
    name,
    description: description || null
  }).returning({ id: locations.id });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "location.created",
    targetType: "location",
    targetId: created.id
  });

  revalidatePath("/locations");
  revalidatePath("/inventory/new");
}

export async function createPrinter(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const name = z.string().trim().min(1).max(120).parse(String(formData.get("name") ?? ""));
  const manufacturer = String(formData.get("manufacturer") ?? "").trim();
  const model = String(formData.get("model") ?? "").trim();

  const [created] = await db.insert(printers).values({
    organizationId: workspace.organizationId,
    name,
    manufacturer: manufacturer || null,
    model: model || null
  }).returning({ id: printers.id });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "printer.created",
    targetType: "printer",
    targetId: created.id
  });

  revalidatePath("/printers");
}

export async function archiveSpool(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const id = z.string().uuid().parse(String(formData.get("id")));

  await db
    .update(spools)
    .set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(spools.id, id), eq(spools.organizationId, workspace.organizationId)));

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "spool.archived",
    targetType: "spool",
    targetId: id
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}


export async function createPrintJob(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const name = z.string().trim().min(1).max(180).parse(String(formData.get("name") ?? ""));
  const printerId = formData.get("printerId") ? z.string().uuid().parse(String(formData.get("printerId"))) : null;
  const spoolId = formData.get("spoolId") ? z.string().uuid().parse(String(formData.get("spoolId"))) : null;
  const plannedWeightG = nullableInt(formData.get("plannedWeightG"));

  if (printerId) {
    const [printer] = await db
      .select({ id: printers.id })
      .from(printers)
      .where(and(eq(printers.id, printerId), eq(printers.organizationId, workspace.organizationId)))
      .limit(1);
    if (!printer) throw new Error("Imprimante introuvable.");
  }

  if (spoolId) {
    const [spool] = await db
      .select({ id: spools.id })
      .from(spools)
      .where(and(eq(spools.id, spoolId), eq(spools.organizationId, workspace.organizationId)))
      .limit(1);
    if (!spool) throw new Error("Bobine introuvable.");
  }

  const jobId = crypto.randomUUID();

  await db.transaction(async (tx) => {
    await tx.insert(printJobs).values({
      id: jobId,
      organizationId: workspace.organizationId,
      printerId,
      name,
      status: "planned",
      notes: String(formData.get("notes") ?? "").trim() || null
    });

    if (spoolId) {
      await tx.insert(printJobFilaments).values({
        organizationId: workspace.organizationId,
        printJobId: jobId,
        spoolId,
        plannedWeightG
      });
    }
  });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "print_job.created",
    targetType: "print_job",
    targetId: jobId
  });

  revalidatePath("/jobs");
}

export async function startPrintJob(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const id = z.string().uuid().parse(String(formData.get("id")));

  const updated = await db
    .update(printJobs)
    .set({ status: "printing", startedAt: new Date() })
    .where(and(eq(printJobs.id, id), eq(printJobs.organizationId, workspace.organizationId)))
    .returning({ id: printJobs.id });

  if (!updated[0]) throw new Error("Impression introuvable.");

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "print_job.started",
    targetType: "print_job",
    targetId: id
  });

  revalidatePath("/jobs");
}

export async function completePrintJob(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const id = z.string().uuid().parse(String(formData.get("id")));
  const actualWeightG = z.number().int().min(0).max(100000).parse(Number(formData.get("actualWeightG")));

  await db.transaction(async (tx) => {
    const [job] = await tx
      .select({
        id: printJobs.id,
        status: printJobs.status,
        startedAt: printJobs.startedAt
      })
      .from(printJobs)
      .where(and(eq(printJobs.id, id), eq(printJobs.organizationId, workspace.organizationId)))
      .limit(1);

    if (!job) throw new Error("Impression introuvable.");
    if (job.status === "completed") throw new Error("Cette impression est déjà terminée.");

    const [usage] = await tx
      .select({
        id: printJobFilaments.id,
        spoolId: printJobFilaments.spoolId
      })
      .from(printJobFilaments)
      .where(and(
        eq(printJobFilaments.printJobId, id),
        eq(printJobFilaments.organizationId, workspace.organizationId)
      ))
      .limit(1);

    if (usage?.spoolId) {
      const [spool] = await tx
        .select({ remainingWeightG: spools.remainingWeightG })
        .from(spools)
        .where(and(
          eq(spools.id, usage.spoolId),
          eq(spools.organizationId, workspace.organizationId)
        ))
        .for("update")
        .limit(1);

      if (!spool) throw new Error("Bobine associée introuvable.");
      if (actualWeightG > spool.remainingWeightG) {
        throw new Error(`Consommation impossible : la bobine ne contient que ${spool.remainingWeightG} g.`);
      }

      const remaining = spool.remainingWeightG - actualWeightG;
      await tx
        .update(spools)
        .set({
          remainingWeightG: remaining,
          status: remaining === 0 ? "empty" : "active",
          updatedAt: new Date()
        })
        .where(eq(spools.id, usage.spoolId));

      await tx
        .update(printJobFilaments)
        .set({ actualWeightG })
        .where(eq(printJobFilaments.id, usage.id));

      await tx.insert(spoolEvents).values({
        organizationId: workspace.organizationId,
        spoolId: usage.spoolId,
        userId: session.user.id,
        eventType: "print_consumption",
        quantityG: -actualWeightG,
        metadata: { printJobId: id, remainingWeightG: remaining }
      });
    }

    const finishedAt = new Date();
    const durationSeconds = job.startedAt
      ? Math.max(0, Math.round((finishedAt.getTime() - job.startedAt.getTime()) / 1000))
      : null;

    await tx
      .update(printJobs)
      .set({
        status: "completed",
        finishedAt,
        durationSeconds
      })
      .where(eq(printJobs.id, id));
  });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "print_job.completed",
    targetType: "print_job",
    targetId: id,
    metadata: { actualWeightG }
  });

  revalidatePath("/jobs");
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}


export async function logDrying(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  const spoolId = z.string().uuid().parse(String(formData.get("spoolId")));
  const temperatureC = z.number().int().min(20).max(150).parse(Number(formData.get("temperatureC")));
  const durationMinutes = z.number().int().min(1).max(7 * 24 * 60).parse(Number(formData.get("durationMinutes")));
  const notes = String(formData.get("notes") ?? "").trim();

  const [spool] = await db
    .select({ id: spools.id })
    .from(spools)
    .where(and(eq(spools.id, spoolId), eq(spools.organizationId, workspace.organizationId)))
    .limit(1);
  if (!spool) throw new Error("Bobine introuvable.");

  await db.transaction(async (tx) => {
    await tx.insert(dryingEvents).values({
      organizationId: workspace.organizationId,
      spoolId,
      userId: session.user.id,
      temperatureC,
      durationMinutes,
      notes: notes || null
    });

    await tx.insert(spoolEvents).values({
      organizationId: workspace.organizationId,
      spoolId,
      userId: session.user.id,
      eventType: "dried",
      metadata: { temperatureC, durationMinutes, notes: notes || null }
    });
  });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "spool.dried",
    targetType: "spool",
    targetId: spoolId,
    metadata: { temperatureC, durationMinutes }
  });

  revalidatePath(`/inventory/${spoolId}`);
}


export async function switchWorkspace(formData: FormData) {
  const session = await requireSession();
  const organizationId = z.string().uuid().parse(String(formData.get("organizationId")));
  await requireOrganizationAccess(session.user.id, organizationId);

  const cookieStore = await cookies();
  cookieStore.set("filario-org", organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365
  });

  redirect("/dashboard");
}


const memberRoleSchema = z.enum(["owner", "admin", "manager", "member", "viewer"]);

function assertCanManageMembers(role: string) {
  if (!["owner", "admin"].includes(role)) {
    throw new Error("Droits administrateur requis.");
  }
}

export async function addTeamMember(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  assertCanManageMembers(workspace.role);

  const email = z.string().email().parse(String(formData.get("email") ?? "").trim().toLowerCase());
  const role = memberRoleSchema.parse(String(formData.get("role") ?? "member"));

  if (role === "owner" && workspace.role !== "owner") {
    throw new Error("Seul un propriétaire peut nommer un autre propriétaire.");
  }

  const userResult = await pool.query(
    'SELECT id, email FROM "user" WHERE lower(email) = $1 LIMIT 1',
    [email]
  );
  const user = userResult.rows[0];
  if (!user) {
    throw new Error("Cet utilisateur doit d'abord créer un compte Filario.");
  }

  await db.insert(memberships).values({
    organizationId: workspace.organizationId,
    userId: String(user.id),
    role
  }).onConflictDoUpdate({
    target: [memberships.organizationId, memberships.userId],
    set: { role }
  });

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "membership.upserted",
    targetType: "user",
    targetId: String(user.id),
    metadata: { role, email }
  });

  revalidatePath("/team");
}

export async function updateTeamMemberRole(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  assertCanManageMembers(workspace.role);

  const membershipId = z.string().uuid().parse(String(formData.get("membershipId")));
  const role = memberRoleSchema.parse(String(formData.get("role")));

  const [target] = await db
    .select()
    .from(memberships)
    .where(and(
      eq(memberships.id, membershipId),
      eq(memberships.organizationId, workspace.organizationId)
    ))
    .limit(1);

  if (!target) throw new Error("Membre introuvable.");
  if (role === "owner" && workspace.role !== "owner") {
    throw new Error("Seul un propriétaire peut nommer un autre propriétaire.");
  }

  if (target.role === "owner" && role !== "owner") {
    const owners = await pool.query(
      "SELECT count(*)::int AS count FROM memberships WHERE organization_id = $1 AND role = 'owner'",
      [workspace.organizationId]
    );
    if (Number(owners.rows[0]?.count || 0) <= 1) {
      throw new Error("Impossible de rétrograder le dernier propriétaire.");
    }
  }

  await db
    .update(memberships)
    .set({ role })
    .where(eq(memberships.id, membershipId));

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "membership.role.updated",
    targetType: "membership",
    targetId: membershipId,
    metadata: { role }
  });

  revalidatePath("/team");
}

export async function removeTeamMember(formData: FormData) {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);
  assertCanManageMembers(workspace.role);

  const membershipId = z.string().uuid().parse(String(formData.get("membershipId")));

  const [target] = await db
    .select()
    .from(memberships)
    .where(and(
      eq(memberships.id, membershipId),
      eq(memberships.organizationId, workspace.organizationId)
    ))
    .limit(1);

  if (!target) throw new Error("Membre introuvable.");

  if (target.role === "owner") {
    const owners = await pool.query(
      "SELECT count(*)::int AS count FROM memberships WHERE organization_id = $1 AND role = 'owner'",
      [workspace.organizationId]
    );
    if (Number(owners.rows[0]?.count || 0) <= 1) {
      throw new Error("Impossible de retirer le dernier propriétaire.");
    }
  }

  await db.delete(memberships).where(eq(memberships.id, membershipId));

  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: "membership.removed",
    targetType: "membership",
    targetId: membershipId,
    metadata: { removedUserId: target.userId }
  });

  revalidatePath("/team");
}


export async function setInstanceRegistration(formData: FormData) {
  const session = await requireSession();

  if (!(await isInstanceAdmin(session.user.id))) {
    throw new Error("Seul l’administrateur de l’instance peut modifier les inscriptions.");
  }

  const enabled = String(formData.get("enabled")) === "true";
  await updateRegistrationPolicy(enabled);

  const workspace = await ensureWorkspace(session.user);
  await audit({
    organizationId: workspace.organizationId,
    userId: session.user.id,
    action: enabled ? "system.registration.opened" : "system.registration.closed",
    targetType: "system",
    targetId: "registration",
    metadata: { enabled }
  });

  revalidatePath("/settings/system");
  revalidatePath("/login");
  revalidatePath("/register");
}
