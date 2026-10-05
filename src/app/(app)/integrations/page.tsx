import Link from "next/link";
import { BambuCloudPanel } from "@/components/bambu-cloud-panel";
import { pool } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { ensureWorkspace } from "@/lib/workspace";

export const metadata = { title: "Intégrations" };
export const dynamic = "force-dynamic";

type AccountRow = {
  id: string;
  email: string;
  region: "global" | "china";
  status: string;
  updated_at: string;
  last_error: string | null;
  device_count: number;
};

export default async function IntegrationsPage() {
  const session = await requireSession();
  const workspace = await ensureWorkspace(session.user);

  const result = await pool.query<AccountRow>(
    `SELECT
       a.id, a.email, a.region, a.status, a.updated_at, a.last_error,
       count(d.id)::int AS device_count
     FROM bambu_accounts a
     LEFT JOIN bambu_devices d ON d.account_id = a.id
     WHERE a.organization_id = $1 AND a.user_id = $2
     GROUP BY a.id
     ORDER BY a.updated_at DESC`,
    [workspace.organizationId, session.user.id]
  );

  const accounts = result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    region: row.region,
    status: row.status,
    updatedAt: row.updated_at,
    lastError: row.last_error,
    deviceCount: row.device_count
  }));

  return (
    <>
      <div className="page-head pro-page-head">
        <div>
          <span className="kicker">Connexions</span>
          <h1>Intégrations</h1>
          <p>Reliez Filario à vos machines et services sans mélanger les données de votre atelier.</p>
        </div>
      </div>

      <BambuCloudPanel accounts={accounts} />

      <div className="section-head">
        <div>
          <h2>Connecteurs disponibles</h2>
          <p>Les connecteurs locaux restent indépendants du compte Bambu Cloud.</p>
        </div>
      </div>

      <div className="integration-grid">
        <article className="integration-card">
          <div className="integration-logo">OF</div>
          <div>
            <strong>Open Filament Database</strong>
            <span>Catalogue filament · actif</span>
          </div>
          <span className="status-chip status-online">Actif</span>
        </article>

        <article className="integration-card muted-card">
          <div className="integration-logo">O</div>
          <div>
            <strong>OctoPrint</strong>
            <span>API REST · prochain connecteur</span>
          </div>
          <span className="status-chip">À venir</span>
        </article>

        <article className="integration-card muted-card">
          <div className="integration-logo">M</div>
          <div>
            <strong>Moonraker / Klipper</strong>
            <span>API temps réel · prochain connecteur</span>
          </div>
          <span className="status-chip">À venir</span>
        </article>

        <article className="integration-card muted-card">
          <div className="integration-logo">P</div>
          <div>
            <strong>PrusaLink</strong>
            <span>Connexion locale · prochain connecteur</span>
          </div>
          <span className="status-chip">À venir</span>
        </article>
      </div>

      <section className="surface-panel camera-panel">
        <div className="panel-head">
          <div>
            <span className="kicker">Caméras Bambu</span>
            <h2>Live View</h2>
            <p>
              Bambu Handy et Bambu Studio utilisent un flux P2P propriétaire. Filario prépare le support, mais ne réutilise pas une bibliothèque propriétaire non distribuable.
            </p>
          </div>
          <span className="status-chip status-beta">Beta</span>
        </div>
        <div className="camera-placeholder">
          <div className="camera-screen">
            <span>CAM</span>
          </div>
          <div>
            <strong>Caméra cloud non activée dans Filario Beta</strong>
            <p>
              Les imprimantes restent utilisables avec Bambu Handy en parallèle. Une future passerelle vidéo pourra ajouter le direct sans exposer vos identifiants dans le navigateur.
            </p>
          </div>
        </div>
      </section>

      <div className="inline-help">
        <strong>Besoin d’une machine manuelle ?</strong>
        <span>Vous pouvez toujours ajouter une imprimante sans intégration cloud.</span>
        <Link className="button small" href="/printers">Ouvrir les imprimantes</Link>
      </div>
    </>
  );
}
