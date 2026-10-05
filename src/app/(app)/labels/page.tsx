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
      <div className="page-head pro-page-head label-screen-only">
        <div>
          <span className="kicker">Identification</span>
          <h1>QR bobines</h1>
          <p>Un scan ouvre directement la bonne bobine dans Filario.</p>
        </div>
      </div>

      <section className="qr-how-it-works label-screen-only">
        <div className="qr-step"><strong>1</strong><span>Imprimez l’étiquette</span></div>
        <div className="qr-arrow">→</div>
        <div className="qr-step"><strong>2</strong><span>Collez-la sur la bobine</span></div>
        <div className="qr-arrow">→</div>
        <div className="qr-step"><strong>3</strong><span>Scannez avec le téléphone</span></div>
        <div className="qr-arrow">→</div>
        <div className="qr-step"><strong>4</strong><span>Filario ouvre sa fiche</span></div>
      </section>

      <div className="surface-panel qr-security-note label-screen-only">
        <strong>Le QR ne contient aucune donnée sensible.</strong>
        <span>
          Il encode uniquement l’adresse Filario et un identifiant public aléatoire. Les informations de stock restent derrière votre connexion Filario.
        </span>
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
