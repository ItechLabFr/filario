import { eq, sql } from "drizzle-orm";
import { completePrintJob, createPrintJob, startPrintJob } from "@/app/actions";
import { db } from "@/lib/db";
import {
  printers,
  printJobFilaments,
  printJobs,
  spools
} from "@/lib/db/schema";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";
import { dateTime, grams } from "@/lib/format";

export const metadata = { title: "Impressions" };

function statusLabel(status: string) {
  if (status === "printing") return "En cours";
  if (status === "completed") return "Terminée";
  if (status === "failed") return "Échec";
  return "Planifiée";
}

export default async function JobsPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const [machines, availableSpools, jobs] = await Promise.all([
    db.select().from(printers)
      .where(eq(printers.organizationId, workspace.organizationId))
      .orderBy(printers.name),
    db.select({
      id: spools.id,
      manufacturer: spools.manufacturer,
      productName: spools.productName,
      material: spools.material,
      remainingWeightG: spools.remainingWeightG
    }).from(spools)
      .where(sql`${spools.organizationId} = ${workspace.organizationId} and ${spools.status} = 'active'`)
      .orderBy(spools.manufacturer, spools.productName),
    db.select({
      id: printJobs.id,
      name: printJobs.name,
      status: printJobs.status,
      startedAt: printJobs.startedAt,
      finishedAt: printJobs.finishedAt,
      durationSeconds: printJobs.durationSeconds,
      printerName: printers.name,
      spoolId: printJobFilaments.spoolId,
      spoolManufacturer: spools.manufacturer,
      spoolProductName: spools.productName,
      plannedWeightG: printJobFilaments.plannedWeightG,
      actualWeightG: printJobFilaments.actualWeightG
    })
      .from(printJobs)
      .leftJoin(printers, eq(printJobs.printerId, printers.id))
      .leftJoin(printJobFilaments, eq(printJobFilaments.printJobId, printJobs.id))
      .leftJoin(spools, eq(printJobFilaments.spoolId, spools.id))
      .where(eq(printJobs.organizationId, workspace.organizationId))
      .orderBy(sql`${printJobs.createdAt} desc`)
      .limit(100)
  ]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Production</div>
          <h1>Impressions</h1>
          <p>Planifiez, lancez et terminez vos impressions avec le suivi automatique de la matière consommée.</p>
        </div>
        <div className="page-actions">
          <span className="pill accent">{jobs.filter((job) => job.status === "printing").length} en cours</span>
          <span className="pill">{jobs.length} job{jobs.length > 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <section className="card elevated">
          <div className="eyebrow">Nouveau job</div>
          <h2 style={{ marginTop: 0 }}>Nouvelle impression</h2>
          <form action={createPrintJob} className="form">
            <div className="field">
              <label>Nom *</label>
              <input className="input" name="name" placeholder="Support casque" required />
            </div>

            <div className="form-row">
              <div className="field">
                <label>Imprimante</label>
                <select className="select" name="printerId" defaultValue="">
                  <option value="">Non définie</option>
                  {machines.map((printer) => (
                    <option key={printer.id} value={printer.id}>{printer.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Bobine</label>
                <select className="select" name="spoolId" defaultValue="">
                  <option value="">Aucune</option>
                  {availableSpools.map((spool) => (
                    <option key={spool.id} value={spool.id}>
                      {spool.manufacturer} {spool.productName} · {spool.material} · {grams(spool.remainingWeightG)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label>Consommation prévue (g)</label>
              <input className="input" name="plannedWeightG" type="number" min="0" placeholder="82" />
            </div>

            <div className="field">
              <label>Notes</label>
              <textarea className="textarea" name="notes" placeholder="Profil, fichier, réglages…" />
            </div>

            <button className="button primary" type="submit">Créer l'impression</button>
          </form>
        </section>

        <section>
          <div className="section-head" style={{ marginTop: 0 }}>
            <div>
              <h2>Activité</h2>
              <p>Vos dernières impressions et leur consommation réelle.</p>
            </div>
          </div>
          {jobs.length === 0 ? (
            <div className="empty">
              <strong>Aucune impression.</strong>
              Ajoutez votre premier job pour suivre la consommation réelle.
            </div>
          ) : (
            <div className="grid">
              {jobs.map((job) => (
                <article className="card" key={job.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div>
                      <strong>{job.name}</strong>
                      <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 4 }}>
                        {job.printerName || "Imprimante non définie"}
                        {job.spoolManufacturer ? ` · ${job.spoolManufacturer} ${job.spoolProductName}` : ""}
                      </div>
                    </div>
                    <span className={job.status === "printing" ? "pill accent" : "pill"}>{statusLabel(job.status)}</span>
                  </div>

                  <div className="kv" style={{ marginTop: 14 }}>
                    <div className="kv-item">
                      <span>Prévu</span>
                      <strong>{job.plannedWeightG == null ? "—" : grams(job.plannedWeightG)}</strong>
                    </div>
                    <div className="kv-item">
                      <span>Réel</span>
                      <strong>{job.actualWeightG == null ? "—" : grams(job.actualWeightG)}</strong>
                    </div>
                  </div>

                  {job.status === "planned" && (
                    <form action={startPrintJob} style={{ marginTop: 14 }}>
                      <input type="hidden" name="id" value={job.id} />
                      <button className="button small primary" type="submit">Démarrer</button>
                    </form>
                  )}

                  {job.status === "printing" && (
                    <form action={completePrintJob} className="form" style={{ marginTop: 14 }}>
                      <input type="hidden" name="id" value={job.id} />
                      <div className="field">
                        <label>Consommation réelle (g)</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <input
                            className="input"
                            name="actualWeightG"
                            type="number"
                            min="0"
                            defaultValue={job.plannedWeightG ?? 0}
                            required
                          />
                          <button className="button primary" type="submit">Terminer</button>
                        </div>
                      </div>
                    </form>
                  )}

                  {job.status === "completed" && (
                    <div style={{ color: "var(--muted)", fontSize: 12, marginTop: 12 }}>
                      Terminée {dateTime(job.finishedAt)}
                      {job.durationSeconds != null ? ` · ${Math.round(job.durationSeconds / 60)} min` : ""}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
