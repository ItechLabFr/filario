import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { locations, spools } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { grams, money, percent } from "@/lib/format";

export const metadata = { title: "Bobines" };

export default async function InventoryPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const rows = await db
    .select({
      id: spools.id,
      manufacturer: spools.manufacturer,
      productName: spools.productName,
      material: spools.material,
      colorName: spools.colorName,
      colorHex: spools.colorHex,
      initialWeightG: spools.initialWeightG,
      remainingWeightG: spools.remainingWeightG,
      purchasePriceCents: spools.purchasePriceCents,
      currency: spools.currency,
      status: spools.status,
      locationName: locations.name,
      updatedAt: spools.updatedAt
    })
    .from(spools)
    .leftJoin(locations, eq(spools.locationId, locations.id))
    .where(eq(spools.organizationId, workspace.organizationId))
    .orderBy(sql`${spools.updatedAt} desc`);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bobines</h1>
          <p>{rows.length} bobine(s) dans l'inventaire de {workspace.organizationName}.</p>
        </div>
        <Link className="button primary" href="/inventory/new">Ajouter une bobine</Link>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <strong>Aucune bobine pour l'instant.</strong>
          Commencez par enregistrer votre stock actuel.
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Filament</th>
                <th>Matière</th>
                <th>Restant</th>
                <th>Emplacement</th>
                <th>Valeur</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <Link href={`/inventory/${row.id}`} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <span className="color-dot" style={{ background: row.colorHex || "#808080" }} />
                      <span>
                        <strong>{row.manufacturer} {row.productName}</strong>
                        <span style={{ display: "block", color: "var(--muted)", fontSize: 11, marginTop: 2 }}>{row.colorName || "Couleur non renseignée"}</span>
                      </span>
                    </Link>
                  </td>
                  <td><span className="pill">{row.material}</span></td>
                  <td style={{ minWidth: 150 }}>
                    <strong>{grams(row.remainingWeightG)}</strong>
                    <div className="progress" style={{ marginTop: 6 }}>
                      <span style={{ width: `${percent(row.remainingWeightG, row.initialWeightG)}%` }} />
                    </div>
                  </td>
                  <td>{row.locationName || "—"}</td>
                  <td>{row.purchasePriceCents == null ? "—" : money(Math.round(row.purchasePriceCents * row.remainingWeightG / Math.max(1, row.initialWeightG)), row.currency)}</td>
                  <td><span className="pill">{row.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
