import { eq } from "drizzle-orm";
import { createPrinter } from "@/app/actions";
import { db } from "@/lib/db";
import { printers } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata = { title: "Imprimantes" };

export default async function PrintersPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const rows = await db
    .select()
    .from(printers)
    .where(eq(printers.organizationId, workspace.organizationId))
    .orderBy(printers.name);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Imprimantes</h1>
          <p>Associez vos machines aux bobines et préparez les futures intégrations Klipper, OctoPrint et constructeurs.</p>
        </div>
      </div>

      <div className="grid grid-2">
        <section className="card">
          <h2 style={{ marginTop: 0 }}>Ajouter une imprimante</h2>
          <form action={createPrinter} className="form">
            <div className="field">
              <label>Nom *</label>
              <input className="input" name="name" placeholder="Bambu X1C" required />
            </div>
            <div className="form-row">
              <div className="field">
                <label>Fabricant</label>
                <input className="input" name="manufacturer" placeholder="Bambu Lab" />
              </div>
              <div className="field">
                <label>Modèle</label>
                <input className="input" name="model" placeholder="X1 Carbon" />
              </div>
            </div>
            <button className="button primary" type="submit">Ajouter</button>
          </form>
        </section>

        <section className="card">
          <h2 style={{ marginTop: 0 }}>Machines</h2>
          {rows.length === 0 ? (
            <div className="empty"><strong>Aucune imprimante.</strong>Ajoutez une machine à votre atelier.</div>
          ) : (
            <div className="grid">
              {rows.map((printer) => (
                <div key={printer.id} className="card flat">
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div>
                      <strong>{printer.name}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                        {[printer.manufacturer, printer.model].filter(Boolean).join(" · ") || "Machine personnalisée"}
                      </div>
                    </div>
                    <span className="pill">{printer.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
