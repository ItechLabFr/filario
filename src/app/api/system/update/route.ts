import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { verifyUpdatePackage } from "@/lib/update-package";
import { audit } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const updateDir = process.env.FILARIO_UPDATE_DIR || "/var/lib/filario/updates";

async function requireSystemAdmin() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  if (!["owner", "admin"].includes(workspace.role)) {
    throw new Error("Droits administrateur requis.");
  }
  if (process.env.FILARIO_CLOUD === "true") {
    throw new Error("Les mises à jour ZIP sont désactivées sur Filario Cloud.");
  }

  return { session, workspace };
}

export async function GET() {
  try {
    await requireSystemAdmin();

    let status = null;
    try {
      status = JSON.parse(await readFile(path.join(updateDir, "status.json"), "utf8"));
    } catch {
      status = { state: "idle", version: null, message: "Aucune mise à jour en cours." };
    }

    return Response.json({
      enabled: Boolean(process.env.FILARIO_UPDATE_PUBLIC_KEY_B64),
      status,
      currentVersion: process.env.npm_package_version || "0.1.0"
    });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Accès refusé."
    }, { status: 403 });
  }
}

export async function POST(request: Request) {
  try {
    const { session, workspace } = await requireSystemAdmin();
    const form = await request.formData();
    const file = form.get("update");

    if (!(file instanceof File)) {
      return Response.json({ error: "Paquet ZIP manquant." }, { status: 400 });
    }
    if (!file.name.endsWith(".zip")) {
      return Response.json({ error: "Le paquet doit être un fichier ZIP." }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const manifest = await verifyUpdatePackage(bytes);

    await mkdir(path.join(updateDir, "packages"), { recursive: true });

    const safeVersion = manifest.version.replace(/[^0-9A-Za-z.+-]/g, "_");
    const packagePath = path.join(updateDir, "packages", `filario-${safeVersion}.zip`);
    const tempPath = `${packagePath}.tmp`;
    await writeFile(tempPath, bytes, { mode: 0o600 });
    await rename(tempPath, packagePath);

    const pending = {
      version: manifest.version,
      image: manifest.image,
      packagePath,
      requestedAt: new Date().toISOString(),
      requestedBy: session.user.id
    };

    const pendingTemp = path.join(updateDir, "pending.json.tmp");
    await writeFile(pendingTemp, JSON.stringify(pending, null, 2) + "\n", { mode: 0o600 });
    await rename(pendingTemp, path.join(updateDir, "pending.json"));

    await audit({
      organizationId: workspace.organizationId,
      userId: session.user.id,
      action: "system.update.staged",
      targetType: "system",
      targetId: manifest.version,
      metadata: { image: manifest.image }
    });

    return Response.json({
      ok: true,
      manifest
    }, { status: 202 });
  } catch (error) {
    return Response.json({
      error: error instanceof Error ? error.message : "Paquet invalide."
    }, { status: 400 });
  }
}
