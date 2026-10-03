import { eq, sql } from "drizzle-orm";
import { createLocation } from "@/app/actions";
import { db } from "@/lib/db";
import { locations, spools } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata = { title: "Emplacements" };

export default async function LocationsPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const rows = await db
    .select({
      id: locations.id,
      name: locations.name,
      description: locations.description,
      count: sql<number>`count(${spools.id})::int`
    })
    .from(locations)
    .leftJoin(spools, eq(spools.locationId, locations.id))
    .where(eq(locations.organizationId, workspace.organizationId))
    .groupBy(locations.id)
    .orderBy(locations.name);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Emplacements</h1>
          <p>Étagères, boîtes sèches, bacs et zones de stockage.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Ajouter un emplacement</h2>
          <form action={createLocation} className="form">
            <div className="field">
              <label>Nom</label>
              <input className="input" name="name" placeholder="Drybox A" required />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea className="textarea" name="description" placeholder="Étagère du haut, côté gauche…" />
            </div>
            <button className="button primary" type="submit">Ajouter</button>
          </form>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Stockage</h2>
          {rows.length === 0 ? (
            <div className="empty"><strong>Aucun emplacement.</strong>Créez votre première zone de rangement.</div>
          ) : (
            <div className="grid">
              {rows.map((row) => (
                <div key={row.id} className="card flat" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                  <div>
                    <strong>{row.name}</strong>
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>{row.description || "Sans description"}</div>
                  </div>
                  <span className="pill">{row.count} bobine(s)</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
