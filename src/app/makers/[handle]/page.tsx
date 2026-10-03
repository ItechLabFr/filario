import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/lib/db";

export const dynamic = "force-dynamic";

type MakerRow = {
  user_id: string;
  handle: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  website_url: string | null;
};

type ModelRow = {
  slug: string;
  title: string;
  description: string | null;
  profile_metadata: Record<string, unknown>;
  download_count: number;
};

export default async function MakerPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;

  const makerResult = await pool.query<MakerRow>(
    `SELECT user_id, handle, display_name, bio, avatar_url, website_url
     FROM maker_profiles
     WHERE handle = $1 AND is_public = true
     LIMIT 1`,
    [handle.toLowerCase()]
  );

  const maker = makerResult.rows[0];
  if (!maker) notFound();

  const models = await pool.query<ModelRow>(
    `SELECT slug, title, description, profile_metadata, download_count
     FROM published_models
     WHERE owner_user_id = $1 AND visibility = 'public'
     ORDER BY created_at DESC`,
    [maker.user_id]
  );

  return (
    <main className="public-page">
      <header className="public-header">
        <Link href="/discover" className="public-brand">
          <img src="/brand/filario-logo-light.png" alt="Filario" />
        </Link>
        <nav><Link href="/discover">Discover</Link><Link href="/login">Se connecter</Link></nav>
      </header>

      <section className="maker-hero">
        <div className="maker-avatar large">
          {maker.avatar_url ? <img src={maker.avatar_url} alt="" /> : maker.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <span className="eyebrow">@{maker.handle}</span>
          <h1>{maker.display_name}</h1>
          {maker.bio && <p>{maker.bio}</p>}
          <div className="maker-stats">
            <span><strong>{models.rows.length}</strong> modèle(s)</span>
            <span><strong>{models.rows.reduce((sum, model) => sum + model.download_count, 0)}</strong> téléchargement(s)</span>
          </div>
          {maker.website_url && (
            <a className="button small" href={maker.website_url} rel="noreferrer" target="_blank">Site du maker</a>
          )}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div><span className="eyebrow">Créations</span><h2>Modèles publiés</h2></div>
        </div>

        {models.rows.length === 0 ? (
          <div className="empty"><strong>Aucun modèle public.</strong>Ce maker n’a encore rien publié.</div>
        ) : (
          <div className="model-grid discover-grid">
            {models.rows.map((model) => {
              const metadata = model.profile_metadata as {
                printerModel?: string | null;
                filamentTypes?: string[];
                layerHeight?: string | null;
              };
              return (
                <article className="model-card" key={model.slug}>
                  <Link href={`/models/${model.slug}`} className="model-card-visual">
                    <span className="model-cube">3D</span>
                    {metadata.filamentTypes?.[0] && <span className="model-card-status">{metadata.filamentTypes[0]}</span>}
                  </Link>
                  <div className="model-card-body">
                    <Link href={`/models/${model.slug}`}><h3>{model.title}</h3></Link>
                    <div className="model-meta-row">
                      {metadata.printerModel && <span>{metadata.printerModel}</span>}
                      {metadata.layerHeight && <span>{metadata.layerHeight} mm</span>}
                      <span>{model.download_count} téléchargement(s)</span>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
