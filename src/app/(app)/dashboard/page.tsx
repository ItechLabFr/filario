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

  const [spoolStats] = await db
    .select({
      count: sql<number>`count(*)::int`,
      remaining: sql<number>`coalesce(sum(${spools.remainingWeightG}), 0)::int`,
      low: sql<number>`count(*) filter (where ${spools.remainingWeightG} <= 150 and ${spools.status} = 'active')::int`,
      value: sql<number>`coalesce(sum(case when ${spools.purchasePriceCents} is not null and ${spools.initialWeightG} > 0 then round(${spools.purchasePriceCents} * ${spools.remainingWeightG}::numeric / ${spools.initialWeightG}) else 0 end), 0)::int`
    })
    .from(spools)
    .where(eq(spools.organizationId, workspace.organizationId));

  const [printerStats] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(printers)
    .where(eq(printers.organizationId, workspace.organizationId));

  const recent = await db
    .select()
    .from(spools)
    .where(eq(spools.organizationId, workspace.organizationId))
    .orderBy(sql`${spools.updatedAt} desc`)
    .limit(6);

  const firstName = session.user.name?.split(" ")[0] || "";
  const total = spoolStats?.count ?? 0;
  const low = spoolStats?.low ?? 0;

  return (
    <>
      <section className="hero-panel">
        <div className="hero-copy">
          <div className="eyebrow">Atelier en temps réel</div>
          <h1>{firstName ? `Bonjour ${firstName}.` : "Bonjour."}<br />Votre filament, enfin clair.</h1>
          <p>
            Une vue rapide de votre stock, de vos machines et de ce qui demande votre attention.
            Ajoutez une bobine, retrouvez-la en quelques secondes et gardez votre atelier propre.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/inventory/new">+ Ajouter une bobine</Link>
            <Link className="button" href="/inventory">Voir le stock</Link>
            <Link className="button ghost" href="/printers">Mes imprimantes</Link>
          </div>
        </div>

        <div className="hero-glance">
          <div className="glance-item accent">
            <span>Stock total</span>
            <strong>{grams(spoolStats?.remaining ?? 0)}</strong>
          </div>
          <div className="glance-item">
            <span>Bobines actives</span>
            <strong>{total}</strong>
          </div>
          <div className="glance-item">
            <span>À surveiller</span>
            <strong>{low}</strong>
          </div>
          <div className="glance-item">
            <span>Machines</span>
            <strong>{printerStats?.count ?? 0}</strong>
          </div>
        </div>
      </section>

      <div className="grid grid-4">
        <div className="card stat-card">
          <div className="stat-label">Bobines enregistrées</div>
          <div>
            <div className="stat-value">{total}</div>
            <div className="stat-sub">toutes matières confondues</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Filament restant</div>
          <div>
            <div className="stat-value">{grams(spoolStats?.remaining ?? 0)}</div>
            <div className="stat-sub">poids disponible dans l'atelier</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Stock faible</div>
          <div>
            <div className="stat-value">{low}</div>
            <div className="stat-sub">bobines à 150 g ou moins</div>
          </div>
        </div>
        <div className="card stat-card">
          <div className="stat-label">Valeur restante</div>
          <div>
            <div className="stat-value">{money(spoolStats?.value ?? 0)}</div>
            <div className="stat-sub">estimation de la matière disponible</div>
          </div>
        </div>
      </div>

      <div className="section-head">
        <div>
          <h2>Dernières bobines</h2>
          <p>Les références récemment manipulées dans votre atelier.</p>
        </div>
        <Link className="button small" href="/inventory">Tout voir</Link>
      </div>

      {recent.length === 0 ? (
        <div className="empty">
          <strong>Votre inventaire est vide.</strong>
          Ajoutez votre première bobine pour commencer à construire votre atelier numérique.
        </div>
      ) : (
        <div className="spool-grid">
          {recent.map((spool) => {
            const pct = spool.initialWeightG ? Math.round((spool.remainingWeightG / spool.initialWeightG) * 100) : 0;
            return (
              <Link key={spool.id} className="spool-card" href={`/inventory/${spool.id}`}>
                <ProductVisual
                  kind="filament"
                  brand={spool.manufacturer}
                  name={spool.productName}
                  color={spool.colorHex}
                />
                <div className="spool-card-body">
                  <div className="spool-card-head">
                    <div className="spool-card-title">
                      <strong>{spool.productName}</strong>
                      <span>{spool.manufacturer} · {spool.colorName || "Couleur non renseignée"}</span>
                    </div>
                    <span className="pill accent">{spool.material}</span>
                  </div>
                  <div className="spool-card-weight">
                    <div><strong>{grams(spool.remainingWeightG)}</strong><span> restant</span></div>
                    <span>{Math.max(0, Math.min(100, pct))}%</span>
                  </div>
                  <div className="progress" style={{ marginTop: 8 }}>
                    <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
