import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ProductVisual } from "@/components/product-visual";
import { db } from "@/lib/db";
import { printers, spools } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { grams, money } from "@/lib/format";

export const metadata = { title: "Vue d'ensemble" };

export default async function DashboardPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const [[spoolStats], [printerStats], recentSpools, recentPrinters] = await Promise.all([
    db.select({
      count: sql<number>`count(*)::int`,
      remaining: sql<number>`coalesce(sum(${spools.remainingWeightG}), 0)::int`,
      low: sql<number>`count(*) filter (where ${spools.remainingWeightG} <= 150 and ${spools.status} = 'active')::int`,
      value: sql<number>`coalesce(sum(case when ${spools.purchasePriceCents} is not null and ${spools.initialWeightG} > 0 then round(${spools.purchasePriceCents} * ${spools.remainingWeightG}::numeric / ${spools.initialWeightG}) else 0 end), 0)::int`
    }).from(spools).where(eq(spools.organizationId, workspace.organizationId)),
    db.select({
      count: sql<number>`count(*)::int`,
      online: sql<number>`count(*) filter (where ${printers.status} <> 'offline')::int`,
      cloud: sql<number>`count(*) filter (where ${printers.integrationType} = 'bambu-cloud')::int`
    }).from(printers).where(eq(printers.organizationId, workspace.organizationId)),
    db.select().from(spools)
      .where(eq(spools.organizationId, workspace.organizationId))
      .orderBy(sql`${spools.updatedAt} desc`).limit(4),
    db.select().from(printers)
      .where(eq(printers.organizationId, workspace.organizationId))
      .orderBy(sql`${printers.updatedAt} desc`).limit(4)
  ]);

  const total = spoolStats?.count ?? 0;
  const low = spoolStats?.low ?? 0;

  return (
    <>
      <div className="page-head pro-page-head">
        <div>
          <span className="kicker">Atelier</span>
          <h1>{workspace.organizationName}</h1>
          <p>État du stock et des machines. Les actions importantes restent accessibles en un clic.</p>
        </div>
        <div className="page-actions">
          <Link className="button" href="/integrations">Intégrations</Link>
          <Link className="button primary" href="/inventory/new">Ajouter une bobine</Link>
        </div>
      </div>

      <div className="overview-grid">
        <div className="metric-tile primary-metric">
          <span>Filament disponible</span>
          <strong>{grams(spoolStats?.remaining ?? 0)}</strong>
          <small>{total} bobine{total > 1 ? "s" : ""}</small>
        </div>
        <div className="metric-tile">
          <span>Stock faible</span>
          <strong>{low}</strong>
          <small>≤ 150 g</small>
        </div>
        <div className="metric-tile">
          <span>Machines disponibles</span>
          <strong>{printerStats?.online ?? 0}/{printerStats?.count ?? 0}</strong>
          <small>{printerStats?.cloud ?? 0} via Bambu Cloud</small>
        </div>
        <div className="metric-tile">
          <span>Valeur restante</span>
          <strong>{money(spoolStats?.value ?? 0)}</strong>
          <small>estimation stock</small>
        </div>
      </div>

      <div className="dashboard-columns">
        <section>
          <div className="section-head">
            <div>
              <h2>Machines</h2>
              <p>Dernières imprimantes synchronisées.</p>
            </div>
            <Link className="button small" href="/printers">Toutes</Link>
          </div>

          {recentPrinters.length === 0 ? (
            <div className="empty pro-empty">
              <strong>Aucune machine.</strong>
              Connectez Bambu Cloud ou ajoutez une imprimante.
            </div>
          ) : (
            <div className="compact-machine-list">
              {recentPrinters.map((printer) => (
                <Link className="compact-machine-row" href="/printers" key={printer.id}>
                  <div className="compact-machine-art">
                    <ProductVisual
                      kind="printer"
                      brand={printer.manufacturer || "Imprimante 3D"}
                      name={printer.model || printer.name}
                      compact
                    />
                  </div>
                  <div className="compact-machine-copy">
                    <strong>{printer.name}</strong>
                    <span>{printer.model || printer.manufacturer || "Machine"}</span>
                  </div>
                  <span className={printer.status === "offline" ? "status-chip status-offline" : "status-chip status-online"}>
                    {printer.status === "offline" ? "Hors ligne" : "Disponible"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <div>
              <h2>Bobines récentes</h2>
              <p>Dernières références mises à jour.</p>
            </div>
            <Link className="button small" href="/inventory">Stock</Link>
          </div>

          {recentSpools.length === 0 ? (
            <div className="empty pro-empty">
              <strong>Inventaire vide.</strong>
              Ajoutez une première bobine.
            </div>
          ) : (
            <div className="compact-spool-list">
              {recentSpools.map((spool) => {
                const pct = spool.initialWeightG
                  ? Math.max(0, Math.min(100, Math.round((spool.remainingWeightG / spool.initialWeightG) * 100)))
                  : 0;
                return (
                  <Link className="compact-spool-row" href={`/inventory/${spool.id}`} key={spool.id}>
                    <span className="spool-swatch" style={{ background: spool.colorHex || "#7d8a92" }} />
                    <div className="compact-spool-copy">
                      <strong>{spool.productName}</strong>
                      <span>{spool.manufacturer} · {spool.material}</span>
                    </div>
                    <div className="compact-spool-weight">
                      <strong>{grams(spool.remainingWeightG)}</strong>
                      <span>{pct}%</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {(low > 0 || (printerStats?.cloud ?? 0) === 0) && (
        <section className="attention-panel">
          <span className="attention-dot" />
          <div>
            <strong>À faire</strong>
            <p>
              {low > 0 ? `${low} bobine(s) sont sous 150 g. ` : ""}
              {(printerStats?.cloud ?? 0) === 0 ? "Bambu Cloud n’est pas encore connecté." : ""}
            </p>
          </div>
          {(printerStats?.cloud ?? 0) === 0 && (
            <Link className="button small" href="/integrations">Connecter</Link>
          )}
        </section>
      )}
    </>
  );
}
