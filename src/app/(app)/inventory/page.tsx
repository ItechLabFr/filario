import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ProductVisual } from "@/components/product-visual";
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

  const remaining = rows.reduce((sum, row) => sum + row.remainingWeightG, 0);
  const low = rows.filter((row) => row.status === "active" && row.remainingWeightG <= 150).length;
  const materials = new Set(rows.map((row) => row.material)).size;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Inventaire</div>
          <h1>Vos bobines</h1>
          <p>Un inventaire visuel pensé pour retrouver une couleur, une matière ou une bobine en un coup d’œil.</p>
        </div>
        <div className="page-actions">
          <Link className="button" href="/labels">Étiquettes QR</Link>
          <Link className="button primary" href="/inventory/new">+ Ajouter une bobine</Link>
        </div>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 22 }}>
        <div className="card stat-card">
          <span className="stat-label">Bobines</span>
          <div><div className="stat-value">{rows.length}</div><div className="stat-sub">dans {workspace.organizationName}</div></div>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Filament disponible</span>
          <div><div className="stat-value">{grams(remaining)}</div><div className="stat-sub">poids cumulé restant</div></div>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Matières</span>
          <div><div className="stat-value">{materials}</div><div className="stat-sub">types différents en stock</div></div>
        </div>
        <div className="card stat-card">
          <span className="stat-label">À surveiller</span>
          <div><div className="stat-value">{low}</div><div className="stat-sub">bobines sous les 150 g</div></div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          <strong>Aucune bobine pour l’instant.</strong>
          Commencez par enregistrer votre stock actuel.
        </div>
      ) : (
        <>
          <div className="section-head">
            <div>
              <h2>Stock actuel</h2>
              <p>Vue visuelle avec poids, couleur, matière et emplacement.</p>
            </div>
            <span className="pill">{rows.length} bobine{rows.length > 1 ? "s" : ""}</span>
          </div>

          <div className="spool-grid">
            {rows.map((row) => {
              const pct = percent(row.remainingWeightG, row.initialWeightG);
              const value = row.purchasePriceCents == null
                ? null
                : Math.round(row.purchasePriceCents * row.remainingWeightG / Math.max(1, row.initialWeightG));

              return (
                <Link key={row.id} className="spool-card" href={`/inventory/${row.id}`}>
                  <ProductVisual
                    kind="filament"
                    brand={row.manufacturer}
                    name={row.productName}
                    color={row.colorHex}
                  />
                  <div className="spool-card-body">
                    <div className="spool-card-head">
                      <div className="spool-card-title">
                        <strong>{row.productName}</strong>
                        <span>{row.manufacturer} · {row.colorName || "Couleur non renseignée"}</span>
                      </div>
                      <span className="pill accent">{row.material}</span>
                    </div>

                    <div className="spool-card-meta">
                      <span className="pill">{row.locationName || "Non classée"}</span>
                      <span className="pill">{row.status}</span>
                      {value != null && <span className="pill">{money(value, row.currency)}</span>}
                    </div>

                    <div className="spool-card-weight">
                      <div>
                        <strong>{grams(row.remainingWeightG)}</strong>
                        <span> / {grams(row.initialWeightG)}</span>
                      </div>
                      <span>{pct}%</span>
                    </div>
                    <div className="progress" style={{ marginTop: 8 }}>
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
