import Link from "next/link";
import { ProductVisual } from "@/components/product-visual";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { archiveSpool, logDrying, setSpoolWeight } from "@/app/actions";
import { db } from "@/lib/db";
import { dryingEvents, locations, spoolEvents, spools } from "@/lib/db/schema";
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

  const [events, dryingHistory] = await Promise.all([
    db
    .select()
    .from(spoolEvents)
    .where(and(eq(spoolEvents.spoolId, id), eq(spoolEvents.organizationId, workspace.organizationId)))
    .orderBy(desc(spoolEvents.createdAt))
    .limit(40),
    db
      .select()
      .from(dryingEvents)
      .where(and(eq(dryingEvents.spoolId, id), eq(dryingEvents.organizationId, workspace.organizationId)))
      .orderBy(desc(dryingEvents.createdAt))
      .limit(10)
  ]);

  const s = spool.spool;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Fiche bobine</div>
          <h1>{s.productName}</h1>
          <p>{s.manufacturer} · {s.material} · {s.colorName || "Couleur non renseignée"} · {s.diameterMm} mm</p>
        </div>
        <div className="page-actions">
          <Link className="button" href="/inventory">← Retour</Link>
        </div>
      </div>

      <div className="spool-hero" style={{ marginBottom: 18 }}>
        <section className="card elevated">
          <ProductVisual
            kind="filament"
            brand={s.manufacturer}
            name={s.productName}
            color={s.colorHex}
            compact
          />
          <div style={{ height: 18 }} />
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

        <aside className="card qr-panel elevated">
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
          <h2 style={{ marginTop: 0 }}>Séchage</h2>
          <form action={logDrying} className="form">
            <input type="hidden" name="spoolId" value={s.id} />
            <div className="form-row">
              <div className="field">
                <label>Température (°C)</label>
                <input className="input" name="temperatureC" type="number" min="20" max="150" defaultValue={s.dryingTempC ?? 55} required />
              </div>
              <div className="field">
                <label>Durée (minutes)</label>
                <input className="input" name="durationMinutes" type="number" min="1" defaultValue="360" required />
              </div>
            </div>
            <div className="field">
              <label>Note</label>
              <input className="input" name="notes" placeholder="Drybox, déshydrateur…" />
            </div>
            <button className="button primary" type="submit">Enregistrer le séchage</button>
          </form>

          {dryingHistory.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <strong>Derniers séchages</strong>
              <div className="grid" style={{ gap: 8, marginTop: 10 }}>
                {dryingHistory.map((drying) => (
                  <div className="kv-item" key={drying.id}>
                    <span>{dateTime(drying.createdAt)}</span>
                    <strong>{drying.temperatureC} °C · {Math.round(drying.durationMinutes / 60 * 10) / 10} h</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          <h2 style={{ marginTop: 28 }}>Notes</h2>
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
