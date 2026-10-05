import Link from "next/link";
import { eq } from "drizzle-orm";
import { createPrinter } from "@/app/actions";
import { ProductVisual } from "@/components/product-visual";
import { db } from "@/lib/db";
import { printers } from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata = { title: "Imprimantes" };

function statusText(status: string) {
  if (status === "printing") return "Impression en cours";
  if (status === "idle") return "Disponible";
  if (status === "offline") return "Hors ligne";
  if (status === "error") return "Attention";
  return status;
}

export default async function PrintersPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const rows = await db
    .select()
    .from(printers)
    .where(eq(printers.organizationId, workspace.organizationId))
    .orderBy(printers.name);

  const cloudCount = rows.filter((row) => row.integrationType === "bambu-cloud").length;
  const onlineCount = rows.filter((row) => row.status !== "offline").length;

  return (
    <>
      <div className="page-head pro-page-head">
        <div>
          <span className="kicker">Machines</span>
          <h1>Imprimantes</h1>
          <p>Vos machines, leur connexion et leur disponibilité dans un seul écran.</p>
        </div>
        <div className="page-actions">
          <Link className="button" href="/integrations">Intégrations</Link>
          <a className="button primary" href="#ajouter">Ajouter une machine</a>
        </div>
      </div>

      <div className="machine-summary">
        <div className="metric-tile">
          <span>Machines</span>
          <strong>{rows.length}</strong>
        </div>
        <div className="metric-tile">
          <span>Disponibles</span>
          <strong>{onlineCount}</strong>
        </div>
        <div className="metric-tile">
          <span>Bambu Cloud</span>
          <strong>{cloudCount}</strong>
        </div>
      </div>

      <section className="surface-panel bambu-callout">
        <div className="bambu-callout-mark">B</div>
        <div>
          <span className="kicker">Bambu Cloud · Beta</span>
          <h2>Importer automatiquement vos Bambu Lab</h2>
          <p>
            Connectez votre compte par code e-mail. Filario ajoute les imprimantes liées à votre compte
            sans vous demander de passer en LAN Only.
          </p>
        </div>
        <Link className="button primary" href="/integrations">Connecter Bambu</Link>
      </section>

      <div className="section-head">
        <div>
          <h2>Parc machines</h2>
          <p>{rows.length} machine{rows.length > 1 ? "s" : ""} dans {workspace.organizationName}.</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="empty pro-empty">
          <strong>Aucune imprimante.</strong>
          Connectez Bambu Cloud ou ajoutez une machine manuellement.
        </div>
      ) : (
        <div className="machine-grid">
          {rows.map((printer) => (
            <article key={printer.id} className="machine-card">
              <ProductVisual
                kind="printer"
                brand={printer.manufacturer || "Imprimante 3D"}
                name={printer.model || printer.name}
              />
              <div className="machine-card-body">
                <div className="machine-card-top">
                  <div>
                    <span className="machine-brand">{printer.manufacturer || "Imprimante 3D"}</span>
                    <h3>{printer.name}</h3>
                    <p>{printer.model || "Machine personnalisée"}</p>
                  </div>
                  <span className={printer.status === "offline" ? "status-chip status-offline" : "status-chip status-online"}>
                    {statusText(printer.status)}
                  </span>
                </div>

                <div className="machine-card-footer">
                  <div className="machine-source">
                    <span className="source-dot" />
                    {printer.integrationType === "bambu-cloud" ? "Bambu Cloud" : "Manuelle"}
                  </div>
                  {printer.integrationType === "bambu-cloud" && (
                    <span className="muted-mini">Caméra : Bambu Handy</span>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <section id="ajouter" className="surface-panel manual-printer-panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Ajout manuel</span>
            <h2>Machine sans intégration</h2>
            <p>Pour une imprimante qui n’est pas connectée à un service compatible.</p>
          </div>
        </div>

        <form action={createPrinter} className="form compact-form">
          <div className="form-row">
            <div className="field">
              <label>Nom *</label>
              <input className="input" name="name" placeholder="A1 Atelier" required />
            </div>
            <div className="field">
              <label>Fabricant</label>
              <input className="input" name="manufacturer" placeholder="Bambu Lab" />
            </div>
            <div className="field">
              <label>Modèle</label>
              <input className="input" name="model" placeholder="A1" />
            </div>
          </div>
          <div>
            <button className="button primary" type="submit">Ajouter la machine</button>
          </div>
        </form>
      </section>
    </>
  );
}
