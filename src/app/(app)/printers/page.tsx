import Link from "next/link";
import { createPrinter } from "@/app/actions";
import { BambuPrinterCard } from "@/components/bambu-printer-card";
import { ProductVisual } from "@/components/product-visual";
import { PrinterDeleteButton } from "@/components/printer-delete-button";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata = { title: "Imprimantes" };
export const dynamic = "force-dynamic";

type PrinterRow = {
  id: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
  integration_type: string | null;
  status: string;
  telemetry: Record<string, unknown> | null;
  telemetry_updated_at: string | null;
  bambu_online: boolean | null;
  camera_host: string | null;
  camera_enabled: boolean | null;
  camera_last_error: string | null;
};

function statusText(status: string) {
  if (status === "printing") return "Impression en cours";
  if (status === "paused") return "En pause";
  if (status === "idle") return "Disponible";
  if (status === "offline") return "Hors ligne";
  if (status === "error") return "Attention";
  return status;
}

export default async function PrintersPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const result = await pool.query<PrinterRow>(
    `SELECT
       p.id,
       p.name,
       p.manufacturer,
       p.model,
       p.integration_type,
       p.status,
       d.telemetry,
       d.telemetry_updated_at,
       d.online AS bambu_online,
       d.camera_host,
       d.camera_enabled,
       d.camera_last_error
     FROM printers p
     LEFT JOIN LATERAL (
       SELECT telemetry, telemetry_updated_at, online, camera_host, camera_enabled, camera_last_error
       FROM bambu_devices
       WHERE printer_id = p.id
       ORDER BY updated_at DESC
       LIMIT 1
     ) d ON true
     WHERE p.organization_id = $1
     ORDER BY p.name`,
    [workspace.organizationId]
  );

  const rows = result.rows;
  const cloudCount = rows.filter((row) => row.integration_type === "bambu-cloud").length;
  const onlineCount = rows.filter((row) =>
    row.integration_type === "bambu-cloud"
      ? Boolean(row.bambu_online)
      : row.status !== "offline"
  ).length;

  return (
    <>
      <div className="page-head pro-page-head">
        <div>
          <span className="kicker">Machines</span>
          <h1>Imprimantes</h1>
          <p>Températures, impression, AMS et disponibilité remontent automatiquement pour les machines Bambu Cloud.</p>
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
          <span>En ligne</span>
          <strong>{onlineCount}</strong>
        </div>
        <div className="metric-tile">
          <span>Bambu Cloud</span>
          <strong>{cloudCount}</strong>
        </div>
      </div>

      <section className="surface-panel bambu-live-info">
        <div>
          <span className="source-dot" />
          <strong>Télémétrie Bambu Cloud</strong>
        </div>
        <p>
          Le service Filario reste connecté au flux Bambu en arrière-plan. Les cartes se mettent à jour automatiquement.
        </p>
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
        <div className="machine-grid live-machine-grid">
          {rows.map((printer) => (
            printer.integration_type === "bambu-cloud" ? (
              <BambuPrinterCard
                key={printer.id}
                printer={{
                  id: printer.id,
                  name: printer.name,
                  manufacturer: printer.manufacturer,
                  model: printer.model,
                  status: printer.status
                }}
                initialTelemetry={printer.telemetry || {}}
                initialTelemetryUpdatedAt={printer.telemetry_updated_at ? new Date(printer.telemetry_updated_at).toISOString() : null}
                initialOnline={Boolean(printer.bambu_online)}
                camera={{
                  enabled: Boolean(printer.camera_enabled),
                  host: printer.camera_host,
                  lastError: printer.camera_last_error
                }}
              />
            ) : (
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
                      Manuelle
                    </div>
                    <PrinterDeleteButton
                      printerId={printer.id}
                      printerName={printer.name}
                    />
                  </div>
                </div>
              </article>
            )
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
