import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelViewer } from "@/components/model-viewer";
import { pool } from "@/lib/db";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type ModelRow = {
  id: string;
  owner_user_id: string;
  slug: string;
  title: string;
  description: string | null;
  license: string;
  visibility: string;
  file_name: string;
  file_size_bytes: number;
  profile_metadata: Record<string, unknown>;
  download_count: number;
  created_at: string;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  maker_public: boolean | null;
};

function duration(seconds: number | null | undefined) {
  if (!seconds) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours ? `${hours} h ${minutes.toString().padStart(2, "0")}` : `${minutes} min`;
}

export default async function PublicModelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await pool.query<ModelRow>(
    `SELECT
       m.id, m.owner_user_id, m.slug, m.title, m.description, m.license,
       m.visibility, m.file_name, m.file_size_bytes, m.profile_metadata,
       m.download_count, m.created_at,
       p.handle, p.display_name, p.avatar_url, p.is_public AS maker_public
     FROM published_models m
     LEFT JOIN maker_profiles p ON p.user_id = m.owner_user_id
     WHERE m.slug = $1
     LIMIT 1`,
    [slug]
  );

  const model = result.rows[0];
  if (!model) notFound();

  const session = await getSession();
  const owner = session?.user?.id === model.owner_user_id;
  const publiclyVisible =
    model.visibility === "unlisted" ||
    (model.visibility === "public" && model.maker_public === true);

  if (!owner && !publiclyVisible) notFound();

  const meta = model.profile_metadata as {
    slicer?: string | null;
    printerModel?: string | null;
    nozzleDiameter?: string | null;
    layerHeight?: string | null;
    filamentTypes?: string[];
    filamentColors?: string[];
    estimatedTimeSeconds?: number | null;
    estimatedFilamentGrams?: number | null;
    plateCount?: number;
    standardMetadata?: Record<string, string>;
  };

  return (
    <main className="public-page model-public-page">
      <header className="public-header">
        <Link href="/discover" className="public-brand">
          <img src="/brand/filario-logo-light.png" alt="Filario" />
        </Link>
        <nav>
          <Link href="/discover">Discover</Link>
          {owner ? <Link href="/library">Gérer le modèle</Link> : <Link href="/login">Se connecter</Link>}
        </nav>
      </header>

      <div className="model-detail-grid">
        <section>
          <ModelViewer src={`/api/models/${model.slug}/file`} title={model.title} />
        </section>

        <aside className="model-detail-info">
          <span className="eyebrow">{model.visibility === "public" ? "Modèle public" : model.visibility}</span>
          <h1>{model.title}</h1>

          {model.display_name && model.handle && (
            <Link href={`/makers/${model.handle}`} className="maker-inline maker-author">
              {model.avatar_url
                ? <img src={model.avatar_url} alt="" />
                : <span>{model.display_name.slice(0, 1).toUpperCase()}</span>}
              <div><small>Créé par</small><strong>{model.display_name}</strong></div>
            </Link>
          )}

          {model.description && <p className="model-description">{model.description}</p>}

          <div className="model-actions">
            <a className="button primary" href={`/api/models/${model.slug}/file?download=1`}>
              Télécharger le 3MF
            </a>
            <Link className="button" href="/login">Préparer dans Filario</Link>
          </div>

          <div className="model-profile-card">
            <div className="section-heading compact"><div><span className="eyebrow">Profil détecté</span><h2>Impression</h2></div></div>
            <div className="model-spec-grid">
              <div><span>Imprimante</span><strong>{meta.printerModel || "Non détectée"}</strong></div>
              <div><span>Slicer</span><strong>{meta.slicer || "3MF standard"}</strong></div>
              <div><span>Couche</span><strong>{meta.layerHeight ? `${meta.layerHeight} mm` : "—"}</strong></div>
              <div><span>Buse</span><strong>{meta.nozzleDiameter ? `${meta.nozzleDiameter} mm` : "—"}</strong></div>
              <div><span>Temps estimé</span><strong>{duration(meta.estimatedTimeSeconds)}</strong></div>
              <div><span>Filament estimé</span><strong>{meta.estimatedFilamentGrams ? `${Math.round(meta.estimatedFilamentGrams)} g` : "—"}</strong></div>
              <div><span>Plateaux</span><strong>{meta.plateCount || 1}</strong></div>
              <div><span>Licence</span><strong>{model.license}</strong></div>
            </div>

            {meta.filamentTypes && meta.filamentTypes.length > 0 && (
              <div className="detected-filaments">
                <span>Filaments</span>
                <div>{meta.filamentTypes.map((type, index) => (
                  <span className="pill" key={`${type}-${index}`}>{type}</span>
                ))}</div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
