import { eq } from "drizzle-orm";
import { createPrinter } from "@/app/actions";
import { ProductVisual } from "@/components/product-visual";
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
          <div className="eyebrow">Parc machines</div>
          <h1>Imprimantes</h1>
          <p>Une vue claire de vos machines, pensée pour devenir le centre de contrôle de l’atelier.</p>
        </div>
      </div>

      <div className="printer-layout">
        <section className="card elevated">
          <div className="eyebrow">Nouvelle machine</div>
          <h2 style={{ marginTop: 0 }}>Ajouter une imprimante</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.6, marginTop: -6 }}>
            Enregistrez la machine maintenant ; les intégrations réseau pourront être ajoutées ensuite.
          </p>

          <form action={createPrinter} className="form" style={{ marginTop: 18 }}>
            <div className="field">
              <label>Nom *</label>
              <input className="input" name="name" placeholder="X1C Atelier" required />
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
            <button className="button primary" type="submit">+ Ajouter la machine</button>
          </form>
        </section>

        <section>
          <div className="section-head" style={{ marginTop: 0 }}>
            <div>
              <h2>Votre parc</h2>
              <p>{rows.length} machine{rows.length > 1 ? "s" : ""} enregistrée{rows.length > 1 ? "s" : ""}.</p>
            </div>
            {rows.length > 0 && <span className="pill accent">{rows.length} active{rows.length > 1 ? "s" : ""}</span>}
          </div>

          {rows.length === 0 ? (
            <div className="empty">
              <strong>Aucune imprimante.</strong>
              Ajoutez une machine à votre atelier pour l’associer à vos impressions et bobines.
            </div>
          ) : (
            <div className="printer-grid">
              {rows.map((printer) => (
                <article key={printer.id} className="printer-card">
                  <ProductVisual
                    kind="printer"
                    brand={printer.manufacturer || "Imprimante 3D"}
                    name={printer.model || printer.name}
                  />
                  <div className="printer-card-body">
                    <div className="printer-card-head">
                      <div>
                        <h3>{printer.name}</h3>
                        <p>
                          {[printer.manufacturer, printer.model].filter(Boolean).join(" · ") || "Machine personnalisée"}
                        </p>
                      </div>
                      <span className="pill accent">{printer.status}</span>
                    </div>
                    <div className="machine-status">
                      <i />
                      Prête pour le suivi Filario
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
