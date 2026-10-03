import Link from "next/link";
import { eq, sql } from "drizzle-orm";
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

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Bonjour {session.user.name?.split(" ")[0] || ""}</h1>
          <p>Voici l'état actuel de votre stock de filament.</p>
        </div>
        <Link className="button primary" href="/inventory/new">Ajouter une bobine</Link>
      </div>

      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="stat-label">Bobines</div>
          <div className="stat-value">{spoolStats?.count ?? 0}</div>
          <div className="stat-sub">dans votre inventaire</div>
        </div>
        <div className="card">
          <div className="stat-label">Filament restant</div>
          <div className="stat-value">{grams(spoolStats?.remaining ?? 0)}</div>
          <div className="stat-sub">toutes matières confondues</div>
        </div>
        <div className="card">
          <div className="stat-label">Stock faible</div>
          <div className="stat-value">{spoolStats?.low ?? 0}</div>
          <div className="stat-sub">bobines à 150 g ou moins</div>
        </div>
        <div className="card">
          <div className="stat-label">Valeur restante</div>
          <div className="stat-value">{money(spoolStats?.value ?? 0)}</div>
          <div className="stat-sub">{printerStats?.count ?? 0} imprimante(s)</div>
        </div>
      </div>

      <section className="card flat">
        <div className="page-head" style={{ marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 20 }}>Dernières bobines</h1>
            <p>Les références modifiées récemment.</p>
          </div>
          <Link className="button small" href="/inventory">Tout voir</Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty">
            <strong>Votre inventaire est vide.</strong>
            Ajoutez votre première bobine pour commencer.
          </div>
        ) : (
          <div className="grid grid-3">
            {recent.map((spool) => {
              const pct = spool.initialWeightG ? Math.round((spool.remainingWeightG / spool.initialWeightG) * 100) : 0;
              return (
                <Link key={spool.id} className="card flat" href={`/inventory/${spool.id}`}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span className="spool-color" style={{ width: 30, height: 30, background: spool.colorHex || "#808080" }} />
                    <div>
                      <strong>{spool.manufacturer} {spool.productName}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 3 }}>{spool.material} · {grams(spool.remainingWeightG)}</div>
                    </div>
                  </div>
                  <div className="progress" style={{ marginTop: 14 }}><span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}
