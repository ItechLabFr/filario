import Link from "next/link";
import { pool } from "@/lib/db";

export const metadata = {
  title: "Discover · Filario",
  description: "Découvrez les modèles 3D publiés par la communauté Filario."
};
export const dynamic = "force-dynamic";

type ModelRow = {
  slug: string;
  title: string;
  description: string | null;
  license: string;
  profile_metadata: Record<string, unknown>;
  download_count: number;
  handle: string;
  display_name: string;
  avatar_url: string | null;
};

export default async function DiscoverPage() {
  const result = await pool.query<ModelRow>(
    `SELECT
       m.slug, m.title, m.description, m.license, m.profile_metadata, m.download_count,
       p.handle, p.display_name, p.avatar_url
     FROM published_models m
     JOIN maker_profiles p ON p.user_id = m.owner_user_id
     WHERE m.visibility = 'public' AND p.is_public = true
     ORDER BY m.created_at DESC
     LIMIT 60`
  );

  return (
    <main className="public-page">
      <header className="public-header">
        <Link href="/discover" className="public-brand">
          <img src="/brand/filario-logo-light.png" alt="Filario" />
        </Link>
        <nav>
          <Link href="/login">Se connecter</Link>
          <Link className="button primary small" href="/register">Créer un compte</Link>
        </nav>
      </header>

      <section className="discover-hero">
        <span className="eyebrow">Filario Discover</span>
        <h1>Des modèles pensés pour être imprimés.</h1>
        <p>Explorez des projets 3MF avec profils, compatibilité machine et informations filament déjà structurées.</p>
      </section>

      {result.rows.length === 0 ? (
        <div className="empty model-empty">
          <strong>Discover démarre ici.</strong>
          Les premiers modèles publics apparaîtront sur cette page.
        </div>
      ) : (
        <section className="model-grid discover-grid">
          {result.rows.map((model) => {
            const metadata = model.profile_metadata as {
              printerModel?: string | null;
              filamentTypes?: string[];
              layerHeight?: string | null;
              plateCount?: number;
            };
            return (
              <article className="model-card discover-card" key={model.slug}>
                <Link href={`/models/${model.slug}`} className="model-card-visual">
                  <span className="model-cube">3D</span>
                  {metadata.filamentTypes?.[0] && <span className="model-card-status">{metadata.filamentTypes[0]}</span>}
                </Link>
                <div className="model-card-body">
                  <Link href={`/models/${model.slug}`}><h3>{model.title}</h3></Link>
                  <Link href={`/makers/${model.handle}`} className="maker-inline">
                    {model.avatar_url ? <img src={model.avatar_url} alt="" /> : <span>{model.display_name.slice(0, 1).toUpperCase()}</span>}
                    <strong>{model.display_name}</strong>
                  </Link>
                  <div className="model-meta-row">
                    {metadata.printerModel && <span>{metadata.printerModel}</span>}
                    {metadata.layerHeight && <span>{metadata.layerHeight} mm</span>}
                    <span>{metadata.plateCount || 1} plateau(x)</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
