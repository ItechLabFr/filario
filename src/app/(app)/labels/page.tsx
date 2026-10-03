import { eq } from "drizzle-orm";
import { LabelsSheet } from "@/components/labels-sheet";
import { db } from "@/lib/db";
import { spools } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata = { title: "Étiquettes" };

export default async function LabelsPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const rows = await db
    .select({
      id: spools.id,
      publicId: spools.publicId,
      manufacturer: spools.manufacturer,
      productName: spools.productName,
      material: spools.material,
      colorName: spools.colorName,
      colorHex: spools.colorHex,
      remainingWeightG: spools.remainingWeightG,
      nozzleMinC: spools.nozzleMinC,
      nozzleMaxC: spools.nozzleMaxC
    })
    .from(spools)
    .where(eq(spools.organizationId, workspace.organizationId))
    .orderBy(spools.manufacturer, spools.productName);

  return (
    <>
      <div className="page-head label-screen-only">
        <div>
          <h1>Étiquettes</h1>
          <p>Imprimez des étiquettes compactes avec QR pour retrouver chaque bobine instantanément.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty label-screen-only">
          <strong>Aucune bobine à imprimer.</strong>
          Ajoutez d'abord une bobine à votre inventaire.
        </div>
      ) : (
        <LabelsSheet spools={rows} />
      )}
    </>
  );
}
