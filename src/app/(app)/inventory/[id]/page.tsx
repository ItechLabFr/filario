import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { archiveSpool, setSpoolWeight } from "@/app/actions";
import { db } from "@/lib/db";
import { locations, spoolEvents, spools } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { dateTime, grams, money, percent } from "@/lib/format";

export default async function SpoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const [spool] = await db
    .select({
      spool: spools,
      locationName: locations.name
    })
    .from(spools)
    .leftJoin(locations, eq(spools.locationId, locations.id))
    .where(and(eq(spools.id, id), eq(spools.organizationId, workspace.organizationId)))
    .limit(1);

  if (!spool) notFound();

  const events = await db
    .select()
    .from(spoolEvents)
    .where(and(eq(spoolEvents.spoolId, id), eq(spoolEvents.organizationId, workspace.organizationId)))
    .orderBy(desc(spoolEvents.createdAt))
    .limit(40);

  const s = spool.spool;

  return (
    <>
      <div className="page-head">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
            <span className="spool-color" style={{ background: s.colorHex || "#808080" }} />
            <div>
              <h1 style={{ marginBottom: 3 }}>{s.manufacturer} {s.productName}</h1>
              <p>{s.material} · {s.colorName || "Couleur non renseignée"} · {s.diameterMm} mm</p>
            </div>
          </div>
        </div>
        <Link className="button" href="/inventory">Retour</Link>
      </div>

      <div className="spool-hero" style={{ marginBottom: 18 }}>
        <section className="card">
          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <div>
              <div className="stat-label">Restant</div>
              <div className="stat-value">{grams(s.remainingWeightG)}</div>
            </div>
            <div>
              <div className="stat-label">Niveau</div>
              <div className="stat-value">{percent(s.remainingWeightG, s.initialWeightG)}%</div>
            </div>
            <div>
              <div className="stat-label">Valeur estimée</div>
              <div className="stat-value" style={{ fontSize: 22 }}>
                {s.purchasePriceCents == null ? "—" : money(Math.round(s.purchasePriceCents * s.remainingWeightG / Math.max(1, s.initialWeightG)), s.currency)}
              </div>
            </div>
          </div>
          <div className="progress"><span style={{ width: `${percent(s.remainingWeightG, s.initialWeightG)}%` }} /></div>

          <div className="kv" style={{ marginTop: 20 }}>
            <div className="kv-item"><span>Emplacement</span><strong>{spool.locationName || "Non classé"}</strong></div>
            <div className="kv-item"><span>Poids initial</span><strong>{grams(s.initialWeightG)}</strong></div>
            <div className="kv-item"><span>Buse</span><strong>{s.nozzleMinC || "—"} – {s.nozzleMaxC || "—"} °C</strong></div>
            <div className="kv-item"><span>Plateau</span><strong>{s.bedMinC || "—"} – {s.bedMaxC || "—"} °C</strong></div>
            <div className="kv-item"><span>Séchage</span><strong>{s.dryingTempC ? `${s.dryingTempC} °C` : "—"}</strong></div>
            <div className="kv-item"><span>Créée</span><strong>{dateTime(s.createdAt)}</strong></div>
          </div>

          <form action={setSpoolWeight} className="form" style={{ marginTop: 22 }}>
            <input type="hidden" name="id" value={s.id} />
            <div className="field">
              <label>Corriger / peser la bobine</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="input" name="remainingWeightG" type="number" min="0" defaultValue={s.remainingWeightG} required />
                <button className="button primary" type="submit">Enregistrer</button>
              </div>
            </div>
          </form>
        </section>

        <aside className="card qr-panel">
          <strong>QR de la bobine</strong>
          <img src={`/api/qr/${s.publicId}`} alt="QR code de la bobine" style={{ marginTop: 15 }} />
          <small style={{ color: "var(--muted)", marginTop: 10 }}>ID : {s.publicId}</small>
          <a className="button small" href={`/api/qr/${s.publicId}?download=1`} style={{ marginTop: 12 }}>Télécharger SVG</a>
        </aside>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Historique</h2>
          {events.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Aucun événement.</p>
          ) : (
            <div className="timeline">
              {events.map((event) => (
                <div className="timeline-item" key={event.id}>
                  <span className="timeline-mark" />
                  <div>
                    <strong>{event.eventType.replaceAll("_", " ")}</strong>
                    <span>
                      {dateTime(event.createdAt)}
                      {event.quantityG != null ? ` · ${event.quantityG > 0 ? "+" : ""}${event.quantityG} g` : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Notes</h2>
          <p style={{ color: "var(--muted)", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{s.notes || "Aucune note."}</p>
          <form action={archiveSpool} style={{ marginTop: 24 }}>
            <input type="hidden" name="id" value={s.id} />
            <button className="button danger" type="submit">Archiver la bobine</button>
          </form>
        </section>
      </div>
    </>
  );
}
